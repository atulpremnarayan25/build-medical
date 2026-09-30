import type { User } from '../../types/user.js';

export const mockUsers: User[] = [
	{
		id: 'user-001',
		name: 'Rajesh Kumar',
		username: 'admin',
		phone: '9876543210',
		email: 'rajesh.kumar@buildmedical.in',
		role: 'owner',
		active: true,
		lastActiveAt: '2026-08-22T09:30:00.000Z',
		createdAt: '2024-01-01T10:00:00.000Z'
	},
	{
		id: 'user-002',
		name: 'Priya Sharma',
		username: 'priya.sharma',
		phone: '9887654321',
		email: 'priya.sharma@buildmedical.in',
		role: 'administrator',
		active: true,
		lastActiveAt: '2026-08-21T18:45:00.000Z',
		createdAt: '2024-01-05T10:00:00.000Z'
	},
	{
		id: 'user-003',
		name: 'Amit Patel',
		username: 'amit.patel',
		phone: '9898765432',
		email: 'amit.patel@buildmedical.in',
		role: 'billing-operator',
		active: true,
		lastActiveAt: '2026-08-22T08:15:00.000Z',
		createdAt: '2024-02-01T10:00:00.000Z'
	},
	{
		id: 'user-004',
		name: 'Suresh Yadav',
		username: 'suresh.yadav',
		phone: '9812345670',
		role: 'warehouse-staff',
		active: true,
		lastActiveAt: '2026-08-20T17:00:00.000Z',
		createdAt: '2024-02-15T10:00:00.000Z'
	},
	{
		id: 'user-005',
		name: 'Neha Gupta',
		username: 'neha.gupta',
		phone: '9823456780',
		email: 'neha.gupta@buildmedical.in',
		role: 'accountant',
		active: false,
		lastActiveAt: '2026-06-15T14:30:00.000Z',
		createdAt: '2024-03-01T10:00:00.000Z'
	}
];
