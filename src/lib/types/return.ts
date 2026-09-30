export type ReturnType = 'sales_return' | 'purchase_return';

export interface ReturnItem {
	id: string;
	returnId: string;
	batchId: string;
	quantity: string | number;
	lineAmount: string | number;
}

export interface Return {
	id: string;
	returnType: ReturnType;
	originalSaleId: string | null;
	originalPurchaseId: string | null;
	reason: string;
	approvedBy: string | null;
	createdBy: string | null;
	createdAt: string;
	items?: ReturnItem[];
}

export interface CreateReturnItemInput {
	batchId: string;
	quantity: number;
	lineAmount: number;
}

export interface CreateReturnInput {
	returnType: ReturnType;
	originalSaleId?: string;
	originalPurchaseId?: string;
	reason: string;
	items: CreateReturnItemInput[];
}
