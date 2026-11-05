import type { Batch, CreateBatchInput } from '$lib/types/index.js';
import { unwrap } from './unwrap.js';
import { apiFetch } from './httpClient.js';

export const batchService = {
	async getBatches(): Promise<Batch[]> {
		const res = await apiFetch('/api/batches');
		if (!res.ok) throw new Error('Failed to fetch batches');
		return unwrap(res);
	},
	async getActiveBatchesByProduct(productId: string): Promise<Batch[]> {
		const res = await apiFetch(`/api/batches?productId=${productId}&active=true`);
		if (!res.ok) throw new Error('Failed to fetch batches');
		return unwrap(res);
	},
	async getBatchesByProduct(productId: string): Promise<Batch[]> {
		const res = await apiFetch(`/api/batches?productId=${productId}`);
		if (!res.ok) throw new Error('Failed to fetch batches');
		return unwrap(res);
	},
	async createBatch(input: CreateBatchInput): Promise<Batch> {
		const res = await apiFetch('/api/batches', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input)
		});
		if (!res.ok) throw new Error('Failed to create batch');
		return unwrap(res);
	},
	async updateBatch(id: string, input: Partial<CreateBatchInput>): Promise<Batch> {
		const res = await apiFetch(`/api/batches/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input)
		});
		if (!res.ok) throw new Error('Failed to update batch');
		return unwrap(res);
	},
	async getLowStockBatches(threshold: number): Promise<Batch[]> {
		const res = await apiFetch(`/api/batches/summary?type=low-stock&threshold=${threshold}`);
		return unwrap(res);
	},
	async getExpiredBatches(): Promise<Batch[]> {
		const res = await apiFetch(`/api/batches/summary?type=expired`);
		return unwrap(res);
	},
	async getExpiringBatches(days: number): Promise<Batch[]> {
		const res = await apiFetch(`/api/batches/summary?type=expiring&days=${days}`);
		return unwrap(res);
	},
	async getOutOfStockProductCount(): Promise<number> {
		const res = await apiFetch(`/api/batches/summary?type=out-of-stock-count`);
		return unwrap(res);
	}
};

export const inventoryService = batchService; // Alias
