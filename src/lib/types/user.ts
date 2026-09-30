export type UserRole =
	'owner' | 'administrator' | 'billing-operator' | 'salesman' | 'warehouse-staff' | 'accountant';

export interface User {
	id: string;
	name: string;
	username: string;
	phone?: string;
	email?: string;
	role: UserRole;
	active: boolean;
	lastActiveAt?: string;
	createdAt: string;
}
