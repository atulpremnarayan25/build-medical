import type { PaymentRepository } from '$lib/repositories/paymentRepository.js';
import type { Payment, CreatePaymentInput } from '$lib/types/index.js';
import { paymentsTable } from '$lib/server/db/schema.js';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export class DbPaymentRepository implements PaymentRepository {
	private _db;

	constructor(database: any) {
		this._db = database;
	}

	async getAll(): Promise<Payment[]> {
		const rows = await this._db.select().from(paymentsTable).orderBy(desc(paymentsTable.createdAt));
		return rows.map((r: any) => ({
			...r,
			type: r.direction === 'customer_payment' ? 'in' : 'out',
			partyId: r.customerId || r.supplierId,
			amount: Number(r.amount),
			date: r.createdAt.toISOString()
		})) as Payment[];
	}

	async getById(id: string): Promise<Payment | null> {
		const rows = await this._db
			.select()
			.from(paymentsTable)
			.where(eq(paymentsTable.id, id))
			.limit(1);
		if (rows.length === 0) return null;
		const r = rows[0] as any;
		return {
			...r,
			type: r.direction === 'customer_payment' ? 'in' : 'out',
			partyId: r.customerId || r.supplierId,
			amount: Number(r.amount),
			date: r.createdAt.toISOString()
		} as Payment;
	}

	async getByPartyId(partyId: string): Promise<Payment[]> {
		const { or } = await import('drizzle-orm');
		const rows = await this._db
			.select()
			.from(paymentsTable)
			.where(or(eq(paymentsTable.customerId, partyId), eq(paymentsTable.supplierId, partyId)))
			.orderBy(desc(paymentsTable.createdAt));
		return rows.map((r: any) => ({
			...r,
			type: r.direction === 'customer_payment' ? 'in' : 'out',
			partyId: r.customerId || r.supplierId,
			amount: Number(r.amount),
			date: r.createdAt.toISOString()
		})) as Payment[];
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
		return rows.map((r: any) => ({
			...r,
			type: r.direction === 'customer_payment' ? 'in' : 'out',
			partyId: r.customerId || r.supplierId,
			amount: Number(r.amount),
			date: r.createdAt.toISOString()
		})) as Payment[];
	}

	async create(input: CreatePaymentInput): Promise<Payment> {
		const id = uuidv4();
		const now = new Date();

		const _input = input as any;

		const direction = _input.type === 'in' ? 'customer_payment' : 'supplier_payment';
		const customerId = _input.type === 'in' ? _input.partyId : null;
		const supplierId = _input.type === 'out' ? _input.partyId : null;

		await this._db.insert(paymentsTable).values({
			id,
			storeId: '00000000-0000-0000-0000-000000000000', // Mock
			direction,
			customerId,
			supplierId,
			amount: String(_input.amount || 0),
			method: 'cash', // Fallback
			notes: _input.notes || null,
			createdBy: '00000000-0000-0000-0000-000000000000', // Mock user
			createdAt: now
		});

		return this.getById(id) as Promise<Payment>;
	}
}
