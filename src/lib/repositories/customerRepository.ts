import type { Customer, CreateCustomerInput } from '$lib/types/index.js';

export interface CustomerRepository {
	getAll(): Promise<Customer[]>;
	getById(id: string): Promise<Customer | null>;
	create(input: CreateCustomerInput): Promise<Customer>;
	update(id: string, input: Partial<CreateCustomerInput>): Promise<Customer>;
	updateBalance(id: string, newBalance: number): Promise<Customer>;
	delete(id: string): Promise<void>;
	search(query: string): Promise<Customer[]>;
}
