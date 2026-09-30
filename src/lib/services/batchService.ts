import type { BatchRepository } from '$lib/repositories/batchRepository.js';
import type { Batch, CreateBatchInput } from '$lib/types/index.js';

export function createBatchService(repo: BatchRepository) {
	return {
		async getBatches(): Promise<Batch[]> {
			return repo.getAll();
		},

		async getBatchesByProduct(productId: string): Promise<Batch[]> {
			return repo.getByProductId(productId);
		},

		async getBatch(id: string): Promise<Batch | null> {
			return repo.getById(id);
		},

		async createBatch(input: CreateBatchInput): Promise<Batch> {
			return repo.create(input);
		},

		async updateBatch(id: string, input: Partial<CreateBatchInput>): Promise<Batch> {
			return repo.update(id, input);
		},

		async getExpiringBatches(days: number): Promise<Batch[]> {
			return repo.getExpiring(days);
		},

		async getExpiredBatches(): Promise<Batch[]> {
			return repo.getExpired();
		},

		async getLowStockBatches(threshold: number): Promise<Batch[]> {
			return repo.getLowStock(threshold);
		},

		async getOutOfStockProductCount(): Promise<number> {
			const allBatches = await repo.getAll();
			const productIds = new Set(allBatches.map((b) => b.productId));

			const productStock: Record<string, number> = {};
			for (const id of productIds) productStock[id] = 0;

			for (const b of allBatches) {
				productStock[b.productId] += b.quantity;
			}

			return Object.values(productStock).filter((qty) => qty <= 0).length;
		}
	};
}
