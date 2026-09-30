export interface GSTSummaryRow {
	gstRate: number;
	taxableAmount: number;
	cgstAmount: number;
	sgstAmount: number;
	totalAmount: number;
}

export interface GSTReportResponse {
	from: string;
	to: string;
	sales: GSTSummaryRow[];
	purchases: GSTSummaryRow[];
}

export interface SalesReportRow {
	date: string;
	invoiceNumber: string;
	customerName: string;
	subtotal: number;
	gstAmount: number;
	totalAmount: number;
}

export interface StockReportRow {
	productId: string;
	productName: string;
	category: string | null;
	batchesCount: number;
	stockLevel: number;
	totalValue: number;
}
