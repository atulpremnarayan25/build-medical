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
			code: input.code || null,
			contactPhone: input.phone || null,
			telephone: input.telephone || null,
			mobileSms: input.mobileSms || null,
			address: input.address || null,
			city: input.city || null,
			pinCode: input.pinCode || null,
			gstin: input.gstin || null,
			stateCode: input.stateCode || null,
			stateName: input.stateName || null,
			panNo: input.panNo || null,
			drugLicenseNo1: input.drugLicenseNo1 || null,
			drugLicenseNo2: input.drugLicenseNo2 || null,
			drugLicenseExpiry: input.drugLicenseExpiry || null,
			fssaiLicenseNo: input.fssaiLicenseNo || null,
			isComposite: input.isComposite ?? false,
			billSeries: input.billSeries || 'T',
			salesRep: input.salesRep || null,
			creditLimit: input.creditLimit !== undefined ? String(input.creditLimit) : '0',
			creditDays: input.creditDays !== undefined ? input.creditDays : 30,
			openingBalance: input.openingBalance !== undefined ? String(input.openingBalance) : '0',
			defaultAddAmount: input.defaultAddAmount !== undefined ? String(input.defaultAddAmount) : '0',
			defaultAddDetail: input.defaultAddDetail || null,
			defaultLessAmount: input.defaultLessAmount !== undefined ? String(input.defaultLessAmount) : '0',
			defaultLessDetail: input.defaultLessDetail || null,
			contactPerson: input.contactPerson || null,
			remarks: input.remarks || null,
			customerType: input.customerType || (input.gstin ? 'wholesale' : 'retail'),
			isActive: input.active !== undefined ? input.active : true
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
		if (input.code !== undefined) updateData.code = input.code;
		if (input.phone !== undefined) updateData.contactPhone = input.phone;
		if (input.telephone !== undefined) updateData.telephone = input.telephone;
		if (input.mobileSms !== undefined) updateData.mobileSms = input.mobileSms;
		if (input.address !== undefined) updateData.address = input.address;
		if (input.city !== undefined) updateData.city = input.city;
		if (input.pinCode !== undefined) updateData.pinCode = input.pinCode;
		if (input.gstin !== undefined) updateData.gstin = input.gstin;
		if (input.stateCode !== undefined) updateData.stateCode = input.stateCode;
		if (input.stateName !== undefined) updateData.stateName = input.stateName;
		if (input.panNo !== undefined) updateData.panNo = input.panNo;
		if (input.drugLicenseNo1 !== undefined) updateData.drugLicenseNo1 = input.drugLicenseNo1;
		if (input.drugLicenseNo2 !== undefined) updateData.drugLicenseNo2 = input.drugLicenseNo2;
		if (input.drugLicenseExpiry !== undefined) updateData.drugLicenseExpiry = input.drugLicenseExpiry;
		if (input.fssaiLicenseNo !== undefined) updateData.fssaiLicenseNo = input.fssaiLicenseNo;
		if (input.isComposite !== undefined) updateData.isComposite = input.isComposite;
		if (input.billSeries !== undefined) updateData.billSeries = input.billSeries;
		if (input.salesRep !== undefined) updateData.salesRep = input.salesRep;
		if (input.creditLimit !== undefined) updateData.creditLimit = String(input.creditLimit);
		if (input.creditDays !== undefined) updateData.creditDays = input.creditDays;
		if (input.openingBalance !== undefined) updateData.openingBalance = String(input.openingBalance);
		if (input.defaultAddAmount !== undefined) updateData.defaultAddAmount = String(input.defaultAddAmount);
		if (input.defaultAddDetail !== undefined) updateData.defaultAddDetail = input.defaultAddDetail;
		if (input.defaultLessAmount !== undefined) updateData.defaultLessAmount = String(input.defaultLessAmount);
		if (input.defaultLessDetail !== undefined) updateData.defaultLessDetail = input.defaultLessDetail;
		if (input.contactPerson !== undefined) updateData.contactPerson = input.contactPerson;
		if (input.remarks !== undefined) updateData.remarks = input.remarks;
		if (input.customerType !== undefined) updateData.customerType = input.customerType;
		if (input.active !== undefined) updateData.isActive = input.active;

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
