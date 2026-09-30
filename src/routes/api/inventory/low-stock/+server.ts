import { inventoryService } from '$lib/server/servicesLocator';
import { jsonResponse, errorResponse } from '$lib/server/apiUtils';
import type { RequestEvent } from './$types';

export async function GET({ url }: RequestEvent) {
	try {
		const threshold = parseInt(url.searchParams.get('threshold') || '10', 10);
		const lowStockBatches = await inventoryService.getLowStockBatches(threshold);
		return jsonResponse(lowStockBatches);
	} catch (err: any) {
		return errorResponse('INTERNAL_ERROR', err.message, 500);
	}
}
