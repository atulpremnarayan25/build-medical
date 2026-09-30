import type { LayoutServerLoad } from './$types';
import { inventoryService } from '$lib/server/servicesLocator.js';

export const load: LayoutServerLoad = async ({ locals }) => {
	const notifications = [];

	try {
		if (locals.user) {
			const [lowStock, expired, expiring] = await Promise.all([
				inventoryService.getLowStockBatches(10).catch(() => []),
				inventoryService.getExpiredBatches().catch(() => []),
				inventoryService.getExpiringBatches(90).catch(() => [])
			]);

			if (lowStock.length > 0) notifications.push(`${lowStock.length} Low Stock items`);
			if (expired.length > 0) notifications.push(`${expired.length} Expired batches`);
			if (expiring.length > 0) notifications.push(`${expiring.length} Batches expiring soon`);
		}
	} catch (e) {
		console.error('Notifications fetch failed:', e);
	}

	return {
		user: locals.user,
		notifications
	};
};
