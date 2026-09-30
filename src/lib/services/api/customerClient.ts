import type { Customer, CreateCustomerInput } from '$lib/types/index.js';
import { unwrap } from './unwrap.js';

export const customerService = {
	async getCustomers(): Promise<Customer[]> {
		const res = await fetch('/api/customers');
		if (!res.ok) throw new Error('Failed to fetch customers');
		return unwrap<Customer[]>(res);
	},
	async getCustomer(id: string): Promise<Customer | null> {
		const res = await fetch(`/api/customers/${id}`);
		if (res.status === 404) return null;
		if (!res.ok) throw new Error('Failed to fetch customer');
		return unwrap<Customer>(res);
	},
	async createCustomer(input: CreateCustomerInput): Promise<Customer> {
		const res = await fetch('/api/customers', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input)
		});
		return unwrap<Customer>(res);
	},
	async updateCustomer(id: string, input: Partial<CreateCustomerInput>): Promise<Customer> {
		const res = await fetch(`/api/customers/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input)
		});
		return unwrap<Customer>(res);
	},
	async updateCustomerBalance(id: string, newBalance: number): Promise<Customer> {
		throw new Error('Not supposed to be called from client directly');
	},
	async deleteCustomer(id: string): Promise<void> {
		const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
		if (!res.ok) throw new Error('Failed to delete customer');
	},
	async searchCustomers(query: string): Promise<Customer[]> {
		const res = await fetch(`/api/customers?search=${encodeURIComponent(query)}`);
		if (!res.ok) throw new Error('Failed to search customers');
		return unwrap<Customer[]>(res);
	}
};
