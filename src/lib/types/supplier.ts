export interface Supplier {
	id: string;
	name: string;
	code?: string;
	phone?: string;
	telephone?: string;
	email?: string;
	address?: string;
	city?: string;
	pinCode?: string;
	gstin?: string;
	gstNumber?: string;
	stateCode?: string;
	stateName?: string;
	panNo?: string;
	drugLicenseNo1?: string;
	drugLicenseNo2?: string;
	drugLicenseExpiry?: string;
	fssaiLicenseNo?: string;
	tdsApplicable?: boolean;
	creditDays?: number;
	openingBalance?: number;
	contactPerson?: string;
	remarks?: string;
	outstandingBalance: number;
	active: boolean;
	createdAt: string;
	updatedAt: string;
}

export type CreateSupplierInput = Omit<
	Supplier,
	'id' | 'outstandingBalance' | 'createdAt' | 'updatedAt'
>;
