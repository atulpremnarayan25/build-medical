import type { SupplierRepository } from '$lib/repositories/supplierRepository.js';
import type { Supplier, CreateSupplierInput } from '$lib/types/index.js';
import { suppliersTable } from '../db/schema.js';
import { eq, and, ilike, or } from 'drizzle-orm';
import { mapToSupplier } from '../db/mappers.js';
import { v4 as uuidv4 } from 'uuid';
import { db as pgDb } from '../db/index.js';
import { logSyncOutbox } from '../db/sync/outbox.js';

export class DbSupplierRepository implements SupplierRepository {
	private _db;

	constructor(database: any) {
		this._db = database;
	}

	async getAll(): Promise<Supplier[]> {
		const rows = await this._db
			.select()
			.from(suppliersTable)
			.where(eq(suppliersTable.isActive, true));

		return rows.map(mapToSupplier);
	}

	async getById(id: string): Promise<Supplier | null> {
		const rows = await this._db
			.select()
			.from(suppliersTable)
			.where(eq(suppliersTable.id, id))
			.limit(1);
		if (rows.length === 0) return null;
		return mapToSupplier(rows[0]);
	}

	async create(input: CreateSupplierInput): Promise<Supplier> {
		const id = uuidv4();
		const now = new Date();
		const _input = input as any;

		const values = {
			id,
			name: input.name,
			code: null as string | null,
			phone: input.phone || '',
			email: null as string | null,
			address: input.address || '',
			gstin: input.gstin || '',
			outstandingBalance: 0,
			active: true,
			createdAt: now.toISOString(),
			updatedAt: now.toISOString()
		};

		await pgDb.transaction(async (tx) => {
			await this._db.insert(suppliersTable).values(values as any);
			await logSyncOutbox(tx, 'suppliers', id, 'insert', values);
		});

		return this.getById(id) as Promise<Supplier>;
	}

	async update(id: string, input: Partial<CreateSupplierInput>): Promise<Supplier> {
		const updateData: any = { updatedAt: new Date().toISOString() };
		if (input.name !== undefined) updateData.name = input.name;
		if (input.phone !== undefined) updateData.phone = input.phone;
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
			active: false,
			updatedAt: new Date().toISOString()
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
			.select()
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
		return rows.map(mapToSupplier);
	}
}
