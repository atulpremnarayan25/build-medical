import type { Sale, CreateSaleInput, PaginatedResponse } from '$lib/types/index.js';

export interface SaleRepository {
	getAll(limit?: number, offset?: number): Promise<Sale[]>;
	getPaginated?(opts: {
		page?: number;
		limit?: number;
		customerId?: string;
		status?: string;
		search?: string;
		storeId?: string;
	}): Promise<PaginatedResponse<Sale>>;
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
	getDashboardSummary?(storeId?: string): Promise<{
		todaySalesCount: number;
		todaySalesTotal: number;
		todayItemsSold: number;
		totalReceivables: number;
	}>;
}
