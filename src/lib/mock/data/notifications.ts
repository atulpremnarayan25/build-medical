import type { Notification } from '../../types/notification.js';

export const mockNotifications: Notification[] = [
	{
		id: 'notif-001',
		type: 'expiry-alert',
		priority: 'high',
		title: 'Batch Expired: Amoxicillin 500mg',
		message:
			'Batch AMX22034 of Amoxicillin 500mg expired on 30 Dec 2025. 32 units remain in stock. Consider removing from inventory.',
		read: false,
		actionUrl: '/inventory/batches/batch-005',
		createdAt: '2026-08-22T08:00:00.000Z'
	},
	{
		id: 'notif-002',
		type: 'expiry-alert',
		priority: 'high',
		title: 'Batch Expired: Crocin Advance',
		message: 'Batch CRC22056 of Crocin Advance expired on 30 Jun 2025. 18 units remain in stock.',
		read: false,
		actionUrl: '/inventory/batches/batch-016',
		createdAt: '2026-08-22T08:00:00.000Z'
	},
	{
		id: 'notif-003',
		type: 'expiry-alert',
		priority: 'medium',
		title: 'Expiring Soon: Insulin Glargine',
		message:
			'Batch INS23095 of Insulin Glargine 100IU/ml expires on 30 Sep 2026. 15 units in stock.',
		read: false,
		actionUrl: '/inventory/batches/batch-035',
		createdAt: '2026-08-21T08:00:00.000Z'
	},
	{
		id: 'notif-004',
		type: 'stock-alert',
		priority: 'high',
		title: 'Out of Stock: Omeprazole 20mg',
		message: 'Batch OMP23112 of Omeprazole 20mg is out of stock. Reorder recommended.',
		read: true,
		actionUrl: '/inventory/products/prod-007',
		createdAt: '2026-08-20T10:00:00.000Z'
	},
	{
		id: 'notif-005',
		type: 'stock-alert',
		priority: 'medium',
		title: 'Low Stock: Cetirizine 10mg',
		message: 'Only 8 units of Cetirizine 10mg (Batch CET24015) remaining. Consider reordering.',
		read: false,
		actionUrl: '/inventory/products/prod-005',
		createdAt: '2026-08-20T10:05:00.000Z'
	},
	{
		id: 'notif-006',
		type: 'payment-overdue',
		priority: 'high',
		title: 'Payment Overdue: Krishna Pharmaceuticals',
		message:
			'Invoice INV-2024-0012 for Krishna Pharmaceuticals is overdue. Outstanding amount: Rs 15,800.',
		read: false,
		actionUrl: '/sales/sale-012',
		createdAt: '2026-08-19T09:00:00.000Z'
	},
	{
		id: 'notif-007',
		type: 'payment-overdue',
		priority: 'medium',
		title: 'Payment Overdue: Gupta Chemist & Druggist',
		message:
			'Invoice INV-2024-0008 for Gupta Chemist & Druggist is overdue. Outstanding amount: Rs 8,450.',
		read: true,
		actionUrl: '/sales/sale-008',
		createdAt: '2026-08-18T09:00:00.000Z'
	},
	{
		id: 'notif-008',
		type: 'stock-alert',
		priority: 'medium',
		title: 'Low Stock: Ondansetron 4mg',
		message:
			'Only 3 units of Ondansetron 4mg (Batch OND24011) remaining. Reorder to avoid stockout.',
		read: true,
		actionUrl: '/inventory/products/prod-030',
		createdAt: '2026-08-17T10:00:00.000Z'
	},
	{
		id: 'notif-009',
		type: 'system',
		priority: 'low',
		title: 'Backup Completed',
		message: 'Daily data backup completed successfully at 02:00 AM on 22 Aug 2026.',
		read: true,
		createdAt: '2026-08-22T02:00:00.000Z'
	},
	{
		id: 'notif-010',
		type: 'sync-status',
		priority: 'low',
		title: 'Sync Completed',
		message: 'All data synced successfully with cloud server. Last sync: 22 Aug 2026, 09:00 AM.',
		read: true,
		createdAt: '2026-08-22T09:00:00.000Z'
	}
];
