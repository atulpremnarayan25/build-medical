import type { PurchaseRepository } from '$lib/repositories/purchaseRepository.js';
import type { Purchase, CreatePurchaseInput, PaymentStatus, PaymentMethod } from '$lib/types/index.js';
import { purchasesTable, purchaseItemsTable, suppliersTable, productsTable, batchesTable } from '$lib/server/db/schema.js';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db as pgDb } from '../db/index.js';
import { logSyncOutbox } from '../db/sync/outbox.js';

function mapPurchaseRow(purchase: any, items: any[], supplierName = 'Unknown') {
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
		subtotal: Number(purchase.totalAmount) || 0,
		discountTotal: 0,
		taxableTotal: Number(purchase.totalAmount) || 0,
		gstTotal: 0,
		roundOff: 0,
		grandTotal: Number(purchase.totalAmount) || 0,
		paidAmount: Number(purchase.totalAmount) || 0,
		dueAmount: 0,
		status: 'confirmed' as const,
		paymentMethod: 'cash' as PaymentMethod,
		createdBy: purchase.createdBy || '00000000-0000-0000-0000-000000000000',
		createdAt: purchase.createdAt
			? new Date(purchase.createdAt).toISOString()
			: new Date().toISOString(),
		updatedAt: purchase.updatedAt
			? new Date(purchase.updatedAt).toISOString()
			: new Date().toISOString(),
		paymentStatus: 'paid' as const,
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
				mrp: Number(item.mrp) || rate,
				purchaseRate: rate,
				discount: Number(item.discountAmount || item.discount) || 0,
				taxableAmount: taxableAmount,
				gstRate: gstRate,
				gstAmount: gstAmount,
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

		const purchaseValues = {
			id,
			storeId: '00000000-0000-0000-0000-000000000000',
			supplierId: _input.supplierId || null,
			supplierInvoiceRef: _input.invoiceNumber || 'INV-' + Math.floor(Math.random() * 1000000),
			supplierInvoiceDate: _input.invoiceDate
				? new Date(_input.invoiceDate).toISOString().split('T')[0]
				: now.toISOString().split('T')[0],
			totalAmount: String(_input.grandTotal || _input.subtotal || 0),
			createdBy: _input.createdBy || '00000000-0000-0000-0000-000000000000',
			originNode: 'local',
			createdAt: now,
			updatedAt: now
		};

		await pgDb.transaction(async (tx) => {
			await tx.insert(purchasesTable).values(purchaseValues as any);

			for (const item of _input.items || []) {
				let batchId = item.batchId;

				// If batchId is not provided or not in DB, create or resolve batch
				if (!batchId) {
					// Check if a batch already exists with matching productId and batchNo
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
						const totalQty = Number(item.quantity) + (Number(item.freeQuantity) || 0);
						const newQtyReceived = Number(existingBatches[0].quantityReceived || 0) + totalQty;
						const newQtyRemaining = Number(existingBatches[0].quantityRemaining || 0) + totalQty;

						await tx
							.update(batchesTable)
							.set({
								quantityReceived: String(newQtyReceived),
								quantityRemaining: String(newQtyRemaining),
								purchasePrice: String(item.purchaseRate || existingBatches[0].purchasePrice),
								mrp: String(item.mrp || existingBatches[0].mrp),
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
						const totalQty = Number(item.quantity) + (Number(item.freeQuantity) || 0);
						const batchValues = {
							id: batchId,
							productId: item.productId,
							batchNo: item.batchNumber || 'BATCH-' + Math.floor(Math.random() * 100000),
							expiryDate: item.expiryDate || '2028-12-31',
							mrp: String(item.mrp || item.purchaseRate || 0),
							purchasePrice: String(item.purchaseRate || 0),
							quantityReceived: String(totalQty),
							quantityRemaining: String(totalQty),
							supplierId: _input.supplierId || null,
							purchaseId: id,
							originNode: 'local',
							createdAt: now,
							updatedAt: now
						};

						await tx.insert(batchesTable).values(batchValues as any);
						await logSyncOutbox(tx, 'batches', batchId, 'insert', batchValues);
					}
				}

				const itemId = uuidv4();
				const itemValues = {
					id: itemId,
					purchaseId: id,
					batchId: batchId,
					quantity: String(item.quantity),
					purchasePrice: String(item.purchaseRate || 0),
					originNode: 'local',
					createdAt: now,
					updatedAt: now
				};

				await tx.insert(purchaseItemsTable).values(itemValues as any);
			}

			await logSyncOutbox(tx, 'purchases', id, 'insert', purchaseValues);
		});

		return this.getById(id) as Promise<Purchase>;
	}

	async update(id: string, input: Partial<CreatePurchaseInput>): Promise<Purchase> {
		return this.getById(id) as Promise<Purchase>;
	}

	async updatePaymentDetails(
		id: string,
		paidAmount: number,
		dueAmount: number,
		paymentStatus: PaymentStatus
	): Promise<Purchase> {
		return this.getById(id) as Promise<Purchase>;
	}
}
