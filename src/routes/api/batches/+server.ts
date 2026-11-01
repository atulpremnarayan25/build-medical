import { json } from '@sveltejs/kit';
import { inventoryService } from '$lib/server/servicesLocator.js';
import { errorResponse } from '$lib/server/apiUtils.js';

export async function GET({ url, locals }: any) {
	if (!locals.user) {
		return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
	}

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

export async function POST({ request, locals }: any) {
	if (!locals.user) {
		return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
	}
	if (locals.user.role !== 'owner_admin') {
		return errorResponse('FORBIDDEN', 'Forbidden: Admin role required', 403);
	}
	const data = await request.json();
	const batch = await inventoryService.createBatch(data);
	return json(batch);
}
