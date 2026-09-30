import type { CustomerRepository } from '$lib/repositories/customerRepository.js';
import type { Customer, CreateCustomerInput } from '$lib/types/index.js';
import { customersTable } from '../db/schema.js';
import { eq, and, ilike, or } from 'drizzle-orm';
import { mapToCustomer } from '../db/mappers.js';
import { v4 as uuidv4 } from 'uuid';
import { db as pgDb } from '../db/index.js';
import { logSyncOutbox } from '../db/sync/outbox.js';

export class DbCustomerRepository implements CustomerRepository {
	private _db;

	constructor(database: any) {
		this._db = database;
	}

	async getAll(): Promise<Customer[]> {
		const rows = await this._db
			.select()
			.from(customersTable)
			.where(eq(customersTable.isActive, true));

		return rows.map(mapToCustomer);
	}

	async getById(id: string): Promise<Customer | null> {
		const rows = await this._db
			.select()
			.from(customersTable)
			.where(eq(customersTable.id, id))
			.limit(1);
		if (rows.length === 0) return null;
		return mapToCustomer(rows[0]);
	}

	async create(input: CreateCustomerInput): Promise<Customer> {
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
			creditLimit: input.creditLimit ? Number(input.creditLimit) : 0,
			outstandingBalance: 0,
			active: true,
			createdAt: now.toISOString(),
			updatedAt: now.toISOString()
		};

		await pgDb.transaction(async (tx) => {
			await this._db.insert(customersTable).values(values as any);
			await logSyncOutbox(tx, 'customers', id, 'insert', values);
		});

		return this.getById(id) as Promise<Customer>;
	}

	async update(id: string, input: Partial<CreateCustomerInput>): Promise<Customer> {
		const updateData: any = { updatedAt: new Date().toISOString() };
		if (input.name !== undefined) updateData.name = input.name;
		if (input.phone !== undefined) updateData.phone = input.phone;
		if (input.address !== undefined) updateData.address = input.address;
		if (input.gstin !== undefined) updateData.gstin = input.gstin;
		if (input.creditLimit !== undefined) updateData.creditLimit = Number(input.creditLimit);

		await pgDb.transaction(async (tx) => {
			await this._db.update(customersTable).set(updateData).where(eq(customersTable.id, id));

			const updated = await this._db
				.select()
				.from(customersTable)
				.where(eq(customersTable.id, id))
				.limit(1);
			if (updated.length > 0) {
				await logSyncOutbox(tx, 'customers', id, 'update', updated[0]);
			}
		});

		return this.getById(id) as Promise<Customer>;
	}

	async updateBalance(id: string, newBalance: number): Promise<Customer> {
		// outstandingBalance is dynamically calculated in Postgres schema.
		return this.getById(id) as Promise<Customer>;
	}

	async delete(id: string): Promise<void> {
		const updateData = {
			active: false,
			updatedAt: new Date().toISOString()
		} as any;

		await pgDb.transaction(async (tx) => {
			await this._db.update(customersTable).set(updateData).where(eq(customersTable.id, id));

			const updated = await this._db
				.select()
				.from(customersTable)
				.where(eq(customersTable.id, id))
				.limit(1);
			if (updated.length > 0) {
				await logSyncOutbox(tx, 'customers', id, 'update', updated[0]);
			}
		});
	}

	async search(query: string): Promise<Customer[]> {
		const search = `%${query}%`;
		const rows = await this._db
			.select()
			.from(customersTable)
			.where(
				and(
					eq(customersTable.isActive, true),
					or(
						ilike(customersTable.name, search),
						ilike(customersTable.contactPhone, search),
						ilike(customersTable.address, search),
						ilike(customersTable.gstin, search)
					)
				)
			);
		return rows.map(mapToCustomer);
	}
}
