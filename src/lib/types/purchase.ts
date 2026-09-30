import type { PaymentMethod, PaymentStatus } from './sale.js';

export type PurchaseStatus = 'draft' | 'confirmed' | 'cancelled' | 'returned';

export interface PurchaseItem {
	id: string;
	productId: string;
	productName: string;
	batchId?: string;
	batchNumber: string;
	expiryDate: string;
	quantity: number;
	freeQuantity: number;
	mrp: number;
	purchaseRate: number;
	discount: number;
	taxableAmount: number;
	gstRate: number;
	gstAmount: number;
	totalAmount: number;
}

export interface Purchase {
	id: string;
	invoiceNumber: string;
	invoiceDate: string;
	supplierId: string;
	supplierName: string;
	items: PurchaseItem[];
	subtotal: number;
	discountTotal: number;
	taxableTotal: number;
	gstTotal: number;
	roundOff: number;
	grandTotal: number;
	paidAmount: number;
	dueAmount: number;
	paymentMethod: PaymentMethod;
	status: PurchaseStatus;
	paymentStatus: PaymentStatus;
	notes?: string;
	createdBy: string;
	createdAt: string;
	updatedAt: string;
}

export type CreatePurchaseItemInput = Omit<
	PurchaseItem,
	'id' | 'taxableAmount' | 'gstAmount' | 'totalAmount'
>;

export type CreatePurchaseInput = Omit<
	Purchase,
	'id' | 'paidAmount' | 'dueAmount' | 'paymentStatus' | 'createdAt' | 'updatedAt' | 'items'
> & {
	items: CreatePurchaseItemInput[];
};
