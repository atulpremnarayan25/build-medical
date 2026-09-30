import { describe, it, expect } from 'vitest';
import { createBatchService } from './batchService.js';
import type { BatchRepository } from '$lib/repositories/batchRepository.js';
import type { Batch } from '$lib/types/index.js';

function makeBatch(overrides: Partial<Batch> = {}): Batch {
	return {
		id: 'batch-1',
		productId: 'p-1',
		productName: 'Paracetamol',
		batchNumber: 'B001',
		expiryDate: '2027-01-01',
		quantity: 10,
		mrp: 40,
		purchaseRate: 30,
		sellingRate: 36,
		status: 'healthy',
		createdAt: new Date().toISOString(),
		...overrides
	};
}

describe('BatchService', () => {
	it('should count a product as out of stock only when all its batches are depleted', async () => {
		const batches = [
			makeBatch({ id: 'b1', productId: 'p-1', quantity: 0 }),
			makeBatch({ id: 'b2', productId: 'p-2', quantity: 0 }),
			makeBatch({ id: 'b3', productId: 'p-3', quantity: 5 })
		];
		const repo = { getAll: async () => batches } as unknown as BatchRepository;
		const service = createBatchService(repo);

		const count = await service.getOutOfStockProductCount();

		expect(count).toBe(2);
	});

	it('should not count a product as out of stock when its batches together hold stock', async () => {
		const batches = [
			makeBatch({ id: 'b1', productId: 'p-1', quantity: 2 }),
			makeBatch({ id: 'b2', productId: 'p-1', quantity: 4 }),
			makeBatch({ id: 'b3', productId: 'p-2', quantity: 0 })
		];
		const repo = { getAll: async () => batches } as unknown as BatchRepository;
		const service = createBatchService(repo);

		const count = await service.getOutOfStockProductCount();

		expect(count).toBe(1);
	});
});
