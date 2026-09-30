export type DrugSchedule = 'none' | 'H' | 'H1' | 'X';

export interface Product {
	id: string;
	name: string;
	genericName?: string;
	manufacturer?: string;
	category?: string;
	hsn?: string;
	hsnCode?: string;
	barcode?: string;
	gstRate: number;
	mrp: number;
	sellingRate: number;
	purchaseRate: number;
	packSize: number; // For Multi-unit conversion
	drugSchedule: DrugSchedule;
	active: boolean;
	createdAt: string;
	updatedAt: string;
}

export type CreateProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
