import type { PaymentRepository } from '$lib/repositories/paymentRepository.js';
import type { Payment, CreatePaymentInput } from '$lib/types/index.js';
import { paymentsTable, storesTable, usersTable } from '$lib/server/db/schema.js';
import { eq, desc, and, gte, lte, or } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db as pgDb } from '$lib/server/db/index.js';
import { logSyncOutbox } from '$lib/server/db/sync/outbox.js';

export class DbPaymentRepository implements PaymentRepository {
	private _db;

	constructor(database: any) {
		this._db = database;
	}

	private _mapPayment(r: any): Payment {
		return {
			id: r.id,
			type: r.direction === 'customer_payment' ? 'received' : 'made',
			partyId: r.customerId || r.supplierId || '',
			partyName: '',
			partyType: r.direction === 'customer_payment' ? 'customer' : 'supplier',
			invoiceId: r.relatedSaleId || undefined,
			amount: Number(r.amount || 0),
			paymentMethod: r.method || 'cash',
			reference: r.notes || undefined,
			date: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
			notes: r.notes || undefined,
			createdBy: r.createdBy || '',
			createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString()
		};
	}

	async getAll(): Promise<Payment[]> {
		const rows = await this._db.select().from(paymentsTable).orderBy(desc(paymentsTable.createdAt));
		return rows.map((r: any) => this._mapPayment(r));
	}

	async getById(id: string): Promise<Payment | null> {
		const rows = await this._db
			.select()
			.from(paymentsTable)
			.where(eq(paymentsTable.id, id))
			.limit(1);
		if (rows.length === 0) return null;
		return this._mapPayment(rows[0]);
	}

	async getByPartyId(partyId: string): Promise<Payment[]> {
		const rows = await this._db
			.select()
			.from(paymentsTable)
			.where(or(eq(paymentsTable.customerId, partyId), eq(paymentsTable.supplierId, partyId)))
			.orderBy(desc(paymentsTable.createdAt));
		return rows.map((r: any) => this._mapPayment(r));
	}

	async getByDateRange(from: string, to: string): Promise<Payment[]> {
		const rows = await this._db
			.select()
			.from(paymentsTable)
			.where(
				and(
					gte(paymentsTable.createdAt, new Date(from)),
					lte(paymentsTable.createdAt, new Date(to))
				)
			)
			.orderBy(desc(paymentsTable.createdAt));
		return rows.map((r: any) => this._mapPayment(r));
	}

	async create(input: CreatePaymentInput): Promise<Payment> {
		const id = uuidv4();
		const now = new Date();

		const _input = input as any;

		// Correctly determine direction: customer payment receipt vs supplier disbursement
		const isCustomer =
			_input.partyType === 'customer' ||
			_input.type === 'received' ||
			_input.type === 'in' ||
			Boolean(_input.customerId);

		const direction = isCustomer ? 'customer_payment' : 'supplier_payment';
		const customerId = isCustomer ? (_input.partyId || _input.customerId || null) : null;
		const supplierId = !isCustomer ? (_input.partyId || _input.supplierId || null) : null;

		// Resolve valid storeId
		let storeId = _input.storeId;
		if (!storeId || storeId === '00000000-0000-0000-0000-000000000000') {
			const [firstStore] = await this._db.select({ id: storesTable.id }).from(storesTable).limit(1);
			storeId = firstStore?.id;
		}

		// Resolve valid createdBy
		let createdBy = _input.createdBy;
		if (!createdBy || createdBy === '00000000-0000-0000-0000-000000000000') {
			const [firstUser] = await this._db.select({ id: usersTable.id }).from(usersTable).limit(1);
			createdBy = firstUser?.id || null;
		}

		const method = (_input.paymentMethod || _input.method || 'cash').toLowerCase();
		const notes = _input.notes || _input.reference || _input.referenceNumber || null;
		const relatedSaleId = _input.invoiceId || _input.relatedSaleId || null;

		const values = {
			id,
			storeId,
			direction,
			customerId,
			supplierId,
			amount: String(_input.amount || 0),
			method,
			relatedSaleId,
			notes,
			createdBy,
			createdAt: now
		};

		await pgDb.transaction(async (tx) => {
			await tx.insert(paymentsTable).values(values as any);
			await logSyncOutbox(tx, 'payments', id, 'insert', values);
		});

		return this.getById(id) as Promise<Payment>;
	}
}
