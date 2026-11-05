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
		},

		async getProductByBarcode(barcode: string, storeId?: string): Promise<Product | null> {
			if (repo.getByBarcode) {
				return repo.getByBarcode(barcode, storeId);
			}
			const all = await repo.getAll();
			return all.find((p) => p.barcode === barcode && (!storeId || (p as any).storeId === storeId)) || null;
		},

		async getPaginatedProducts(opts: {
			page?: number;
			limit?: number;
			search?: string;
			category?: string;
			storeId?: string;
		}) {
			if (repo.getPaginated) {
				return repo.getPaginated(opts);
			}
			const all = await repo.getAll();
			let filtered = all;
			if (opts.search) {
				const q = opts.search.toLowerCase();
				filtered = filtered.filter(
					(p) =>
						p.name.toLowerCase().includes(q) ||
						(p.genericName && p.genericName.toLowerCase().includes(q))
				);
			}
			if (opts.category) {
				filtered = filtered.filter((p) => p.category === opts.category);
			}
			const page = Math.max(1, opts.page || 1);
			const limit = Math.max(1, Math.min(100, opts.limit || 50));
			const total = filtered.length;
			const totalPages = Math.ceil(total / limit) || 1;
			const items = filtered.slice((page - 1) * limit, page * limit);
			return { items, total, page, limit, totalPages };
		}
	};
}
