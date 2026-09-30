export type NotificationType =
	'stock-alert' | 'expiry-alert' | 'payment-overdue' | 'sync-status' | 'system';
export type NotificationPriority = 'low' | 'medium' | 'high';

export interface Notification {
	id: string;
	type: NotificationType;
	priority: NotificationPriority;
	title: string;
	message: string;
	read: boolean;
	actionUrl?: string;
	createdAt: string;
}
