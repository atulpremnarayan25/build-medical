import type { Product, CreateProductInput } from '$lib/types/index.js';
import { unwrap } from './unwrap.js';

export const productService = {
	async getProducts(): Promise<Product[]> {
		const res = await fetch('/api/products');
		if (!res.ok) throw new Error('Failed to fetch products');
		return unwrap(res);
	},
	async getProduct(id: string): Promise<Product | null> {
		const res = await fetch(`/api/products/${id}`);
		if (res.status === 404) return null;
		if (!res.ok) throw new Error('Failed to fetch product');
		return unwrap(res);
	},
	async createProduct(input: CreateProductInput): Promise<Product> {
		const res = await fetch('/api/products', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input)
		});
		if (!res.ok) throw new Error('Failed to create product');
		return unwrap(res);
	},
	async updateProduct(id: string, input: Partial<CreateProductInput>): Promise<Product> {
		const res = await fetch(`/api/products/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input)
		});
		if (!res.ok) throw new Error('Failed to update product');
		return unwrap(res);
	},
	async deleteProduct(id: string): Promise<void> {
		const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
		if (!res.ok) throw new Error('Failed to delete product');
	},
	async searchProducts(query: string): Promise<Product[]> {
		const res = await fetch(`/api/products?search=${encodeURIComponent(query)}`);
		if (!res.ok) throw new Error('Failed to search products');
		return unwrap(res);
	}
};
