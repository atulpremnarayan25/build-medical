import type { Sale, SaleQuote, QuoteEngineLine, CreateSaleApiInput } from '$lib/types/index.js';
import { unwrap } from './unwrap.js';

export interface QuoteSaleInput {
	saleType: 'retail' | 'wholesale';
	customerId?: string | null;
	interState?: boolean;
	items: QuoteEngineLine[];
}

export const saleService = {
	async getSales(): Promise<Sale[]> {
		const res = await fetch('/api/sales');
		if (!res.ok) throw new Error('Failed to fetch sales');
		return unwrap<Sale[]>(res);
	},
	async getSale(id: string): Promise<Sale | null> {
		const res = await fetch(`/api/sales/${id}`);
		if (res.status === 404) return null;
		if (!res.ok) throw new Error('Failed to fetch sale');
		return unwrap<Sale>(res);
	},
	async getSalesByCustomer(customerId: string): Promise<Sale[]> {
		const res = await fetch(`/api/sales?customerId=${customerId}`);
		if (!res.ok) throw new Error('Failed to fetch sales');
		return unwrap<Sale[]>(res);
	},
	/**
	 * Server-side FEFO quote — nothing persisted. The backend is authoritative
	 * for batch allocation, pricing, GST and totals (AGENTS.md boundary).
	 */
	async quoteSale(input: QuoteSaleInput): Promise<SaleQuote> {
		const res = await fetch('/api/sales/quote', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input)
		});
		return unwrap<SaleQuote>(res);
	},
	async createSale(input: CreateSaleApiInput): Promise<Sale> {
		const res = await fetch('/api/sales', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input)
		});
		return unwrap<Sale>(res);
	},
	async cancelSale(id: string): Promise<Sale> {
		const res = await fetch(`/api/sales/${id}/cancel`, { method: 'POST' });
		if (!res.ok) throw new Error('Failed to cancel sale');
		return unwrap<Sale>(res);
	},
	async getDashboardSummary(): Promise<any> {
		const res = await fetch(`/api/sales/summary`);
		return unwrap<any>(res);
	}
};
