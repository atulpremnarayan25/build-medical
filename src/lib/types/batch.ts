export type BatchStatus = 'healthy' | 'expiring-soon' | 'expired' | 'low-stock' | 'out-of-stock';

export interface Batch {
	id: string;
	productId: string;
	productName: string;
	batchNumber: string;
	expiryDate: string;
	quantity: number;
	mrp: number;
	purchaseRate: number;
	sellingRate: number;
	supplierId?: string;
	supplierName?: string;
	status: BatchStatus;
	createdAt: string;
}

export type CreateBatchInput = Omit<Batch, 'id' | 'status' | 'createdAt' | 'supplierName'>;
