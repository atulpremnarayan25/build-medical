export interface Supplier {
	id: string;
	name: string;
	code?: string;
	phone?: string;
	email?: string;
	address?: string;
	gstin?: string;
	gstNumber?: string;
	outstandingBalance: number;
	active: boolean;
	createdAt: string;
	updatedAt: string;
}

export type CreateSupplierInput = Omit<
	Supplier,
	'id' | 'outstandingBalance' | 'createdAt' | 'updatedAt'
>;
