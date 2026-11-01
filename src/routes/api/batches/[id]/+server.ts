import { json, error } from '@sveltejs/kit';
import { inventoryService } from '$lib/server/servicesLocator.js';

export async function GET({ params }) {
	const batch = await inventoryService.getBatch(params.id);
	if (!batch) throw error(404, 'Batch not found');
	return json(batch);
}

export async function PATCH({ params, request, locals }) {
	if (!locals.user || locals.user.role !== 'owner_admin') {
		return json({ error: 'Forbidden: Admin role required' }, { status: 403 });
	}
	const data = await request.json();
	const batch = await inventoryService.updateBatch(params.id, data);
	return json(batch);
}
