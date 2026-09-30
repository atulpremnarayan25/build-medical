import type { Purchase, CreatePurchaseInput } from '$lib/types/index.js';
import { unwrap } from './unwrap.js';

export const purchaseService = {
	async getPurchases(): Promise<Purchase[]> {
		const res = await fetch('/api/purchases');
		if (!res.ok) throw new Error('Failed to fetch purchases');
		return unwrap(res);
	},
	async getPurchase(id: string): Promise<Purchase | null> {
		const res = await fetch(`/api/purchases/${id}`);
		if (res.status === 404) return null;
		if (!res.ok) throw new Error('Failed to fetch purchase');
		return unwrap(res);
	},
	async getPurchasesBySupplier(supplierId: string): Promise<Purchase[]> {
		const res = await fetch(`/api/purchases?supplierId=${supplierId}`);
		if (!res.ok) throw new Error('Failed to fetch purchases');
		return unwrap(res);
	},
	async createPurchase(input: CreatePurchaseInput): Promise<Purchase> {
		const res = await fetch('/api/purchases', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input)
		});
		if (!res.ok) throw new Error('Failed to create purchase');
		return unwrap(res);
	},
	async cancelPurchase(id: string): Promise<Purchase> {
		const res = await fetch(`/api/purchases/${id}/cancel`, { method: 'POST' });
		if (!res.ok) throw new Error('Failed to cancel purchase');
		return unwrap(res);
	},
	async getDashboardSummary(): Promise<any> {
		const res = await fetch(`/api/purchases/summary`);
		return unwrap(res);
	}
};
