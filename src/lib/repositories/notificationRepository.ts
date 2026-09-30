import type { Notification } from '$lib/types/index.js';

export interface NotificationRepository {
	getAll(): Promise<Notification[]>;
	getUnread(): Promise<Notification[]>;
	markAsRead(id: string): Promise<void>;
	markAllAsRead(): Promise<void>;
}
