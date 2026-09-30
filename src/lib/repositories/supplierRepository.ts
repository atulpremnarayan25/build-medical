import type { Supplier, CreateSupplierInput } from '$lib/types/index.js';

export interface SupplierRepository {
	getAll(): Promise<Supplier[]>;
	getById(id: string): Promise<Supplier | null>;
	create(input: CreateSupplierInput): Promise<Supplier>;
	update(id: string, input: Partial<CreateSupplierInput>): Promise<Supplier>;
	updateBalance(id: string, newBalance: number): Promise<Supplier>;
	delete(id: string): Promise<void>;
	search(query: string): Promise<Supplier[]>;
}
