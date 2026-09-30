import { json } from '@sveltejs/kit';
import { inventoryService } from '$lib/server/servicesLocator.js';

export async function GET({ url }) {
	const productId = url.searchParams.get('productId');
	const active = url.searchParams.get('active');

	if (productId && active) {
		const batches = await inventoryService.getBatchesByProduct(productId);
		return json(batches.filter((b) => b.quantity > 0 && b.status !== 'expired'));
	}
	if (productId) {
		const batches = await inventoryService.getBatchesByProduct(productId);
		return json(batches);
	}
	const batches = await inventoryService.getBatches();
	return json(batches);
}

export async function POST({ request }) {
	const data = await request.json();
	const batch = await inventoryService.createBatch(data);
	return json(batch);
}
