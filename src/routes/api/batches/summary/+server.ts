import { json } from '@sveltejs/kit';
import { inventoryService } from '$lib/server/servicesLocator.js';

export async function GET({ url }) {
	const type = url.searchParams.get('type');
	if (type === 'low-stock') {
		const threshold = parseInt(url.searchParams.get('threshold') || '10');
		const batches = await inventoryService.getLowStockBatches(threshold);
		return json(batches);
	}
	if (type === 'expired') {
		const batches = await inventoryService.getExpiredBatches();
		return json(batches);
	}
	if (type === 'expiring') {
		const days = parseInt(url.searchParams.get('days') || '90');
		const batches = await inventoryService.getExpiringBatches(days);
		return json(batches);
	}
	if (type === 'out-of-stock-count') {
		const count = await inventoryService.getOutOfStockProductCount();
		return json(count);
	}

	return json({ error: 'Invalid type' }, { status: 400 });
}
