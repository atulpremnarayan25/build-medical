import { json, error } from '@sveltejs/kit';
import { inventoryService } from '$lib/server/servicesLocator.js';
import { errorResponse } from '$lib/server/apiUtils.js';

export async function GET({ params, locals }: any) {
	if (!locals.user) {
		return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
	}
	const batch = await inventoryService.getBatch(params.id);
	if (!batch) throw error(404, 'Batch not found');
	return json(batch);
}

export async function PATCH({ params, request, locals }: any) {
	if (!locals.user) {
		return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
	}
	if (locals.user.role !== 'owner_admin') {
		return errorResponse('FORBIDDEN', 'Forbidden: Admin role required', 403);
	}
	const data = await request.json();
	const batch = await inventoryService.updateBatch(params.id, data);
	return json(batch);
}
