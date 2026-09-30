import type { Payment, CreatePaymentInput } from '$lib/types/index.js';

export interface PaymentRepository {
	getAll(): Promise<Payment[]>;
	getById(id: string): Promise<Payment | null>;
	create(input: CreatePaymentInput): Promise<Payment>;
	getByPartyId(partyId: string): Promise<Payment[]>;
	getByDateRange(from: string, to: string): Promise<Payment[]>;
}
