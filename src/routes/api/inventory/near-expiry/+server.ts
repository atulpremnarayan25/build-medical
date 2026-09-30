import { inventoryService } from '$lib/server/servicesLocator';
import { jsonResponse, errorResponse } from '$lib/server/apiUtils';
import type { RequestEvent } from './$types';

export async function GET({ url }: RequestEvent) {
	try {
		const days = parseInt(url.searchParams.get('days') || '90', 10);
		const nearExpiryBatches = await inventoryService.getExpiringBatches(days);
		return jsonResponse(nearExpiryBatches);
	} catch (err: any) {
		return errorResponse('INTERNAL_ERROR', err.message, 500);
	}
}
