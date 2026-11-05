import type { Product, CreateProductInput, PaginatedResponse } from '$lib/types/index.js';

export interface ProductRepository {
	getAll(): Promise<Product[]>;
	getPaginated?(opts: {
		page?: number;
		limit?: number;
		search?: string;
		category?: string;
		storeId?: string;
	}): Promise<PaginatedResponse<Product>>;
	getById(id: string): Promise<Product | null>;
	create(input: CreateProductInput): Promise<Product>;
	update(id: string, input: Partial<CreateProductInput>): Promise<Product>;
	delete(id: string): Promise<void>;
	search(query: string): Promise<Product[]>;
	getByBarcode?(barcode: string, storeId?: string): Promise<Product | null>;
}
