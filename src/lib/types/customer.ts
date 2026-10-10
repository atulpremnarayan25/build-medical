export interface Customer {
	id: string;
	name: string;
	code?: string;
	phone?: string;
	telephone?: string;
	mobileSms?: string;
	email?: string;
	address?: string;
	city?: string;
	pinCode?: string;
	gstin?: string;
	stateCode?: string;
	stateName?: string;
	panNo?: string;
	drugLicenseNo1?: string;
	drugLicenseNo2?: string;
	drugLicenseExpiry?: string;
	fssaiLicenseNo?: string;
	isComposite?: boolean;
	billSeries?: string;
	salesRep?: string;
	customerType?: 'retail' | 'wholesale';
	creditLimit: number;
	creditDays?: number;
	openingBalance?: number;
	defaultAddAmount?: number;
	defaultAddDetail?: string;
	defaultLessAmount?: number;
	defaultLessDetail?: string;
	contactPerson?: string;
	remarks?: string;
	outstandingBalance: number;
	active: boolean;
	createdAt: string;
	updatedAt: string;
}

export type CreateCustomerInput = Omit<
	Customer,
	'id' | 'outstandingBalance' | 'createdAt' | 'updatedAt'
>;
