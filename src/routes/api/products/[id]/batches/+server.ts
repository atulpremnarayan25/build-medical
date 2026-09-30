import { inventoryService } from '$lib/server/servicesLocator';
import { jsonResponse, errorResponse } from '$lib/server/apiUtils';
import type { RequestEvent } from './$types';

export async function GET({ params }: RequestEvent) {
	try {
		const { id } = params;
		const batches = await inventoryService.getBatchesByProduct(id);

		// Sort by expiry date ascending (FEFO view)
		batches.sort((a, b) => {
			return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
		});

		return jsonResponse(batches);
	} catch (err: any) {
		return errorResponse('INTERNAL_ERROR', err.message, 500);
	}
}
