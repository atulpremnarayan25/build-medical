import type { SupplierRepository } from '$lib/repositories/supplierRepository.js';
import type { Supplier, CreateSupplierInput } from '$lib/types/index.js';

export function createSupplierService(repo: SupplierRepository) {
	return {
		async getSuppliers(): Promise<Supplier[]> {
			return repo.getAll();
		},

		async getSupplier(id: string): Promise<Supplier | null> {
			return repo.getById(id);
		},

		async createSupplier(input: CreateSupplierInput): Promise<Supplier> {
			return repo.create(input);
		},

		async updateSupplier(id: string, input: Partial<CreateSupplierInput>): Promise<Supplier> {
			return repo.update(id, input);
		},

		async updateSupplierBalance(id: string, newBalance: number): Promise<Supplier> {
			return repo.updateBalance(id, newBalance);
		},

		async deleteSupplier(id: string): Promise<void> {
			return repo.delete(id);
		},

		async searchSuppliers(query: string): Promise<Supplier[]> {
			return repo.search(query);
		}
	};
}
