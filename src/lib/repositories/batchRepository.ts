import type { Batch, CreateBatchInput } from '$lib/types/index.js';

export interface BatchRepository {
	getAll(): Promise<Batch[]>;
	getByProductId(productId: string): Promise<Batch[]>;
	getById(id: string): Promise<Batch | null>;
	create(input: CreateBatchInput): Promise<Batch>;
	update(id: string, input: Partial<CreateBatchInput>): Promise<Batch>;
	getExpiring(days: number): Promise<Batch[]>;
	getExpired(): Promise<Batch[]>;
	getLowStock(threshold: number): Promise<Batch[]>;
}
