import { json, error } from '@sveltejs/kit';
import { inventoryService } from '$lib/server/servicesLocator.js';

export async function GET({ params }) {
	const batch = await inventoryService.getBatch(params.id);
	if (!batch) throw error(404, 'Batch not found');
	return json(batch);
}

export async function PATCH({ params, request }) {
	const data = await request.json();
	const batch = await inventoryService.updateBatch(params.id, data);
	return json(batch);
}
