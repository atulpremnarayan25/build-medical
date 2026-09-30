import type { CustomerRepository } from '$lib/repositories/customerRepository.js';
import type { Customer, CreateCustomerInput } from '$lib/types/index.js';

export function createCustomerService(repo: CustomerRepository) {
	return {
		async getCustomers(): Promise<Customer[]> {
			return repo.getAll();
		},

		async getCustomer(id: string): Promise<Customer | null> {
			return repo.getById(id);
		},

		async createCustomer(input: CreateCustomerInput): Promise<Customer> {
			return repo.create(input);
		},

		async updateCustomer(id: string, input: Partial<CreateCustomerInput>): Promise<Customer> {
			return repo.update(id, input);
		},

		async updateCustomerBalance(id: string, newBalance: number): Promise<Customer> {
			return repo.updateBalance(id, newBalance);
		},

		async deleteCustomer(id: string): Promise<void> {
			return repo.delete(id);
		},

		async searchCustomers(query: string): Promise<Customer[]> {
			return repo.search(query);
		}
	};
}
