import type { ProductRepository } from '$lib/repositories/productRepository.js';
import type { Product, CreateProductInput } from '$lib/types/index.js';

export function createProductService(repo: ProductRepository) {
	return {
		async getProducts(): Promise<Product[]> {
			return repo.getAll();
		},

		async getProduct(id: string): Promise<Product | null> {
			return repo.getById(id);
		},

		async createProduct(input: CreateProductInput): Promise<Product> {
			return repo.create(input);
		},

		async updateProduct(id: string, input: Partial<CreateProductInput>): Promise<Product> {
			return repo.update(id, input);
		},

		async deleteProduct(id: string): Promise<void> {
			return repo.delete(id);
		},

		async searchProducts(query: string): Promise<Product[]> {
			return repo.search(query);
		}
	};
}
