export type SaleStatus = 'draft' | 'confirmed' | 'cancelled' | 'returned';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'overdue' | 'credit';
export type PaymentMethod = 'cash' | 'bank' | 'upi' | 'cheque' | 'credit' | 'other';

export interface SaleItem {
	id: string;
	productId: string;
	productName: string;
	batchId: string;
	batchNumber: string;
	expiryDate: string;
	pack?: string;
	packSize?: number;
	quantity: number;
	freeQuantity?: number;
	schemeApplied?: string;
	mrp: number;
	rate: number;
	discount: number;
	taxableAmount: number;
	gstRate: number;
	gstAmount: number;
	totalAmount: number;
}

export interface Sale {
	id: string;
	invoiceNumber: string;
	date: string; // ISO Date YYYY-MM-DD
	customerId: string; // 'walk-in' or UUID
	customerName: string;
	saleType?: 'retail' | 'wholesale';
	// H1 fields
	patientName?: string;
	prescriberName?: string;
	prescriberRegNo?: string;
	items: SaleItem[];
	subtotal: number;
	discountTotal: number;
	taxableTotal: number;
	gstTotal: number;
	roundOff: number;
	grandTotal: number;
	paidAmount: number;
	dueAmount: number;
	paymentMethod: PaymentMethod;
	status: SaleStatus;
	paymentStatus: PaymentStatus;
	notes?: string;
	createdBy: string;
	createdAt: string;
	updatedAt: string;
}

export type CreateSaleItemInput = Omit<
	SaleItem,
	'id' | 'taxableAmount' | 'gstAmount' | 'totalAmount'
>;

export type CreateSaleInput = Omit<
	Sale,
	| 'id'
	| 'invoiceNumber'
	| 'paidAmount'
	| 'dueAmount'
	| 'paymentStatus'
	| 'createdAt'
	| 'updatedAt'
	| 'items'
> & {
	items: CreateSaleItemInput[];
};

/** Line shape expected by the billing engine endpoints (POST /api/sales, /api/sales/quote). */
export interface QuoteEngineLine {
	productId: string;
	quantity: number;
	batchId?: string;
	rate?: number;
	discount?: number;
}

/** Body accepted by POST /api/sales (billing engine commit). */
export interface CreateSaleApiInput {
	saleType: 'retail' | 'wholesale';
	customerId?: string | null;
	patientName?: string;
	prescriberName?: string;
	prescriberRegNo?: string;
	interState?: boolean;
	items: QuoteEngineLine[];
	amountPaidAtSaleRupees?: number;
	paymentMethod?: PaymentMethod;
	notes?: string;
}

/** Server-authoritative quote — FEFO allocation, pricing and GST computed by the backend. */
export interface SaleQuote {
	lines: {
		productId: string;
		productName: string;
		unitName: string;
		quantitySoldUnits: number;
		rateRupees: number;
		discountRupees: number;
		lineTotalRupees: number;
	}[];
	subtotalRupees: number;
	discountRupees: number;
	taxableTotalRupees: number;
	gstTotalRupees: number;
	roundOffRupees: number;
	grandTotalRupees: number;
	usedExpiredBatchOverride: boolean;
}
