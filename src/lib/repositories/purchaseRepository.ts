import type { Purchase, CreatePurchaseInput, PaymentStatus, PaginatedResponse } from '$lib/types/index.js';

export interface PurchaseRepository {
	getAll(limit?: number, offset?: number): Promise<Purchase[]>;
	getPaginated?(opts: {
		page?: number;
		limit?: number;
		supplierId?: string;
		status?: string;
		search?: string;
		storeId?: string;
	}): Promise<PaginatedResponse<Purchase>>;
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
	getDashboardSummary?(storeId?: string): Promise<{
		todayPurchasesCount: number;
		todayPurchasesTotal: number;
		totalPayables: number;
	}>;
}
