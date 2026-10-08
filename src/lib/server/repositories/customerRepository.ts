import type { CustomerRepository } from '$lib/repositories/customerRepository.js';
import type { Customer, CreateCustomerInput } from '$lib/types/index.js';
import { customersTable, storesTable } from '../db/schema.js';
import { eq, and, ilike, or, sql } from 'drizzle-orm';
import { mapToCustomer } from '../db/mappers.js';
import { v4 as uuidv4 } from 'uuid';
import { db as pgDb } from '../db/index.js';
import { logSyncOutbox } from '../db/sync/outbox.js';

export class DbCustomerRepository implements CustomerRepository {
	private _db;

	constructor(database: any) {
		this._db = database;
	}

	private _balanceSql() {
		return sql<string>`(
			COALESCE((SELECT SUM(CAST(total_amount AS NUMERIC)) FROM sales WHERE sales.customer_id = customers.id), 0)
			- COALESCE((SELECT SUM(CAST(amount AS NUMERIC)) FROM payments WHERE payments.customer_id = customers.id AND payments.direction = 'customer_payment'), 0)
			- COALESCE((
				SELECT SUM(CAST(ri.line_amount AS NUMERIC))
				FROM returns r
				JOIN return_items ri ON r.id = ri.return_id
				JOIN sales s ON r.original_sale_id = s.id
				WHERE s.customer_id = customers.id AND r.return_type = 'sales_return'
			), 0)
		)`;
	}

	async getAll(): Promise<Customer[]> {
		const rows = await this._db
			.select({
				id: customersTable.id,
				storeId: customersTable.storeId,
				name: customersTable.name,
				contactPhone: customersTable.contactPhone,
				address: customersTable.address,
				gstin: customersTable.gstin,
				customerType: customersTable.customerType,
				creditLimit: customersTable.creditLimit,
				isActive: customersTable.isActive,
				createdAt: customersTable.createdAt,
				updatedAt: customersTable.updatedAt,
				outstandingBalance: this._balanceSql()
			})
			.from(customersTable)
			.where(eq(customersTable.isActive, true));

		return rows.map((r: any) => ({
			...mapToCustomer(r),
			outstandingBalance: Number(r.outstandingBalance || 0)
		}));
	}

	async getById(id: string): Promise<Customer | null> {
		const rows = await this._db
			.select({
				id: customersTable.id,
				storeId: customersTable.storeId,
				name: customersTable.name,
				contactPhone: customersTable.contactPhone,
				address: customersTable.address,
				gstin: customersTable.gstin,
				customerType: customersTable.customerType,
				creditLimit: customersTable.creditLimit,
				isActive: customersTable.isActive,
				createdAt: customersTable.createdAt,
				updatedAt: customersTable.updatedAt,
				outstandingBalance: this._balanceSql()
			})
			.from(customersTable)
			.where(eq(customersTable.id, id))
			.limit(1);

		if (rows.length === 0) return null;
		return {
			...mapToCustomer(rows[0]),
			outstandingBalance: Number(rows[0].outstandingBalance || 0)
		};
	}

	async create(input: CreateCustomerInput): Promise<Customer> {
		const id = uuidv4();
		const stores = await this._db.select().from(storesTable).limit(1);
		const storeId = stores[0]?.id;

		const values: any = {
			id,
			storeId,
			name: input.name,
			contactPhone: input.phone || null,
			address: input.address || null,
			gstin: input.gstin || null,
			creditLimit: input.creditLimit !== undefined ? String(input.creditLimit) : '0',
			customerType: 'retail',
			isActive: true
		};

		await pgDb.transaction(async (tx) => {
			await this._db.insert(customersTable).values(values);
			await logSyncOutbox(tx, 'customers', id, 'insert', values);
		});

		return this.getById(id) as Promise<Customer>;
	}

	async update(id: string, input: Partial<CreateCustomerInput>): Promise<Customer> {
		const updateData: any = { updatedAt: new Date() };
		if (input.name !== undefined) updateData.name = input.name;
		if (input.phone !== undefined) updateData.contactPhone = input.phone;
		if (input.address !== undefined) updateData.address = input.address;
		if (input.gstin !== undefined) updateData.gstin = input.gstin;
		if (input.creditLimit !== undefined) updateData.creditLimit = String(input.creditLimit);

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
		// outstandingBalance is dynamically calculated in Postgres schema from transactions.
		return this.getById(id) as Promise<Customer>;
	}

	async delete(id: string): Promise<void> {
		const updateData = {
			isActive: false,
			updatedAt: new Date()
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
			.select({
				id: customersTable.id,
				storeId: customersTable.storeId,
				name: customersTable.name,
				contactPhone: customersTable.contactPhone,
				address: customersTable.address,
				gstin: customersTable.gstin,
				customerType: customersTable.customerType,
				creditLimit: customersTable.creditLimit,
				isActive: customersTable.isActive,
				createdAt: customersTable.createdAt,
				updatedAt: customersTable.updatedAt,
				outstandingBalance: this._balanceSql()
			})
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
		return rows.map((r: any) => ({
			...mapToCustomer(r),
			outstandingBalance: Number(r.outstandingBalance || 0)
		}));
	}
}
