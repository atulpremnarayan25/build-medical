import type { Product, CreateProductInput, PaginatedResponse } from '$lib/types/index.js';
import { unwrap } from './unwrap.js';
import { apiFetch } from './httpClient.js';

export const productService = {
	async getProducts(): Promise<Product[]> {
		const res = await apiFetch('/api/products');
		if (!res.ok) throw new Error('Failed to fetch products');
		return unwrap(res);
	},
	async getPaginatedProducts(opts?: {
		page?: number;
		limit?: number;
		search?: string;
		category?: string;
	}): Promise<PaginatedResponse<Product>> {
		const params = new URLSearchParams();
		if (opts?.page) params.set('page', String(opts.page));
		if (opts?.limit) params.set('limit', String(opts.limit));
		if (opts?.search) params.set('search', opts.search);
		if (opts?.category) params.set('category', opts.category);
		const url = `/api/products${params.toString() ? '?' + params.toString() : ''}`;
		const res = await apiFetch(url);
		if (!res.ok) throw new Error('Failed to fetch paginated products');
		return unwrap<PaginatedResponse<Product>>(res);
	},
	async getProduct(id: string): Promise<Product | null> {
		const res = await apiFetch(`/api/products/${id}`);
		if (res.status === 404) return null;
		if (!res.ok) throw new Error('Failed to fetch product');
		return unwrap(res);
	},
	async createProduct(input: CreateProductInput): Promise<Product> {
		const res = await apiFetch('/api/products', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input)
		});
		if (!res.ok) throw new Error('Failed to create product');
		return unwrap(res);
	},
	async updateProduct(id: string, input: Partial<CreateProductInput>): Promise<Product> {
		const res = await apiFetch(`/api/products/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input)
		});
		if (!res.ok) throw new Error('Failed to update product');
		return unwrap(res);
	},
	async deleteProduct(id: string): Promise<void> {
		const res = await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
		if (!res.ok) throw new Error('Failed to delete product');
	},
	async searchProducts(query: string): Promise<Product[]> {
		const res = await apiFetch(`/api/products?search=${encodeURIComponent(query)}`);
		if (!res.ok) throw new Error('Failed to search products');
		return unwrap(res);
	},
	async getProductByBarcode(barcode: string): Promise<Product | null> {
		const res = await apiFetch(`/api/products?barcode=${encodeURIComponent(barcode)}`);
		if (res.status === 404) return null;
		if (!res.ok) throw new Error('Failed to fetch product by barcode');
		return unwrap(res);
	}
};
