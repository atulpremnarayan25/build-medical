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
	dealScheme?: string;
	packSize?: number;
	unit?: string;
	baseQuantity?: number;
	mrp: number;
	purchaseRate: number;
	effectiveRate?: number;
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
> & {
	taxableAmount?: number;
	gstAmount?: number;
	totalAmount?: number;
};

export type CreatePurchaseInput = Omit<
	Purchase,
	'id' | 'createdAt' | 'updatedAt' | 'items' | 'paidAmount' | 'dueAmount' | 'paymentStatus'
> & {
	items: CreatePurchaseItemInput[];
	paidAmount?: number;
	dueAmount?: number;
	paymentStatus?: PaymentStatus;
};
