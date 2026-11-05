import type { SaleRepository } from '$lib/repositories/saleRepository.js';
import type { Sale, CreateSaleInput, SaleItem } from '$lib/types/index.js';
import {
	salesTable,
	saleItemsTable,
	productsTable,
	batchesTable,
	batchStockEventsTable,
	customersTable,
	paymentsTable,
	storesTable,
	usersTable
} from '$lib/server/db/schema.js';
import { eq, ne, desc, and, gte, lte, inArray, or, ilike, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db as pgDb } from '../db/index.js';
import { logSyncOutbox } from '../db/sync/outbox.js';
import { logAudit } from '../audit.js';

function mapSaleRow(sale: any, items: any[], customerName?: string | null) {
	return {
		id: sale.id,
		storeId: sale.storeId,
		invoiceNumber: sale.invoiceNumber,
		date: sale.saleDate
			? new Date(sale.saleDate).toISOString().split('T')[0]
			: sale.createdAt
				? new Date(sale.createdAt).toISOString().split('T')[0]
				: new Date().toISOString().split('T')[0],
		customerId: sale.customerId || 'walk-in',
		customerName: customerName || (sale.customerId ? 'Customer' : 'Walk-in Customer'),
		saleType: sale.saleType || 'retail',
		subtotal: Number(sale.subtotal) || 0,
		discountTotal: 0,
		taxableTotal: Number(sale.subtotal) || 0,
		gstTotal: Number(sale.gstAmount) || 0,
		roundOff: 0,
		grandTotal: Number(sale.totalAmount) || 0,
		paidAmount: Number(sale.amountPaidAtSale) || 0,
		dueAmount: (Number(sale.totalAmount) || 0) - (Number(sale.amountPaidAtSale) || 0),
		status: (sale.status || 'confirmed') as any,
		paymentMethod: sale.paymentMethod || 'cash',
		createdBy: sale.createdBy || '00000000-0000-0000-0000-000000000000',
		createdAt: sale.createdAt ? new Date(sale.createdAt).toISOString() : new Date().toISOString(),
		updatedAt: sale.updatedAt ? new Date(sale.updatedAt).toISOString() : new Date().toISOString(),
		paymentStatus: sale.paymentStatus || 'paid',
		items: items.map((item) => {
			const qty = Number(item.quantity) || 0;
			const rate = Number(item.rate) || 0;
			const gstRate = Number(item.gstRate) || 0;
			const lineTotal = Number(item.lineTotal) || qty * rate;
			const taxableAmount = qty * rate;
			const gstAmount = (taxableAmount * gstRate) / 100;

			return {
				id: item.id,
				productId: item.productId,
				productName: item.productName || 'Product',
				batchId: item.batchId,
				batchNumber: item.batchNumber || item.batchNo || 'N/A',
				expiryDate: item.expiryDate || '',
				quantity: qty,
				mrp: Number(item.mrp) || rate,
				rate: rate,
				discount: Number(item.discount || item.discountAmount) || 0,
				taxableAmount: taxableAmount,
				gstRate: gstRate,
				gstAmount: gstAmount,
				totalAmount: lineTotal
			};
		})
	};
}

export class DbSaleRepository implements SaleRepository {
	private _db;

	constructor(database: any) {
		this._db = database;
	}

	async getDashboardSummary(storeId?: string): Promise<{
		todaySalesCount: number;
		todaySalesTotal: number;
		todayItemsSold: number;
		totalReceivables: number;
	}> {
		const todayStart = new Date();
		todayStart.setHours(0, 0, 0, 0);

		const salesConditions = [ne(salesTable.status, "cancelled")];
		if (storeId) salesConditions.push(eq(salesTable.storeId, storeId));

		const [summaryRow] = await this._db
			.select({
				todayCount: sql<number>`COALESCE(COUNT(CASE WHEN ${salesTable.createdAt} >= ${todayStart} THEN 1 END), 0)::int`,
				todayTotal: sql<string>`COALESCE(SUM(CASE WHEN ${salesTable.createdAt} >= ${todayStart} THEN CAST(${salesTable.totalAmount} AS NUMERIC) ELSE 0 END), 0)`,
				totalReceivables: sql<string>`COALESCE(SUM(CAST(${salesTable.totalAmount} AS NUMERIC) - CAST(${salesTable.amountPaidAtSale} AS NUMERIC)), 0)`
			})
			.from(salesTable)
			.where(and(...salesConditions));

		const itemConditions = [
			ne(salesTable.status, "cancelled"),
			gte(salesTable.createdAt, todayStart)
		];
		if (storeId) itemConditions.push(eq(salesTable.storeId, storeId));

		const [itemRow] = await this._db
			.select({
				itemsSold: sql<number>`COALESCE(SUM(${saleItemsTable.quantity}), 0)::int`
			})
			.from(saleItemsTable)
			.leftJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
			.where(and(...itemConditions));

		return {
		todaySalesCount: Number(summaryRow?.todayCount || 0),
		todaySalesTotal: Number(summaryRow?.todayTotal || 0),
		todayItemsSold: Number(itemRow?.itemsSold || 0),
		totalReceivables: Math.max(0, Number(summaryRow?.totalReceivables || 0))
		};
	}

	async getPaginated(opts: {
		page?: number;
		limit?: number;
		customerId?: string;
		status?: string;
		search?: string;
		storeId?: string;
	}): Promise<{ items: Sale[]; total: number; page: number; limit: number; totalPages: number }> {
		const page = Math.max(1, opts.page || 1);
		const limit = Math.max(1, Math.min(100, opts.limit || 50));
		const offset = (page - 1) * limit;

		const conditions = [];
		if (opts.storeId) {
			conditions.push(eq(salesTable.storeId, opts.storeId));
		}
		if (opts.customerId) {
			conditions.push(eq(salesTable.customerId, opts.customerId));
		}
		if (opts.status && opts.status !== "all") {
			conditions.push(eq(salesTable.status, opts.status));
		}
		if (opts.search) {
			const s = `%${opts.search}%`;
			const searchCond = or(
				ilike(salesTable.invoiceNumber, s),
				ilike(salesTable.notes, s),
				ilike(customersTable.name, s)
			);
			if (searchCond) conditions.push(searchCond);
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		const [countRow] = await this._db
			.select({ count: sql<number>`count(*)::int` })
			.from(salesTable)
			.leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
			.where(whereClause);

		const total = Number(countRow?.count || 0);

		const salesRows = await this._db
			.select({
				sale: salesTable,
				customerName: customersTable.name
			})
			.from(salesTable)
			.leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
			.where(whereClause)
			.orderBy(desc(salesTable.createdAt))
			.limit(limit)
			.offset(offset);

		if (salesRows.length === 0) {
			return { items: [], total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
		}

		const saleIds = salesRows.map(({ sale }: any) => sale.id);

		const items = await this._db
			.select({
				id: saleItemsTable.id,
				saleId: saleItemsTable.saleId,
				productId: saleItemsTable.productId,
				productName: productsTable.name,
				batchId: saleItemsTable.batchId,
				batchNumber: batchesTable.batchNo,
				expiryDate: batchesTable.expiryDate,
				mrp: batchesTable.mrp,
				quantity: saleItemsTable.quantity,
				rate: saleItemsTable.rate,
				gstRate: saleItemsTable.gstRate,
				lineTotal: saleItemsTable.lineTotal,
				schemeApplied: saleItemsTable.schemeApplied
			})
			.from(saleItemsTable)
			.leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
			.leftJoin(batchesTable, eq(saleItemsTable.batchId, batchesTable.id))
			.where(inArray(saleItemsTable.saleId, saleIds));

		const itemsBySaleId = new Map<string, any[]>();
		for (const item of items) {
			const list = itemsBySaleId.get(item.saleId);
			if (list) {
				list.push(item);
			} else {
				itemsBySaleId.set(item.saleId, [item]);
			}
		}

		const mapped = salesRows.map(({ sale, customerName }: any) =>
			mapSaleRow(sale, itemsBySaleId.get(sale.id) || [], customerName)
		);

		return {
			items: mapped,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit) || 1
		};
	}

	async getAll(limit = 100, offset = 0): Promise<Sale[]> {
		const salesRows = await this._db
			.select({
				sale: salesTable,
				customerName: customersTable.name
			})
			.from(salesTable)
			.leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
			.orderBy(desc(salesTable.createdAt))
			.limit(limit)
			.offset(offset);

		if (salesRows.length === 0) {
			return [];
		}

		const saleIds = salesRows.map(({ sale }: any) => sale.id);

		const items = await this._db
			.select({
				id: saleItemsTable.id,
				saleId: saleItemsTable.saleId,
				productId: saleItemsTable.productId,
				productName: productsTable.name,
				batchId: saleItemsTable.batchId,
				batchNumber: batchesTable.batchNo,
				expiryDate: batchesTable.expiryDate,
				mrp: batchesTable.mrp,
				quantity: saleItemsTable.quantity,
				rate: saleItemsTable.rate,
				gstRate: saleItemsTable.gstRate,
				lineTotal: saleItemsTable.lineTotal,
				schemeApplied: saleItemsTable.schemeApplied
			})
			.from(saleItemsTable)
			.leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
			.leftJoin(batchesTable, eq(saleItemsTable.batchId, batchesTable.id))
			.where(inArray(saleItemsTable.saleId, saleIds));

		const itemsBySaleId = new Map<string, any[]>();
		for (const item of items) {
			const list = itemsBySaleId.get(item.saleId);
			if (list) {
				list.push(item);
			} else {
				itemsBySaleId.set(item.saleId, [item]);
			}
		}

		return salesRows.map(({ sale, customerName }: any) =>
			mapSaleRow(sale, itemsBySaleId.get(sale.id) || [], customerName)
		);
	}

	async getById(id: string): Promise<Sale | null> {
		const rows = await this._db
			.select({
				sale: salesTable,
				customerName: customersTable.name
			})
			.from(salesTable)
			.leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
			.where(eq(salesTable.id, id))
			.limit(1);

		if (rows.length === 0) return null;

		const items = await this._db
			.select({
				id: saleItemsTable.id,
				saleId: saleItemsTable.saleId,
				productId: saleItemsTable.productId,
				productName: productsTable.name,
				batchId: saleItemsTable.batchId,
				batchNumber: batchesTable.batchNo,
				expiryDate: batchesTable.expiryDate,
				mrp: batchesTable.mrp,
				quantity: saleItemsTable.quantity,
				rate: saleItemsTable.rate,
				gstRate: saleItemsTable.gstRate,
				lineTotal: saleItemsTable.lineTotal,
				schemeApplied: saleItemsTable.schemeApplied
			})
			.from(saleItemsTable)
			.leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
			.leftJoin(batchesTable, eq(saleItemsTable.batchId, batchesTable.id))
			.where(eq(saleItemsTable.saleId, id));

		return mapSaleRow(rows[0].sale, items, rows[0].customerName);
	}

	async getByCustomerId(customerId: string): Promise<Sale[]> {
		const salesRows = await this._db
			.select({
				sale: salesTable,
				customerName: customersTable.name
			})
			.from(salesTable)
			.leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
			.where(eq(salesTable.customerId, customerId))
			.orderBy(desc(salesTable.createdAt));

		if (salesRows.length === 0) return [];

		const saleIds = salesRows.map(({ sale }: any) => sale.id);

		const allItems = await this._db
			.select({
				id: saleItemsTable.id,
				saleId: saleItemsTable.saleId,
				productId: saleItemsTable.productId,
				productName: productsTable.name,
				batchId: saleItemsTable.batchId,
				batchNumber: batchesTable.batchNo,
				expiryDate: batchesTable.expiryDate,
				mrp: batchesTable.mrp,
				quantity: saleItemsTable.quantity,
				rate: saleItemsTable.rate,
				gstRate: saleItemsTable.gstRate,
				lineTotal: saleItemsTable.lineTotal,
				schemeApplied: saleItemsTable.schemeApplied
			})
			.from(saleItemsTable)
			.leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
			.leftJoin(batchesTable, eq(saleItemsTable.batchId, batchesTable.id))
			.where(inArray(saleItemsTable.saleId, saleIds));

		const itemsBySaleId = new Map<string, any[]>();
		for (const item of allItems) {
			const list = itemsBySaleId.get(item.saleId);
			if (list) {
				list.push(item);
			} else {
				itemsBySaleId.set(item.saleId, [item]);
			}
		}

		return salesRows.map(({ sale, customerName }: any) =>
			mapSaleRow(
				sale,
				itemsBySaleId.get(sale.id) || [],
				customerName
			)
		);
	}

	async create(input: CreateSaleInput): Promise<Sale> {
		const id = uuidv4();
		const now = new Date();
		const _input = input as any;

		let storeId = _input.storeId;
		if (!storeId || storeId === '00000000-0000-0000-0000-000000000000') {
			const [firstStore] = await this._db.select({ id: storesTable.id }).from(storesTable).limit(1);
			storeId = firstStore?.id;
		}

		let createdBy = _input.createdBy;
		if (!createdBy || createdBy === '00000000-0000-0000-0000-000000000000') {
			const [firstUser] = await this._db.select({ id: usersTable.id }).from(usersTable).limit(1);
			createdBy = firstUser?.id || null;
		}

		const saleValues = {
			id,
			storeId,
			invoiceNumber: _input.invoiceNumber || 'INV-' + Math.floor(Math.random() * 1000000),
			customerId: _input.customerId || null,
			saleType: _input.saleType || 'retail',
			subtotal: String(_input.subtotal || _input.grandTotal || 0),
			gstAmount: String(_input.gstTotal || 0),
			totalAmount: String(_input.grandTotal || 0),
			amountPaidAtSale: String(_input.paidAmount || 0),
			paymentStatus: _input.paymentStatus || 'paid',
			createdBy,
			originNode: 'local',
			createdAt: now,
			updatedAt: now
		};

		await pgDb.transaction(async (tx) => {
			await tx.insert(salesTable).values(saleValues as any);

			for (const item of _input.items || []) {
				const itemId = uuidv4();
				await tx.insert(saleItemsTable).values({
					id: itemId,
					saleId: id,
					productId: item.productId || '00000000-0000-0000-0000-000000000000',
					batchId: item.batchId || '00000000-0000-0000-0000-000000000000',
					unitId: item.unitId || '00000000-0000-0000-0000-000000000000',
					quantity: String(item.quantity),
					rate: String(item.rate),
					gstRate: String(item.gstRate || 0),
					lineTotal: String(item.totalAmount || Number(item.rate) * Number(item.quantity))
				} as any);
			}

			await logSyncOutbox(tx, 'sales', id, 'insert', saleValues);
		});

		return this.getById(id) as Promise<Sale>;
	}

	async update(id: string, input: Partial<Sale>): Promise<Sale> {
		return this.getById(id) as Promise<Sale>;
	}

	async updateStatus(id: string, status: Sale['status']): Promise<Sale> {
		const now = new Date();
		await pgDb.transaction(async (tx) => {
			const existingSale = await this.getById(id);
			if (!existingSale) return;

			await tx
				.update(salesTable)
				.set({
					status,
					updatedAt: now
				})
				.where(eq(salesTable.id, id));

			await logSyncOutbox(tx, 'sales', id, 'update', {
				id,
				status,
				updatedAt: now.toISOString()
			});

			// If cancelling a confirmed sale: restore batch stock & rollback customer balance
			if (status === 'cancelled' && existingSale.status !== 'cancelled') {
				// Void counter payment receipts tied to this cancelled sale
				const paymentsToDelete = await tx
					.select({ id: paymentsTable.id })
					.from(paymentsTable)
					.where(eq(paymentsTable.relatedSaleId, id));

				if (paymentsToDelete.length > 0) {
					await tx.delete(paymentsTable).where(eq(paymentsTable.relatedSaleId, id));
					for (const p of paymentsToDelete) {
						await logSyncOutbox(tx, 'payments', p.id, 'delete', { id: p.id });
					}
				}

				for (const item of existingSale.items) {
					if (item.batchId && item.batchId !== '00000000-0000-0000-0000-000000000000') {
						const [batch] = await tx
							.select()
							.from(batchesTable)
							.where(eq(batchesTable.id, item.batchId));

						if (batch) {
							const restoredQty = Number(batch.quantityRemaining || 0) + Number(item.quantity);
							await tx
								.update(batchesTable)
								.set({
									quantityRemaining: String(restoredQty),
									updatedAt: now
								})
								.where(eq(batchesTable.id, item.batchId));

							await logSyncOutbox(tx, 'batches', item.batchId, 'update', {
								id: item.batchId,
								quantityRemaining: String(restoredQty)
							});

							const eventId = uuidv4();
							const eventValues = {
								id: eventId,
								batchId: item.batchId,
								delta: String(item.quantity),
								eventType: 'adjustment',
								referenceId: id,
								reason: `Sale ${existingSale.invoiceNumber} cancelled - stock restored`,
								originNode: 'store_server',
								createdAt: now
							};
							await tx.insert(batchStockEventsTable).values(eventValues as any);
							await logSyncOutbox(tx, 'batch_stock_events', eventId, 'insert', eventValues);
						}
					}
				}

				// Statutory regulatory audit trail
				const [saleRow] = await tx
					.select()
					.from(salesTable)
					.where(eq(salesTable.id, id));

				if (saleRow) {
					await logAudit(tx, {
						storeId: saleRow.storeId,
						entityType: 'sale',
						entityId: id,
						action: 'cancel',
						beforeValue: { status: existingSale.status, invoiceNumber: existingSale.invoiceNumber, grandTotal: existingSale.grandTotal },
						afterValue: { status: 'cancelled' }
					});
				}
			}
		});

		return this.getById(id) as Promise<Sale>;
	}

	async updatePaymentStatus(
		id: string,
		status: Sale['paymentStatus'],
		paidAmount: number
	): Promise<Sale> {
		return this.getById(id) as Promise<Sale>;
	}

	async updatePaymentDetails(
		id: string,
		paidAmount: number,
		dueAmount: number,
		paymentStatus: Sale['paymentStatus']
	): Promise<Sale> {
		const now = new Date();
		await pgDb.transaction(async (tx) => {
			await tx
				.update(salesTable)
				.set({
					amountPaidAtSale: String(paidAmount),
					paymentStatus,
					updatedAt: now
				})
				.where(eq(salesTable.id, id));

			await logSyncOutbox(tx, 'sales', id, 'update', {
				id,
				amountPaidAtSale: String(paidAmount),
				paymentStatus
			});
		});

		return this.getById(id) as Promise<Sale>;
	}

	async getByDateRange(from: string, to: string): Promise<Sale[]> {
		const salesRows = await this._db
			.select({
				sale: salesTable,
				customerName: customersTable.name
			})
			.from(salesTable)
			.leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
			.where(
				and(gte(salesTable.createdAt, new Date(from)), lte(salesTable.createdAt, new Date(to)))
			)
			.orderBy(desc(salesTable.createdAt));

		if (salesRows.length === 0) return [];

		const allItems = await this._db
			.select({
				id: saleItemsTable.id,
				saleId: saleItemsTable.saleId,
				productId: saleItemsTable.productId,
				productName: productsTable.name,
				batchId: saleItemsTable.batchId,
				batchNumber: batchesTable.batchNo,
				expiryDate: batchesTable.expiryDate,
				mrp: batchesTable.mrp,
				quantity: saleItemsTable.quantity,
				rate: saleItemsTable.rate,
				gstRate: saleItemsTable.gstRate,
				lineTotal: saleItemsTable.lineTotal,
				schemeApplied: saleItemsTable.schemeApplied
			})
			.from(saleItemsTable)
			.leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
			.leftJoin(batchesTable, eq(saleItemsTable.batchId, batchesTable.id));

		return salesRows.map(({ sale, customerName }: any) =>
			mapSaleRow(
				sale,
				allItems.filter((i: any) => i.saleId === sale.id),
				customerName
			)
		);
	}
}
