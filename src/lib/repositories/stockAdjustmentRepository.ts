import type { StockAdjustment, CreateStockAdjustmentInput } from '$lib/types/index.js';

export interface StockAdjustmentRepository {
	getAll(): Promise<StockAdjustment[]>;
	getById(id: string): Promise<StockAdjustment | null>;
	create(input: CreateStockAdjustmentInput): Promise<StockAdjustment>;
}
