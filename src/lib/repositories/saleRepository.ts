import type { Sale, CreateSaleInput } from '$lib/types/index.js';

export interface SaleRepository {
	getAll(): Promise<Sale[]>;
	getById(id: string): Promise<Sale | null>;
	getByCustomerId(customerId: string): Promise<Sale[]>;
	create(input: CreateSaleInput): Promise<Sale>;
	update(id: string, input: Partial<Sale>): Promise<Sale>;
	updateStatus(id: string, status: Sale['status']): Promise<Sale>;
	updatePaymentStatus(id: string, status: Sale['paymentStatus'], paidAmount: number): Promise<Sale>;
	updatePaymentDetails(
		id: string,
		paidAmount: number,
		dueAmount: number,
		paymentStatus: Sale['paymentStatus']
	): Promise<Sale>;
	getByDateRange(from: string, to: string): Promise<Sale[]>;
}
