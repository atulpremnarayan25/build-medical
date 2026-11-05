import type { Supplier, CreateSupplierInput } from '$lib/types/index.js';
import { unwrap } from './unwrap.js';
import { apiFetch } from './httpClient.js';

export const supplierService = {
	async getSuppliers(): Promise<Supplier[]> {
		const res = await apiFetch('/api/suppliers');
		if (!res.ok) throw new Error('Failed to fetch suppliers');
		return unwrap(res);
	},
	async getSupplier(id: string): Promise<Supplier | null> {
		const res = await apiFetch(`/api/suppliers/${id}`);
		if (res.status === 404) return null;
		if (!res.ok) throw new Error('Failed to fetch supplier');
		return unwrap(res);
	},
	async createSupplier(input: CreateSupplierInput): Promise<Supplier> {
		const res = await apiFetch('/api/suppliers', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input)
		});
		if (!res.ok) throw new Error('Failed to create supplier');
		return unwrap(res);
	},
	async updateSupplier(id: string, input: Partial<CreateSupplierInput>): Promise<Supplier> {
		const res = await apiFetch(`/api/suppliers/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input)
		});
		if (!res.ok) throw new Error('Failed to update supplier');
		return unwrap(res);
	},
	async updateSupplierBalance(id: string, newBalance: number): Promise<Supplier> {
		throw new Error('Not supposed to be called from client directly');
	},
	async deleteSupplier(id: string): Promise<void> {
		const res = await apiFetch(`/api/suppliers/${id}`, { method: 'DELETE' });
		if (!res.ok) throw new Error('Failed to delete supplier');
	},
	async searchSuppliers(query: string): Promise<Supplier[]> {
		const res = await apiFetch(`/api/suppliers?search=${encodeURIComponent(query)}`);
		if (!res.ok) throw new Error('Failed to search suppliers');
		return unwrap(res);
	}
};
