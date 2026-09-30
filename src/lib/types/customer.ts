export interface Customer {
	id: string;
	name: string;
	code?: string;
	phone?: string;
	email?: string;
	address?: string;
	gstin?: string;
	creditLimit: number;
	outstandingBalance: number;
	active: boolean;
	createdAt: string;
	updatedAt: string;
}

export type CreateCustomerInput = Omit<
	Customer,
	'id' | 'outstandingBalance' | 'createdAt' | 'updatedAt'
>;
