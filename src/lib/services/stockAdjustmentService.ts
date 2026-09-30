import type { StockAdjustmentRepository } from '$lib/repositories/stockAdjustmentRepository.js';
import type { StockAdjustment, CreateStockAdjustmentInput } from '$lib/types/index.js';

export function createStockAdjustmentService(repo: StockAdjustmentRepository) {
	return {
		async getStockAdjustments(): Promise<StockAdjustment[]> {
			return repo.getAll();
		},

		async getStockAdjustment(id: string): Promise<StockAdjustment | null> {
			return repo.getById(id);
		},

		async createStockAdjustment(input: CreateStockAdjustmentInput): Promise<StockAdjustment> {
			return repo.create(input);
		}
	};
}
