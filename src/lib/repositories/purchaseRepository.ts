import type { Purchase, CreatePurchaseInput, PaymentStatus } from '$lib/types/index.js';

export interface PurchaseRepository {
	getAll(): Promise<Purchase[]>;
	getById(id: string): Promise<Purchase | null>;
	create(input: CreatePurchaseInput): Promise<Purchase>;
	update(id: string, input: Partial<CreatePurchaseInput>): Promise<Purchase>;
	updatePaymentDetails(
		id: string,
		paidAmount: number,
		dueAmount: number,
		paymentStatus: PaymentStatus
	): Promise<Purchase>;
	getBySupplierId(supplierId: string): Promise<Purchase[]>;
	getByDateRange(from: string, to: string): Promise<Purchase[]>;
}
