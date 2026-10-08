import type { PurchaseRepository } from '$lib/repositories/purchaseRepository.js';
import type { Purchase, CreatePurchaseInput, PaymentStatus, PaymentMethod } from '$lib/types/index.js';
import {
	purchasesTable,
	purchaseItemsTable,
	suppliersTable,
	productsTable,
	batchesTable,
	batchStockEventsTable,
	storesTable
} from '$lib/server/db/schema.js';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db as pgDb } from '../db/index.js';
import { logSyncOutbox } from '../db/sync/outbox.js';

function mapPurchaseRow(purchase: any, items: any[], supplierName = 'Unknown') {
	const totalAmount = Number(purchase.totalAmount) || 0;
	const isCredit = purchase.paymentStatus === 'credit' || purchase.paymentMethod === 'credit';
	const paidAmount =
		purchase.paidAmount !== undefined && purchase.paidAmount !== null
			? Number(purchase.paidAmount)
			: isCredit
				? 0
				: totalAmount;
	const dueAmount =
		purchase.dueAmount !== undefined && purchase.dueAmount !== null
			? Number(purchase.dueAmount)
			: isCredit
				? totalAmount
				: 0;
	const paymentStatus = (purchase.paymentStatus || (dueAmount > 0 ? 'credit' : 'paid')) as PaymentStatus;
	const paymentMethod = (purchase.paymentMethod || (isCredit ? 'credit' : 'cash')) as PaymentMethod;

	return {
		id: purchase.id,
		invoiceNumber: purchase.supplierInvoiceRef || purchase.invoiceNumber || 'PUR-' + purchase.id.slice(0, 8),
		date: purchase.supplierInvoiceDate
			? new Date(purchase.supplierInvoiceDate).toISOString().split('T')[0]
			: purchase.createdAt
				? new Date(purchase.createdAt).toISOString().split('T')[0]
				: new Date().toISOString().split('T')[0],
		supplierId: purchase.supplierId,
		supplierName: supplierName || 'Supplier',
		invoiceDate:
			purchase.supplierInvoiceDate ||
			(purchase.createdAt
				? new Date(purchase.createdAt).toISOString().split('T')[0]
				: new Date().toISOString().split('T')[0]),
		subtotal: totalAmount,
		discountTotal: 0,
		taxableTotal: totalAmount,
		gstTotal: 0,
		roundOff: 0,
		grandTotal: totalAmount,
		paidAmount,
		dueAmount,
		status: 'confirmed' as const,
		paymentMethod,
		createdBy: purchase.createdBy || '00000000-0000-0000-0000-000000000000',
		createdAt: purchase.createdAt
			? new Date(purchase.createdAt).toISOString()
			: new Date().toISOString(),
		updatedAt: purchase.updatedAt
			? new Date(purchase.updatedAt).toISOString()
			: new Date().toISOString(),
		paymentStatus,
		notes: purchase.notes || undefined,
		items: items.map((item) => {
			const qty = Number(item.quantity) || 0;
			const rate = Number(item.purchasePrice || item.purchaseRate) || 0;
			const gstRate = Number(item.gstRate) || 0;
			const taxableAmount = qty * rate;
			const gstAmount = (taxableAmount * gstRate) / 100;
			const lineTotal = taxableAmount + gstAmount;

			return {
				id: item.id,
				productId: item.productId,
				productName: item.productName || 'Product',
				batchNumber: item.batchNumber || item.batchNo || 'N/A',
				expiryDate: item.expiryDate
					? item.expiryDate instanceof Date
						? item.expiryDate.toISOString().split('T')[0]
						: String(item.expiryDate)
					: '',
				quantity: qty,
				freeQuantity: Number(item.freeQuantity) || 0,
				packSize: Number(item.packSize) || 1,
				mrp: Number(item.mrp) || rate,
				purchaseRate: rate,
				discount: Number(item.discountAmount || item.discount) || 0,
				taxableAmount,
				gstRate,
				gstAmount,
				totalAmount: lineTotal
			};
		})
	};
}

export class DbPurchaseRepository implements PurchaseRepository {
	private _db;

	constructor(database: any) {
		this._db = database;
	}

	async getAll(): Promise<Purchase[]> {
		const purchasesRows = await this._db
			.select({
				purchase: purchasesTable,
				supplierName: suppliersTable.name
			})
			.from(purchasesTable)
			.leftJoin(suppliersTable, eq(purchasesTable.supplierId, suppliersTable.id))
			.orderBy(desc(purchasesTable.createdAt));

		const allItems = await this._db
			.select({
				id: purchaseItemsTable.id,
				purchaseId: purchaseItemsTable.purchaseId,
				batchId: purchaseItemsTable.batchId,
				quantity: purchaseItemsTable.quantity,
				purchasePrice: purchaseItemsTable.purchasePrice,
				batchNo: batchesTable.batchNo,
				expiryDate: batchesTable.expiryDate,
				mrp: batchesTable.mrp,
				productId: batchesTable.productId,
				productName: productsTable.name,
				gstRate: productsTable.gstRate
			})
			.from(purchaseItemsTable)
			.leftJoin(batchesTable, eq(purchaseItemsTable.batchId, batchesTable.id))
			.leftJoin(productsTable, eq(batchesTable.productId, productsTable.id));

		return purchasesRows.map(({ purchase, supplierName }: any) =>
			mapPurchaseRow(
				purchase,
				allItems.filter((i: any) => i.purchaseId === purchase.id),
				supplierName
			)
		);
	}

	async getById(id: string): Promise<Purchase | null> {
		const rows = await this._db
			.select({
				purchase: purchasesTable,
				supplierName: suppliersTable.name
			})
			.from(purchasesTable)
			.leftJoin(suppliersTable, eq(purchasesTable.supplierId, suppliersTable.id))
			.where(eq(purchasesTable.id, id))
			.limit(1);

		if (rows.length === 0) return null;

		const items = await this._db
			.select({
				id: purchaseItemsTable.id,
				purchaseId: purchaseItemsTable.purchaseId,
				batchId: purchaseItemsTable.batchId,
				quantity: purchaseItemsTable.quantity,
				purchasePrice: purchaseItemsTable.purchasePrice,
				batchNo: batchesTable.batchNo,
				expiryDate: batchesTable.expiryDate,
				mrp: batchesTable.mrp,
				productId: batchesTable.productId,
				productName: productsTable.name,
				gstRate: productsTable.gstRate
			})
			.from(purchaseItemsTable)
			.leftJoin(batchesTable, eq(purchaseItemsTable.batchId, batchesTable.id))
			.leftJoin(productsTable, eq(batchesTable.productId, productsTable.id))
			.where(eq(purchaseItemsTable.purchaseId, id));

		return mapPurchaseRow(rows[0].purchase, items, rows[0].supplierName);
	}

	async getBySupplierId(supplierId: string): Promise<Purchase[]> {
		const purchasesRows = await this._db
			.select({
				purchase: purchasesTable,
				supplierName: suppliersTable.name
			})
			.from(purchasesTable)
			.leftJoin(suppliersTable, eq(purchasesTable.supplierId, suppliersTable.id))
			.where(eq(purchasesTable.supplierId, supplierId))
			.orderBy(desc(purchasesTable.createdAt));

		if (purchasesRows.length === 0) return [];

		const allItems = await this._db
			.select({
				id: purchaseItemsTable.id,
				purchaseId: purchaseItemsTable.purchaseId,
				batchId: purchaseItemsTable.batchId,
				quantity: purchaseItemsTable.quantity,
				purchasePrice: purchaseItemsTable.purchasePrice,
				batchNo: batchesTable.batchNo,
				expiryDate: batchesTable.expiryDate,
				mrp: batchesTable.mrp,
				productId: batchesTable.productId,
				productName: productsTable.name,
				gstRate: productsTable.gstRate
			})
			.from(purchaseItemsTable)
			.leftJoin(batchesTable, eq(purchaseItemsTable.batchId, batchesTable.id))
			.leftJoin(productsTable, eq(batchesTable.productId, productsTable.id));

		return purchasesRows.map(({ purchase, supplierName }: any) =>
			mapPurchaseRow(
				purchase,
				allItems.filter((i: any) => i.purchaseId === purchase.id),
				supplierName
			)
		);
	}

	async getByDateRange(from: string, to: string): Promise<Purchase[]> {
		const purchasesRows = await this._db
			.select({
				purchase: purchasesTable,
				supplierName: suppliersTable.name
			})
			.from(purchasesTable)
			.leftJoin(suppliersTable, eq(purchasesTable.supplierId, suppliersTable.id))
			.where(
				and(
					gte(purchasesTable.createdAt, new Date(from)),
					lte(purchasesTable.createdAt, new Date(to))
				)
			)
			.orderBy(desc(purchasesTable.createdAt));

		if (purchasesRows.length === 0) return [];

		const allItems = await this._db
			.select({
				id: purchaseItemsTable.id,
				purchaseId: purchaseItemsTable.purchaseId,
				batchId: purchaseItemsTable.batchId,
				quantity: purchaseItemsTable.quantity,
				purchasePrice: purchaseItemsTable.purchasePrice,
				batchNo: batchesTable.batchNo,
				expiryDate: batchesTable.expiryDate,
				mrp: batchesTable.mrp,
				productId: batchesTable.productId,
				productName: productsTable.name,
				gstRate: productsTable.gstRate
			})
			.from(purchaseItemsTable)
			.leftJoin(batchesTable, eq(purchaseItemsTable.batchId, batchesTable.id))
			.leftJoin(productsTable, eq(batchesTable.productId, productsTable.id));

		return purchasesRows.map(({ purchase, supplierName }: any) =>
			mapPurchaseRow(
				purchase,
				allItems.filter((i: any) => i.purchaseId === purchase.id),
				supplierName
			)
		);
	}

	async create(input: CreatePurchaseInput): Promise<Purchase> {
		const id = uuidv4();
		const now = new Date();
		const _input = input as any;

		// Resolve valid storeId
		let storeId = _input.storeId;
		if (!storeId || storeId === '00000000-0000-0000-0000-000000000000') {
			const stores = await this._db.select().from(storesTable).limit(1);
			storeId = stores[0]?.id;
		}

		// Validate UUID helper for createdBy FK
		const isValidUuid = (str: any) =>
			typeof str === 'string' &&
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

		const createdBy = isValidUuid(_input.createdBy) ? _input.createdBy : null;

		// Financials & Payment Status
		const totalAmountNum = Number(_input.grandTotal ?? _input.totalAmount ?? _input.subtotal ?? 0);
		const paymentMethod = (_input.paymentMethod || 'credit') as PaymentMethod;
		const isCredit = _input.paymentStatus === 'credit' || paymentMethod === 'credit';
		const paymentStatus = (_input.paymentStatus || (isCredit ? 'credit' : 'paid')) as PaymentStatus;
		const paidAmountNum =
			_input.paidAmount !== undefined
				? Number(_input.paidAmount)
				: isCredit
					? 0
					: totalAmountNum;
		const dueAmountNum =
			_input.dueAmount !== undefined
				? Number(_input.dueAmount)
				: isCredit
					? totalAmountNum
					: 0;

		const purchaseValues = {
			id,
			storeId,
			supplierId: _input.supplierId || null,
			supplierInvoiceRef: _input.invoiceNumber || 'INV-' + Math.floor(Math.random() * 1000000),
			supplierInvoiceDate: _input.invoiceDate
				? new Date(_input.invoiceDate).toISOString().split('T')[0]
				: now.toISOString().split('T')[0],
			totalAmount: String(totalAmountNum),
			paymentStatus,
			paidAmount: String(paidAmountNum),
			dueAmount: String(dueAmountNum),
			paymentMethod,
			notes: _input.notes || null,
			createdBy,
			originNode: 'store_server',
			createdAt: now,
			updatedAt: now
		};

		await pgDb.transaction(async (tx) => {
			await tx.insert(purchasesTable).values(purchaseValues as any);

			for (const item of _input.items || []) {
				let batchId = item.batchId;
				const purchasedQty = Number(item.quantity) || 0;
				const freeQty = Number(item.freeQuantity) || 0;
				const packSize = Number(item.packSize || 1);

				// Total quantity in retail base units: (Purchased + Free) * Strips Per Box
				const totalBaseQty =
					item.baseQuantity !== undefined && Number(item.baseQuantity) > 0
						? Number(item.baseQuantity)
						: (purchasedQty + freeQty) * packSize;

				// Effective Landing Cost per retail strip:
				// Effective Strip Cost = Total Purchase Cost / ((Purchased Boxes + Free Boxes) * Strips Per Box)
				const totalLineCost =
					item.totalAmount !== undefined && Number(item.totalAmount) > 0
						? Number(item.totalAmount)
						: purchasedQty * Number(item.purchaseRate || 0) * (1 - (Number(item.discount) || 0) / 100);

				const calculatedEffectiveCost =
					totalBaseQty > 0 ? totalLineCost / totalBaseQty : Number(item.purchaseRate || 0);

				const effectivePurchasePrice =
					item.effectiveRate !== undefined && Number(item.effectiveRate) > 0
						? Number(item.effectiveRate)
						: calculatedEffectiveCost;

				// If batchId is not provided or not in DB, create or resolve batch
				if (!batchId) {
					const existingBatches = await tx
						.select()
						.from(batchesTable)
						.where(
							and(
								eq(batchesTable.productId, item.productId),
								eq(batchesTable.batchNo, item.batchNumber)
							)
						)
						.limit(1);

					if (existingBatches.length > 0) {
						batchId = existingBatches[0].id;
						const newQtyReceived = Number(existingBatches[0].quantityReceived || 0) + totalBaseQty;
						const newQtyRemaining = Number(existingBatches[0].quantityRemaining || 0) + totalBaseQty;

						await tx
							.update(batchesTable)
							.set({
								quantityReceived: String(newQtyReceived),
								quantityRemaining: String(newQtyRemaining),
								purchasePrice: String(Number(effectivePurchasePrice).toFixed(2)),
								mrp: String(Number(item.mrp || existingBatches[0].mrp).toFixed(2)),
								updatedAt: now
							})
							.where(eq(batchesTable.id, batchId));

						await logSyncOutbox(tx, 'batches', batchId, 'update', {
							id: batchId,
							quantityReceived: String(newQtyReceived),
							quantityRemaining: String(newQtyRemaining)
						});
					} else {
						batchId = uuidv4();
						const batchValues = {
							id: batchId,
							productId: item.productId,
							batchNo: item.batchNumber || 'BATCH-' + Math.floor(Math.random() * 100000),
							expiryDate: item.expiryDate || '2028-12-31',
							mrp: String(Number(item.mrp || item.purchaseRate || 0).toFixed(2)),
							purchasePrice: String(Number(effectivePurchasePrice).toFixed(2)),
							quantityReceived: String(totalBaseQty),
							quantityRemaining: String(totalBaseQty),
							supplierId: _input.supplierId || null,
							purchaseId: id,
							originNode: 'store_server',
							createdAt: now,
							updatedAt: now
						};

						await tx.insert(batchesTable).values(batchValues as any);
						await logSyncOutbox(tx, 'batches', batchId, 'insert', batchValues);
					}
				} else {
					// Existing batch by ID
					const [existingBatch] = await tx
						.select()
						.from(batchesTable)
						.where(eq(batchesTable.id, batchId));

					if (existingBatch) {
						const newQtyReceived = Number(existingBatch.quantityReceived || 0) + totalBaseQty;
						const newQtyRemaining = Number(existingBatch.quantityRemaining || 0) + totalBaseQty;

						await tx
							.update(batchesTable)
							.set({
								quantityReceived: String(newQtyReceived),
								quantityRemaining: String(newQtyRemaining),
								purchasePrice: String(Number(effectivePurchasePrice).toFixed(2)),
								mrp: String(Number(item.mrp || existingBatch.mrp).toFixed(2)),
								updatedAt: now
							})
							.where(eq(batchesTable.id, batchId));

						await logSyncOutbox(tx, 'batches', batchId, 'update', {
							id: batchId,
							quantityReceived: String(newQtyReceived),
							quantityRemaining: String(newQtyRemaining)
						});
					}
				}

				// Append-only stock event: delta = +totalBaseQty, eventType = 'purchase'
				const eventId = uuidv4();
				const eventValues = {
					id: eventId,
					batchId,
					delta: String(totalBaseQty),
					eventType: 'purchase',
					referenceId: id,
					reason: `Inward GRN Purchase Ref: ${purchaseValues.supplierInvoiceRef}`,
					createdBy,
					originNode: 'store_server',
					createdAt: now
				};
				await tx.insert(batchStockEventsTable).values(eventValues as any);
				await logSyncOutbox(tx, 'batch_stock_events', eventId, 'insert', eventValues);

				// Purchase Item row
				const itemId = uuidv4();
				const itemValues = {
					id: itemId,
					purchaseId: id,
					batchId,
					quantity: String(totalBaseQty),
					purchasePrice: String(Number(effectivePurchasePrice).toFixed(2)),
					originNode: 'store_server',
					createdAt: now,
					updatedAt: now
				};

				await tx.insert(purchaseItemsTable).values(itemValues as any);
			}

			// Update supplier balance in suppliersTable to reflect payable debt
			if (dueAmountNum > 0 && purchaseValues.supplierId) {
				await tx
					.update(suppliersTable)
					.set({
						outstandingBalance: sql`${suppliersTable.outstandingBalance} + ${dueAmountNum}`,
						updatedAt: now
					})
					.where(eq(suppliersTable.id, purchaseValues.supplierId));

				await logSyncOutbox(tx, 'suppliers', purchaseValues.supplierId, 'update', {
					id: purchaseValues.supplierId,
					debtIncrease: dueAmountNum
				});
			}

			await logSyncOutbox(tx, 'purchases', id, 'insert', purchaseValues);
		});

		return this.getById(id) as Promise<Purchase>;
	}

	async update(id: string, input: Partial<CreatePurchaseInput>): Promise<Purchase> {
		const now = new Date();
		const updateData: any = { updatedAt: now };
		if (input.invoiceNumber) updateData.supplierInvoiceRef = input.invoiceNumber;
		if (input.invoiceDate) updateData.supplierInvoiceDate = input.invoiceDate;
		if (input.grandTotal !== undefined) updateData.totalAmount = String(input.grandTotal);
		if (input.paymentStatus) updateData.paymentStatus = input.paymentStatus;
		if (input.paidAmount !== undefined) updateData.paidAmount = String(input.paidAmount);
		if (input.dueAmount !== undefined) updateData.dueAmount = String(input.dueAmount);
		if (input.paymentMethod) updateData.paymentMethod = input.paymentMethod;
		if (input.notes !== undefined) updateData.notes = input.notes;

		await pgDb.transaction(async (tx) => {
			await tx.update(purchasesTable).set(updateData).where(eq(purchasesTable.id, id));
			await logSyncOutbox(tx, 'purchases', id, 'update', updateData);
		});

		return this.getById(id) as Promise<Purchase>;
	}

	async updatePaymentDetails(
		id: string,
		paidAmount: number,
		dueAmount: number,
		paymentStatus: PaymentStatus
	): Promise<Purchase> {
		const now = new Date();
		await pgDb.transaction(async (tx) => {
			await tx
				.update(purchasesTable)
				.set({
					paidAmount: String(paidAmount),
					dueAmount: String(dueAmount),
					paymentStatus,
					updatedAt: now
				})
				.where(eq(purchasesTable.id, id));

			await logSyncOutbox(tx, 'purchases', id, 'update', {
				id,
				paidAmount: String(paidAmount),
				dueAmount: String(dueAmount),
				paymentStatus
			});
		});

		return this.getById(id) as Promise<Purchase>;
	}
}
