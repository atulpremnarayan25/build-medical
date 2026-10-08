import type { SupplierRepository } from '$lib/repositories/supplierRepository.js';
import type { Supplier, CreateSupplierInput } from '$lib/types/index.js';
import { suppliersTable, storesTable } from '../db/schema.js';
import { eq, and, ilike, or, sql } from 'drizzle-orm';
import { mapToSupplier } from '../db/mappers.js';
import { v4 as uuidv4 } from 'uuid';
import { db as pgDb } from '../db/index.js';
import { logSyncOutbox } from '../db/sync/outbox.js';

export class DbSupplierRepository implements SupplierRepository {
	private _db;

	constructor(database: any) {
		this._db = database;
	}

	private _balanceSql() {
		return sql<string>`(
			COALESCE((SELECT SUM(CAST(total_amount AS NUMERIC)) FROM purchases WHERE purchases.supplier_id = suppliers.id), 0)
			- COALESCE((SELECT SUM(CAST(amount AS NUMERIC)) FROM payments WHERE payments.supplier_id = suppliers.id AND payments.direction = 'supplier_payment'), 0)
			- COALESCE((
				SELECT SUM(CAST(ri.line_amount AS NUMERIC))
				FROM returns r
				JOIN return_items ri ON r.id = ri.return_id
				JOIN purchases p ON r.original_purchase_id = p.id
				WHERE p.supplier_id = suppliers.id AND r.return_type = 'purchase_return'
			), 0)
		)`;
	}

	async getAll(): Promise<Supplier[]> {
		const rows = await this._db
			.select({
				id: suppliersTable.id,
				storeId: suppliersTable.storeId,
				name: suppliersTable.name,
				contactPhone: suppliersTable.contactPhone,
				address: suppliersTable.address,
				gstin: suppliersTable.gstin,
				isActive: suppliersTable.isActive,
				createdAt: suppliersTable.createdAt,
				updatedAt: suppliersTable.updatedAt,
				outstandingBalance: this._balanceSql()
			})
			.from(suppliersTable)
			.where(eq(suppliersTable.isActive, true));

		return rows.map((r: any) => ({
			...mapToSupplier(r),
			outstandingBalance: Number(r.outstandingBalance || 0)
		}));
	}

	async getById(id: string): Promise<Supplier | null> {
		const rows = await this._db
			.select({
				id: suppliersTable.id,
				storeId: suppliersTable.storeId,
				name: suppliersTable.name,
				contactPhone: suppliersTable.contactPhone,
				address: suppliersTable.address,
				gstin: suppliersTable.gstin,
				isActive: suppliersTable.isActive,
				createdAt: suppliersTable.createdAt,
				updatedAt: suppliersTable.updatedAt,
				outstandingBalance: this._balanceSql()
			})
			.from(suppliersTable)
			.where(eq(suppliersTable.id, id))
			.limit(1);

		if (rows.length === 0) return null;
		return {
			...mapToSupplier(rows[0]),
			outstandingBalance: Number(rows[0].outstandingBalance || 0)
		};
	}

	async create(input: CreateSupplierInput): Promise<Supplier> {
		const id = uuidv4();
		const now = new Date();
		const stores = await this._db.select().from(storesTable).limit(1);
		const storeId = stores[0]?.id;

		const values = {
			id,
			storeId,
			name: input.name,
			contactPhone: input.phone || null,
			address: input.address || null,
			gstin: input.gstin || null,
			outstandingBalance: '0',
			isActive: true,
			createdAt: now,
			updatedAt: now
		};

		await pgDb.transaction(async (tx) => {
			await this._db.insert(suppliersTable).values(values as any);
			await logSyncOutbox(tx, 'suppliers', id, 'insert', values);
		});

		return this.getById(id) as Promise<Supplier>;
	}

	async update(id: string, input: Partial<CreateSupplierInput>): Promise<Supplier> {
		const updateData: any = { updatedAt: new Date() };
		if (input.name !== undefined) updateData.name = input.name;
		if (input.phone !== undefined) updateData.contactPhone = input.phone;
		if (input.address !== undefined) updateData.address = input.address;
		if (input.gstin !== undefined) updateData.gstin = input.gstin;

		await pgDb.transaction(async (tx) => {
			await this._db.update(suppliersTable).set(updateData).where(eq(suppliersTable.id, id));

			const updated = await this._db
				.select()
				.from(suppliersTable)
				.where(eq(suppliersTable.id, id))
				.limit(1);
			if (updated.length > 0) {
				await logSyncOutbox(tx, 'suppliers', id, 'update', updated[0]);
			}
		});

		return this.getById(id) as Promise<Supplier>;
	}

	async updateBalance(id: string, newBalance: number): Promise<Supplier> {
		await pgDb.transaction(async (tx) => {
			await tx
				.update(suppliersTable)
				.set({
					outstandingBalance: String(newBalance),
					updatedAt: new Date()
				})
				.where(eq(suppliersTable.id, id));

			await logSyncOutbox(tx, 'suppliers', id, 'update', {
				id,
				outstandingBalance: String(newBalance)
			});
		});

		return this.getById(id) as Promise<Supplier>;
	}

	async delete(id: string): Promise<void> {
		const updateData = {
			isActive: false,
			updatedAt: new Date()
		} as any;

		await pgDb.transaction(async (tx) => {
			await this._db.update(suppliersTable).set(updateData).where(eq(suppliersTable.id, id));

			const updated = await this._db
				.select()
				.from(suppliersTable)
				.where(eq(suppliersTable.id, id))
				.limit(1);
			if (updated.length > 0) {
				await logSyncOutbox(tx, 'suppliers', id, 'update', updated[0]);
			}
		});
	}

	async search(query: string): Promise<Supplier[]> {
		const search = `%${query}%`;
		const rows = await this._db
			.select({
				id: suppliersTable.id,
				storeId: suppliersTable.storeId,
				name: suppliersTable.name,
				contactPhone: suppliersTable.contactPhone,
				address: suppliersTable.address,
				gstin: suppliersTable.gstin,
				isActive: suppliersTable.isActive,
				createdAt: suppliersTable.createdAt,
				updatedAt: suppliersTable.updatedAt,
				outstandingBalance: this._balanceSql()
			})
			.from(suppliersTable)
			.where(
				and(
					eq(suppliersTable.isActive, true),
					or(
						ilike(suppliersTable.name, search),
						ilike(suppliersTable.contactPhone, search),
						ilike(suppliersTable.address, search),
						ilike(suppliersTable.gstin, search)
					)
				)
			);
		return rows.map((r: any) => ({
			...mapToSupplier(r),
			outstandingBalance: Number(r.outstandingBalance || 0)
		}));
	}
}
