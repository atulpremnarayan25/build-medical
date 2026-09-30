import type { BatchRepository } from '$lib/repositories/batchRepository.js';
import type { Batch, BatchStatus, CreateBatchInput } from '$lib/types/index.js';
import { batchesTable, productsTable, suppliersTable, productUnitsTable } from '$lib/server/db/schema.js';
import { eq, and, asc, desc, gt, lte, sql } from 'drizzle-orm';
import { mapToBatch } from '../db/mappers.js';
import { v4 as uuidv4 } from 'uuid';
import { db as pgDb } from '../db/index.js';
import { logSyncOutbox } from '../db/sync/outbox.js';

function computeBatchStatus(expiryDate: string, quantityRemaining: number): BatchStatus {
	if (quantityRemaining <= 0) return 'out-of-stock';
	const today = new Date().toISOString().split('T')[0];
	if (expiryDate <= today) return 'expired';
	const ninetyDaysOut = new Date();
	ninetyDaysOut.setDate(ninetyDaysOut.getDate() + 90);
	const ninetyDaysIso = ninetyDaysOut.toISOString().split('T')[0];
	if (expiryDate <= ninetyDaysIso) return 'expiring-soon';
	return 'healthy';
}

export class DbBatchRepository implements BatchRepository {
	private _db;

	constructor(database: any) {
		this._db = database;
	}

	async getAll(): Promise<Batch[]> {
		const rows = await this._db
			.select({
				id: batchesTable.id,
				productId: batchesTable.productId,
				productName: productsTable.name,
				batchNo: batchesTable.batchNo,
				expiryDate: batchesTable.expiryDate,
				mrp: batchesTable.mrp,
				purchasePrice: batchesTable.purchasePrice,
				quantityRemaining: batchesTable.quantityRemaining,
				supplierId: batchesTable.supplierId,
				supplierName: suppliersTable.name,
				createdAt: batchesTable.createdAt,
				baseUnitRetailPrice: sql<string | null>`(
					SELECT pu.retail_price FROM product_units pu
					WHERE pu.product_id = ${batchesTable.productId} AND pu.is_base_unit = true
					LIMIT 1
				)`
			})
			.from(batchesTable)
			.leftJoin(productsTable, eq(batchesTable.productId, productsTable.id))
			.leftJoin(suppliersTable, eq(batchesTable.supplierId, suppliersTable.id))
			.orderBy(asc(batchesTable.expiryDate));

		return rows.map((r: any) => ({
			...mapToBatch(r),
			status: computeBatchStatus(r.expiryDate, Number(r.quantityRemaining || 0))
		}));
	}

	async getById(id: string): Promise<Batch | null> {
		const rows = await this._db
			.select({
				id: batchesTable.id,
				productId: batchesTable.productId,
				productName: productsTable.name,
				batchNo: batchesTable.batchNo,
				expiryDate: batchesTable.expiryDate,
				mrp: batchesTable.mrp,
				purchasePrice: batchesTable.purchasePrice,
				quantityRemaining: batchesTable.quantityRemaining,
				supplierId: batchesTable.supplierId,
				supplierName: suppliersTable.name,
				createdAt: batchesTable.createdAt,
				baseUnitRetailPrice: sql<string | null>`(
					SELECT pu.retail_price FROM product_units pu
					WHERE pu.product_id = ${batchesTable.productId} AND pu.is_base_unit = true
					LIMIT 1
				)`
			})
			.from(batchesTable)
			.leftJoin(productsTable, eq(batchesTable.productId, productsTable.id))
			.leftJoin(suppliersTable, eq(batchesTable.supplierId, suppliersTable.id))
			.where(eq(batchesTable.id, id))
			.limit(1);

		if (rows.length === 0) return null;
		const r = rows[0];
		return {
			...mapToBatch(r),
			status: computeBatchStatus(r.expiryDate, Number(r.quantityRemaining || 0))
		};
	}

	async getByProductId(productId: string): Promise<Batch[]> {
		const rows = await this._db
			.select({
				id: batchesTable.id,
				productId: batchesTable.productId,
				productName: productsTable.name,
				batchNo: batchesTable.batchNo,
				expiryDate: batchesTable.expiryDate,
				mrp: batchesTable.mrp,
				purchasePrice: batchesTable.purchasePrice,
				quantityRemaining: batchesTable.quantityRemaining,
				supplierId: batchesTable.supplierId,
				supplierName: suppliersTable.name,
				createdAt: batchesTable.createdAt,
				baseUnitRetailPrice: sql<string | null>`(
					SELECT pu.retail_price FROM product_units pu
					WHERE pu.product_id = ${batchesTable.productId} AND pu.is_base_unit = true
					LIMIT 1
				)`
			})
			.from(batchesTable)
			.leftJoin(productsTable, eq(batchesTable.productId, productsTable.id))
			.leftJoin(suppliersTable, eq(batchesTable.supplierId, suppliersTable.id))
			.where(eq(batchesTable.productId, productId))
			.orderBy(asc(batchesTable.expiryDate), asc(batchesTable.id));

		return rows.map((r: any) => ({
			...mapToBatch(r),
			status: computeBatchStatus(r.expiryDate, Number(r.quantityRemaining || 0))
		}));
	}

	async create(input: CreateBatchInput): Promise<Batch> {
		const id = uuidv4();
		const now = new Date();

		const values = {
			id,
			productId: input.productId,
			batchNo: input.batchNumber,
			expiryDate: input.expiryDate,
			mrp: String(input.mrp || 0),
			purchasePrice: String(input.purchaseRate || 0),
			quantityReceived: String(input.quantity || 0),
			quantityRemaining: String(input.quantity || 0),
			supplierId: input.supplierId || null,
			originNode: 'local',
			createdAt: now,
			updatedAt: now
		};

		await pgDb.transaction(async (tx) => {
			await tx.insert(batchesTable).values(values as any);
			await logSyncOutbox(tx, 'batches', id, 'insert', values);
		});

		return this.getById(id) as Promise<Batch>;
	}

	async update(id: string, input: Partial<CreateBatchInput>): Promise<Batch> {
		const updateData: any = { updatedAt: new Date() };
		if (input.batchNumber !== undefined) updateData.batchNo = input.batchNumber;
		if (input.expiryDate !== undefined) updateData.expiryDate = input.expiryDate;
		if (input.mrp !== undefined) updateData.mrp = String(input.mrp);
		if (input.purchaseRate !== undefined) updateData.purchasePrice = String(input.purchaseRate);
		if (input.quantity !== undefined) {
			updateData.quantityRemaining = String(input.quantity);
		}

		await pgDb.transaction(async (tx) => {
			await tx.update(batchesTable).set(updateData).where(eq(batchesTable.id, id));
			const updated = await tx.select().from(batchesTable).where(eq(batchesTable.id, id)).limit(1);
			if (updated.length > 0) {
				await logSyncOutbox(tx, 'batches', id, 'update', updated[0]);
			}
		});

		return this.getById(id) as Promise<Batch>;
	}

	async updateQuantity(id: string, quantity: number): Promise<Batch> {
		await pgDb.transaction(async (tx) => {
			await tx
				.update(batchesTable)
				.set({
					quantityRemaining: String(quantity),
					updatedAt: new Date()
				})
				.where(eq(batchesTable.id, id));
			const updated = await tx.select().from(batchesTable).where(eq(batchesTable.id, id)).limit(1);
			if (updated.length > 0) {
				await logSyncOutbox(tx, 'batches', id, 'update', updated[0]);
			}
		});
		return this.getById(id) as Promise<Batch>;
	}

	async delete(id: string): Promise<void> {
		await pgDb.transaction(async (tx) => {
			await tx.delete(batchesTable).where(eq(batchesTable.id, id));
			await logSyncOutbox(tx, 'batches', id, 'delete', { id });
		});
	}

	async getExpiring(days: number): Promise<Batch[]> {
		const targetDate = new Date();
		targetDate.setDate(targetDate.getDate() + days);
		const targetIso = targetDate.toISOString().split('T')[0];
		const todayIso = new Date().toISOString().split('T')[0];

		const rows = await this._db
			.select({
				id: batchesTable.id,
				productId: batchesTable.productId,
				productName: productsTable.name,
				batchNo: batchesTable.batchNo,
				expiryDate: batchesTable.expiryDate,
				mrp: batchesTable.mrp,
				purchasePrice: batchesTable.purchasePrice,
				quantityRemaining: batchesTable.quantityRemaining,
				supplierId: batchesTable.supplierId,
				supplierName: suppliersTable.name,
				createdAt: batchesTable.createdAt,
				baseUnitRetailPrice: sql<string | null>`(
					SELECT pu.retail_price FROM product_units pu
					WHERE pu.product_id = ${batchesTable.productId} AND pu.is_base_unit = true
					LIMIT 1
				)`
			})
			.from(batchesTable)
			.leftJoin(productsTable, eq(batchesTable.productId, productsTable.id))
			.leftJoin(suppliersTable, eq(batchesTable.supplierId, suppliersTable.id))
			.where(
				and(
					gt(batchesTable.expiryDate, todayIso),
					lte(batchesTable.expiryDate, targetIso),
					gt(batchesTable.quantityRemaining, '0')
				)
			)
			.orderBy(asc(batchesTable.expiryDate));

		return rows.map((r: any) => ({
			...mapToBatch(r),
			status: computeBatchStatus(r.expiryDate, Number(r.quantityRemaining || 0))
		}));
	}

	async getExpired(): Promise<Batch[]> {
		const todayIso = new Date().toISOString().split('T')[0];
		const rows = await this._db
			.select({
				id: batchesTable.id,
				productId: batchesTable.productId,
				productName: productsTable.name,
				batchNo: batchesTable.batchNo,
				expiryDate: batchesTable.expiryDate,
				mrp: batchesTable.mrp,
				purchasePrice: batchesTable.purchasePrice,
				quantityRemaining: batchesTable.quantityRemaining,
				supplierId: batchesTable.supplierId,
				supplierName: suppliersTable.name,
				createdAt: batchesTable.createdAt,
				baseUnitRetailPrice: sql<string | null>`(
					SELECT pu.retail_price FROM product_units pu
					WHERE pu.product_id = ${batchesTable.productId} AND pu.is_base_unit = true
					LIMIT 1
				)`
			})
			.from(batchesTable)
			.leftJoin(productsTable, eq(batchesTable.productId, productsTable.id))
			.leftJoin(suppliersTable, eq(batchesTable.supplierId, suppliersTable.id))
			.where(and(lte(batchesTable.expiryDate, todayIso), gt(batchesTable.quantityRemaining, '0')))
			.orderBy(asc(batchesTable.expiryDate));

		return rows.map((r: any) => ({
			...mapToBatch(r),
			status: computeBatchStatus(r.expiryDate, Number(r.quantityRemaining || 0))
		}));
	}

	async getLowStock(threshold: number): Promise<Batch[]> {
		const rows = await this._db
			.select({
				id: batchesTable.id,
				productId: batchesTable.productId,
				productName: productsTable.name,
				batchNo: batchesTable.batchNo,
				expiryDate: batchesTable.expiryDate,
				mrp: batchesTable.mrp,
				purchasePrice: batchesTable.purchasePrice,
				quantityRemaining: batchesTable.quantityRemaining,
				supplierId: batchesTable.supplierId,
				supplierName: suppliersTable.name,
				createdAt: batchesTable.createdAt,
				baseUnitRetailPrice: sql<string | null>`(
					SELECT pu.retail_price FROM product_units pu
					WHERE pu.product_id = ${batchesTable.productId} AND pu.is_base_unit = true
					LIMIT 1
				)`
			})
			.from(batchesTable)
			.leftJoin(productsTable, eq(batchesTable.productId, productsTable.id))
			.leftJoin(suppliersTable, eq(batchesTable.supplierId, suppliersTable.id))
			.where(
				and(
					lte(batchesTable.quantityRemaining, String(threshold)),
					gt(batchesTable.quantityRemaining, '0')
				)
			)
			.orderBy(asc(batchesTable.quantityRemaining));

		return rows.map((r: any) => ({
			...mapToBatch(r),
			status: computeBatchStatus(r.expiryDate, Number(r.quantityRemaining || 0))
		}));
	}
}
