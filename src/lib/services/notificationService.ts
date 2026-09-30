import type { NotificationRepository } from '$lib/repositories/notificationRepository.js';
import type { Notification } from '$lib/types/index.js';

export function createNotificationService(repo: NotificationRepository) {
	return {
		async getNotifications(): Promise<Notification[]> {
			return repo.getAll();
		},

		async getUnreadNotifications(): Promise<Notification[]> {
			return repo.getUnread();
		},

		async markNotificationAsRead(id: string): Promise<void> {
			return repo.markAsRead(id);
		},

		async markAllNotificationsAsRead(): Promise<void> {
			return repo.markAllAsRead();
		}
	};
}
