import type { SaleRepository } from '$lib/repositories/saleRepository.js';
import type { Sale, CreateSaleInput, SaleItem } from '$lib/types/index.js';
import { salesTable, saleItemsTable, productsTable, batchesTable, customersTable } from '$lib/server/db/schema.js';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db as pgDb } from '../db/index.js';
import { logSyncOutbox } from '../db/sync/outbox.js';

function mapSaleRow(sale: any, items: any[], customerName?: string | null) {
	return {
		id: sale.id,
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
		status: 'confirmed' as const,
		paymentMethod: sale.paymentMethod || 'cash',
		createdBy: sale.createdBy || '00000000-0000-0000-0000-000000000000',
		createdAt: sale.createdAt ? new Date(sale.createdAt).toISOString() : new Date().toISOString(),
		updatedAt: sale.updatedAt ? new Date(sale.updatedAt).toISOString() : new Date().toISOString(),
		paymentStatus: sale.paymentStatus || 'paid',
		items: items.map((item) => {
			const qty = Number(item.quantity) || 0;
			const rate = Number(item.rate) || 0;
			const gstRate = Number(item.gstRate) || 0;
			const lineTotal = Number(item.lineTotal) || (qty * rate);
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

	async getAll(): Promise<Sale[]> {
		const salesRows = await this._db
			.select({
				sale: salesTable,
				customerName: customersTable.name
			})
			.from(salesTable)
			.leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
			.orderBy(desc(salesTable.createdAt));

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

	async create(input: CreateSaleInput): Promise<Sale> {
		const id = uuidv4();
		const now = new Date();
		const _input = input as any;

		const saleValues = {
			id,
			storeId: '00000000-0000-0000-0000-000000000000',
			invoiceNumber: _input.invoiceNumber || 'INV-' + Math.floor(Math.random() * 1000000),
			customerId: _input.customerId || null,
			saleType: _input.saleType || 'retail',
			subtotal: String(_input.subtotal || _input.grandTotal || 0),
			gstAmount: String(_input.gstTotal || 0),
			totalAmount: String(_input.grandTotal || 0),
			amountPaidAtSale: String(_input.paidAmount || 0),
			paymentStatus: _input.paymentStatus || 'paid',
			createdBy: _input.createdBy || '00000000-0000-0000-0000-000000000000',
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
