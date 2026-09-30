import type { Product, CreateProductInput } from '$lib/types/index.js';

export interface ProductRepository {
	getAll(): Promise<Product[]>;
	getById(id: string): Promise<Product | null>;
	create(input: CreateProductInput): Promise<Product>;
	update(id: string, input: Partial<CreateProductInput>): Promise<Product>;
	delete(id: string): Promise<void>;
	search(query: string): Promise<Product[]>;
}
