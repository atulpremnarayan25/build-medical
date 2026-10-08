import { and, asc, eq, gt, gte, inArray, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
	batchesTable,
	batchStockEventsTable,
	customersTable,
	invoiceSequencesTable,
	productUnitsTable,
	productsTable,
	saleItemsTable,
	salesTable,
	storesTable,
	type Product,
	type ProductUnit,
	type Store
} from '../db/schema.js';
import { logSyncOutbox } from '../db/sync/outbox.js';
import { allocateFefo, OutOfStockError, type FefoAllocation, type FefoBatch } from './fefo.js';
import { computeLineGst, type GstBreakdown } from './gst.js';
import { fromPaise, roundToRupee, toPaise } from './money.js';

/**
 * Billing engine (Phase 2): server-authoritative FEFO allocation, GST math,
 * invoice numbering and transactional stock deduction.
 *
 * Per AGENTS.md the frontend is never authoritative for FEFO/GST/totals —
 * a finalized invoice from finalizeSale() is the source of truth.
 * All money math happens in integer paise (see ./money.ts).
 */

export type SaleType = 'retail' | 'wholesale';

export interface EngineLineInput {
	productId: string;
	/** product_units row id; omitted => the product's base unit. */
	unitId?: string;
	/** Quantity expressed in the sold unit (strip, box, tablet...). */
	quantity: number;
	/** Legacy UI compat: pin allocation to a client-picked batch (still stock/expiry validated). */
	pinnedBatchId?: string;
	/** Explicit per-sold-unit price in rupees (snapshot); defaults to list price by saleType. */
	rateRupees?: number;
	/** Per-line discount in rupees, subtracted before GST. */
	discountRupees?: number;
}

export interface SaleInput {
	saleType: SaleType;
	customerId?: string | null;
	patientName?: string | null;
	prescriberName?: string | null;
	prescriberRegNo?: string | null;
	interState?: boolean;
	items: EngineLineInput[];
	amountPaidAtSaleRupees?: number | string;
	notes?: string;
}

export class BillingError extends Error {
	code: string;
	status: number;
	constructor(code: string, message: string, status = 400) {
		super(message);
		this.name = 'BillingError';
		this.code = code;
		this.status = status;
	}
}

const NODE_ID = 'store_server'; // Phase 5 generalizes numbering across nodes

interface UnitEntry {
	unit: ProductUnit;
	conversion: number; // base units per sold unit
}

interface LoadedContext {
	store: Store;
	productById: Map<string, Product>;
	unitsById: Map<string, UnitEntry>;
	baseUnitByProduct: Map<string, UnitEntry>;
	batchesByProduct: Map<string, FefoBatch[]>;
}

/** Works for both the plain db client and an open transaction. */
type Executor = Pick<typeof db, 'select' | 'insert' | 'update'>;

async function loadContext(
	tx: Executor,
	input: SaleInput,
	lockBatches: boolean
): Promise<LoadedContext> {
	if (!input.items.length) throw new BillingError('EMPTY_SALE', 'Sale has no items');

	const [store] = await tx.select().from(storesTable).limit(1);
	if (!store) throw new BillingError('NO_STORE', 'No store configured', 500);

	const productIds = [...new Set(input.items.map((i) => i.productId))];
	const products = await tx
		.select()
		.from(productsTable)
		.where(inArray(productsTable.id, productIds));
	const productById = new Map(products.map((p) => [p.id, p]));
	for (const pid of productIds) {
		if (!productById.has(pid)) throw new BillingError('NOT_FOUND', `Product ${pid} not found`, 404);
	}

	const unitRows = await tx
		.select()
		.from(productUnitsTable)
		.where(inArray(productUnitsTable.productId, productIds));
	const unitsById = new Map<string, UnitEntry>();
	const baseUnitByProduct = new Map<string, UnitEntry>();
	for (const u of unitRows) {
		const entry = { unit: u, conversion: Number(u.conversionToBase) };
		unitsById.set(u.id, entry);
		if (u.isBaseUnit) baseUnitByProduct.set(u.productId, entry);
	}

	for (const p of products) {
		if (!baseUnitByProduct.has(p.id)) {
			const [inserted] = await tx
				.insert(productUnitsTable)
				.values({
					productId: p.id,
					unitName: p.baseUnit || 'Unit',
					conversionToBase: '1',
					retailPrice: p.sellingRate || p.mrp || '0',
					wholesalePrice: p.sellingRate || p.mrp || '0',
					isBaseUnit: true
				})
				.returning();
			const entry = { unit: inserted, conversion: 1 };
			baseUnitByProduct.set(p.id, entry);
			unitsById.set(inserted.id, entry);
		}
	}

	const baseQuery = tx
		.select()
		.from(batchesTable)
		.where(
			and(inArray(batchesTable.productId, productIds), gt(batchesTable.quantityRemaining, '0'))
		)
		.orderBy(asc(batchesTable.expiryDate), asc(batchesTable.id));
	const batchRows = await (lockBatches ? baseQuery.for('update') : baseQuery);

	const batchesByProduct = new Map<string, FefoBatch[]>();
	for (const b of batchRows) {
		const list = batchesByProduct.get(b.productId) ?? [];
		list.push({
			id: b.id,
			batchNo: b.batchNo,
			expiryDate: b.expiryDate,
			quantityRemaining: Math.floor(Number(b.quantityRemaining))
		});
		batchesByProduct.set(b.productId, list);
	}

	return { store, productById, unitsById, baseUnitByProduct, batchesByProduct };
}

function pickUnit(ctx: LoadedContext, productId: string, unitId?: string): UnitEntry {
	if (unitId) {
		const found = ctx.unitsById.get(unitId);
		if (!found || found.unit.productId !== productId) {
			throw new BillingError(
				'INVALID_UNIT',
				`Unit ${unitId} does not belong to product ${productId}`
			);
		}
		return found;
	}
	const base = ctx.baseUnitByProduct.get(productId);
	if (!base) throw new BillingError('INVALID_UNIT', `Product ${productId} has no base unit`);
	return base;
}

function listPricePaise(unit: ProductUnit, saleType: SaleType): number {
	return toPaise(saleType === 'wholesale' ? unit.wholesalePrice : unit.retailPrice);
}

function mapAllocationError(
	e: unknown,
	candidates: FefoBatch[],
	today: string,
	allowExpiredOverride: boolean
): never {
	if (e instanceof OutOfStockError) {
		const expiredAvailable = candidates.some(
			(c) => c.expiryDate <= today && c.quantityRemaining > 0
		);
		if (expiredAvailable && !allowExpiredOverride) {
			throw new BillingError(
				'EXPIRED_BATCH_OVERRIDE_REQUIRED',
				'Only expired stock remains; owner/admin override required',
				403
			);
		}
		throw new BillingError('OUT_OF_STOCK', e.message, 409);
	}
	throw e as Error;
}

export interface PreparedLine {
	input: EngineLineInput;
	productId: string;
	productName: string;
	gstRate: string;
	unitId: string;
	unitName: string;
	conversion: number; // base units per sold unit
	ratePaise: number; // per sold unit
	discountPaise: number;
	taxablePaise: number; // rate * qty - discount
	gst: GstBreakdown;
	allocations: FefoAllocation[];
	usedExpiredBatch: boolean;
}

/** FEFO-validate every line and snapshot pricing. Throws BillingError on problems. */
function prepareLines(
	ctx: LoadedContext,
	input: SaleInput,
	today: string,
	allowExpiredOverride: boolean
): PreparedLine[] {
	const lines: PreparedLine[] = [];
	for (const line of input.items) {
		const product = ctx.productById.get(line.productId)!;

		if (
			(product.drugSchedule === 'H1' || product.drugSchedule === 'X') &&
			(!input.patientName?.trim() || !input.prescriberName?.trim() || !input.prescriberRegNo?.trim())
		) {
			throw new BillingError(
				'SCHEDULE_H1_COMPLIANCE_REQUIRED',
				`Rule 65 compliance required: Prescribing Doctor Name, Medical Registration Number, and Patient Name must be provided for Schedule ${product.drugSchedule} medicine (${product.name}).`,
				422
			);
		}

		const { unit, conversion } = pickUnit(ctx, line.productId, line.unitId);
		const baseNeeded = Math.round(line.quantity * conversion);
		if (!Number.isFinite(line.quantity) || line.quantity <= 0 || baseNeeded <= 0) {
			throw new BillingError('INVALID_QUANTITY', 'Quantity must be a positive number');
		}

		const candidates = ctx.batchesByProduct.get(line.productId) ?? [];
		let fefo;
		try {
			fefo = allocateFefo(baseNeeded, candidates, {
				today,
				includeExpired: allowExpiredOverride,
				pinnedBatchId: line.pinnedBatchId
			});
		} catch (e) {
			mapAllocationError(e, candidates, today, allowExpiredOverride);
		}

		const ratePaise =
			line.rateRupees !== undefined
				? toPaise(line.rateRupees)
				: listPricePaise(unit, input.saleType);
		const discountPaise =
			line.discountRupees !== undefined && line.discountRupees > 0
				? toPaise(line.discountRupees)
				: 0;
		const taxablePaise = Math.max(ratePaise * line.quantity - discountPaise, 0);
		const gst = computeLineGst(taxablePaise, product.gstRate, input.interState === true);

		lines.push({
			input: line,
			productId: line.productId,
			productName: product.name,
			gstRate: product.gstRate,
			unitId: unit.id,
			unitName: unit.unitName,
			conversion,
			ratePaise,
			discountPaise,
			taxablePaise,
			gst,
			allocations: fefo.allocations,
			usedExpiredBatch: fefo.usedExpiredBatch
		});
	}
	return lines;
}

function aggregateTotals(lines: PreparedLine[]) {
	const subtotal = lines.reduce((s, l) => s + l.ratePaise * l.input.quantity, 0);
	const discount = lines.reduce((s, l) => s + l.discountPaise, 0);
	const taxableTotal = lines.reduce((s, l) => s + l.gst.taxablePaise, 0);
	const gstTotal = lines.reduce((s, l) => s + l.gst.totalGstPaise, 0);
	const exact = taxableTotal + gstTotal;
	const grand = roundToRupee(exact);
	return { subtotal, discount, taxableTotal, gstTotal, exact, grand };
}

// ---------- Quote ----------

export interface QuoteLinePayload {
	productId: string;
	productName: string;
	unitId: string;
	unitName: string;
	quantitySoldUnits: number;
	rateRupees: number;
	discountRupees: number;
	allocations: FefoAllocation[];
	gst: GstBreakdown;
	lineTotalRupees: number;
}

export interface QuoteResult {
	lines: QuoteLinePayload[];
	subtotalRupees: number;
	discountRupees: number;
	taxableTotalRupees: number;
	gstTotalRupees: number;
	roundOffRupees: number;
	grandTotalRupees: number;
	usedExpiredBatchOverride: boolean;
}

/**
 * POST /api/sales/quote backend — computes FEFO allocation, pricing and GST
 * without persisting anything, so the UI can show a live bill.
 */
export async function quoteSale(
	input: SaleInput,
	today: string,
	allowExpiredOverride = false
): Promise<QuoteResult> {
	const ctx = await loadContext(db, input, false);
	const lines = prepareLines(ctx, input, today, allowExpiredOverride);
	const totals = aggregateTotals(lines);
	return {
		lines: lines.map((l) => ({
			productId: l.productId,
			productName: l.productName,
			unitId: l.unitId,
			unitName: l.unitName,
			quantitySoldUnits: l.input.quantity,
			rateRupees: Number(fromPaise(l.ratePaise)),
			discountRupees: Number(fromPaise(l.discountPaise)),
			allocations: l.allocations,
			gst: l.gst,
			lineTotalRupees: Number(fromPaise(l.taxablePaise + l.gst.totalGstPaise))
		})),
		subtotalRupees: Number(fromPaise(totals.subtotal)),
		discountRupees: Number(fromPaise(totals.discount)),
		taxableTotalRupees: Number(fromPaise(totals.taxableTotal)),
		gstTotalRupees: Number(fromPaise(totals.gstTotal)),
		roundOffRupees: Number(fromPaise(totals.grand - totals.exact)),
		grandTotalRupees: Number(fromPaise(totals.grand)),
		usedExpiredBatchOverride: lines.some((l) => l.usedExpiredBatch)
	};
}

// ---------- Finalize ----------

async function nextInvoiceNumber(tx: Executor, storeId: string): Promise<string> {
	const existing = await tx
		.select()
		.from(invoiceSequencesTable)
		.where(
			and(eq(invoiceSequencesTable.storeId, storeId), eq(invoiceSequencesTable.nodeId, NODE_ID))
		)
		.for('update');

	let value: number;
	if (existing.length === 0) {
		const [created] = await tx
			.insert(invoiceSequencesTable)
			.values({ storeId, nodeId: NODE_ID, rangeStart: 1, rangeEnd: 1_000_000, nextValue: 2 })
			.returning();
		value = created.rangeStart; // first issued number is range start
	} else {
		const seq = existing[0];
		if (seq.nextValue > seq.rangeEnd) {
			throw new BillingError(
				'INVOICE_NUMBER_EXHAUSTED',
				'Invoice number block exhausted; reconnect to the store server to continue billing',
				409
			);
		}
		await tx
			.update(invoiceSequencesTable)
			.set({ nextValue: seq.nextValue + 1 })
			.where(eq(invoiceSequencesTable.id, seq.id));
		value = seq.nextValue;
	}
	return `INV-${String(value).padStart(6, '0')}`;
}

export interface InvoiceItemPayload {
	productId: string;
	productName: string;
	batchId: string;
	batchNo: string;
	expiryDate: string;
	unitId: string;
	unitName: string;
	quantityBaseUnits: number;
	quantitySoldUnits: number;
	ratePerSoldUnitRupees: number;
	gstRate: number;
	taxableRupees: number;
	gst: GstBreakdown;
	lineTotalRupees: number;
}

export interface InvoicePayload {
	id: string;
	invoiceNumber: string;
	date: string;
	store: Pick<Store, 'id' | 'name' | 'gstin' | 'address'>;
	customer: { id: string; name: string; gstin: string | null } | null;
	patientName?: string | null;
	prescriberName?: string | null;
	prescriberRegNo?: string | null;
	saleType: SaleType;
	interState: boolean;
	items: InvoiceItemPayload[];
	subtotalRupees: number;
	discountRupees: number;
	taxableTotalRupees: number;
	gstTotalRupees: number;
	roundOffRupees: number;
	grandTotalRupees: number;
	amountPaidAtSaleRupees: number;
	dueAmountRupees: number;
	paymentStatus: 'paid' | 'partial' | 'credit';
	notes: string | null;
	usedExpiredBatchOverride: boolean;
}

export interface FinalizeOptions {
	today: string;
	userId?: string;
	allowExpiredOverride?: boolean;
}

/**
 * POST /api/sales backend — single transaction:
 * lock candidate batches (FEFO-safe against concurrent bills), allocate stock,
 * issue an invoice number from invoice_sequences, persist sale + items,
 * decrement batch stock and append batch_stock_events.
 */
export async function finalizeSale(
	input: SaleInput,
	opts: FinalizeOptions
): Promise<InvoicePayload> {
	return db.transaction(async (tx) => {
		const ctx = await loadContext(tx, input, true);
		const lines = prepareLines(ctx, input, opts.today, opts.allowExpiredOverride === true);

		if (lines.some((l) => l.usedExpiredBatch) && opts.allowExpiredOverride !== true) {
			throw new BillingError(
				'EXPIRED_BATCH_OVERRIDE_REQUIRED',
				'Selling expired stock requires owner/admin override',
				403
			);
		}

		const totals = aggregateTotals(lines);
		const invoiceNumber = await nextInvoiceNumber(tx, ctx.store.id);

		const paidPaise =
			input.amountPaidAtSaleRupees !== undefined
				? Math.min(Math.max(toPaise(input.amountPaidAtSaleRupees), 0), totals.grand)
				: totals.grand;
		const paymentStatus = paidPaise >= totals.grand ? 'paid' : paidPaise > 0 ? 'partial' : 'credit';

		let customerPayload: InvoicePayload['customer'] = null;
		if (input.customerId) {
			const [customer] = await tx
				.select()
				.from(customersTable)
				.where(eq(customersTable.id, input.customerId))
				.limit(1);
			if (!customer)
				throw new BillingError('NOT_FOUND', `Customer ${input.customerId} not found`, 404);
			customerPayload = { id: customer.id, name: customer.name, gstin: customer.gstin };
		}

		const [sale] = await tx
			.insert(salesTable)
			.values({
				storeId: ctx.store.id,
				invoiceNumber,
				customerId: input.customerId ?? null,
				patientName: input.patientName ?? null,
				prescriberName: input.prescriberName ?? null,
				prescriberRegNo: input.prescriberRegNo ?? null,
				notes: input.notes ?? null,
				saleType: input.saleType,
				subtotal: fromPaise(totals.subtotal),
				gstAmount: fromPaise(totals.gstTotal),
				totalAmount: fromPaise(totals.grand),
				amountPaidAtSale: fromPaise(paidPaise),
				paymentStatus,
				createdBy: opts.userId ?? null
			})
			.returning();

		await logSyncOutbox(tx, 'sales', sale.id, 'insert', sale);

		const itemPayloads: InvoiceItemPayload[] = [];
		for (const line of lines) {
			// One sale_item row per allocated batch (spec §10: FEFO splits expand lines).
			// The line's taxable amount is apportioned across rows by base-unit share so
			// rows always sum back to the exact line totals.
			const totalAllocated = line.allocations.reduce((s, a) => s + a.quantityBaseUnits, 0);
			let taxableLeft = line.gst.taxablePaise;
			let gstLeft = line.gst.totalGstPaise;

			for (let i = 0; i < line.allocations.length; i++) {
				const alloc = line.allocations[i];
				const last = i === line.allocations.length - 1;
				const share = last
					? taxableLeft
					: Math.floor((line.gst.taxablePaise * alloc.quantityBaseUnits) / totalAllocated);
				const gstShare = last
					? gstLeft
					: Math.floor((line.gst.totalGstPaise * alloc.quantityBaseUnits) / totalAllocated);
				taxableLeft -= share;
				gstLeft -= gstShare;

				const shareGst = computeLineGst(share, line.gstRate, input.interState === true);
				// force the apportioned gst split so rows sum exactly to line values
				shareGst.totalGstPaise = gstShare;
				shareGst.cgstPaise = Math.min(shareGst.cgstPaise, gstShare);
				shareGst.sgstPaise = input.interState ? 0 : gstShare - shareGst.cgstPaise;
				shareGst.igstPaise = input.interState ? gstShare : 0;

				const [saleItem] = await tx
					.insert(saleItemsTable)
					.values({
						saleId: sale.id,
						productId: line.productId,
						batchId: alloc.batchId,
						unitId: line.unitId,
						quantity: String(alloc.quantityBaseUnits),
						rate: fromPaise(Math.floor(line.ratePaise / line.conversion)), // effective per-base-unit rate
						gstRate: line.gstRate,
						lineTotal: fromPaise(share + gstShare),
						schemeApplied: null
					})
					.returning();

				await logSyncOutbox(tx, 'sale_items', saleItem.id, 'insert', saleItem);

				itemPayloads.push({
					productId: line.productId,
					productName: line.productName,
					batchId: alloc.batchId,
					batchNo: alloc.batchNo,
					expiryDate: alloc.expiryDate,
					unitId: line.unitId,
					unitName: line.unitName,
					quantityBaseUnits: alloc.quantityBaseUnits,
					quantitySoldUnits: Number((alloc.quantityBaseUnits / line.conversion).toFixed(4)),
					ratePerSoldUnitRupees: Number(fromPaise(line.ratePaise)),
					gstRate: Number(line.gstRate),
					taxableRupees: Number(fromPaise(share)),
					gst: shareGst,
					lineTotalRupees: Number(fromPaise(share + gstShare))
				});

				const updated = await tx
					.update(batchesTable)
					.set({
						quantityRemaining: sql`${batchesTable.quantityRemaining} - ${alloc.quantityBaseUnits}`,
						syncVersion: sql`${batchesTable.syncVersion} + 1`,
						updatedAt: new Date()
					})
					.where(
						and(
							eq(batchesTable.id, alloc.batchId),
							gte(batchesTable.quantityRemaining, String(alloc.quantityBaseUnits))
						)
					)
					.returning();
				if (updated.length !== 1) {
					// Lost a race despite locks (should not happen); roll everything back.
					throw new BillingError(
						'STALE_WRITE',
						`Stock changed while billing batch ${alloc.batchNo}`,
						409
					);
				}

				await logSyncOutbox(tx, 'batches', updated[0].id, 'update', updated[0]);

				const [stockEvent] = await tx
					.insert(batchStockEventsTable)
					.values({
						batchId: alloc.batchId,
						delta: String(-alloc.quantityBaseUnits),
						eventType: 'sale',
						referenceId: sale.id,
						createdBy: opts.userId ?? null
					})
					.returning();

				await logSyncOutbox(tx, 'batch_stock_events', stockEvent.id, 'insert', stockEvent);
			}
		}

		return {
			id: sale.id,
			invoiceNumber,
			date: sale.createdAt.toISOString(),
			store: {
				id: ctx.store.id,
				name: ctx.store.name,
				gstin: ctx.store.gstin,
				address: ctx.store.address
			},
			customer: customerPayload,
			patientName: sale.patientName,
			prescriberName: sale.prescriberName,
			prescriberRegNo: sale.prescriberRegNo,
			saleType: input.saleType,
			interState: input.interState === true,
			items: itemPayloads,
			subtotalRupees: Number(fromPaise(totals.subtotal)),
			discountRupees: Number(fromPaise(totals.discount)),
			taxableTotalRupees: Number(fromPaise(totals.taxableTotal)),
			gstTotalRupees: Number(fromPaise(totals.gstTotal)),
			roundOffRupees: Number(fromPaise(totals.grand - totals.exact)),
			grandTotalRupees: Number(fromPaise(totals.grand)),
			amountPaidAtSaleRupees: Number(fromPaise(paidPaise)),
			dueAmountRupees: Number(fromPaise(totals.grand - paidPaise)),
			paymentStatus,
			notes: input.notes ?? null,
			usedExpiredBatchOverride: lines.some((l) => l.usedExpiredBatch)
		};
	});
}
