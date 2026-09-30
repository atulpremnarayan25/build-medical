import { inventoryService } from '$lib/server/servicesLocator';
import { jsonResponse, errorResponse } from '$lib/server/apiUtils';
import type { RequestEvent } from './$types';

export async function POST({ params, request }: RequestEvent) {
	try {
		const { id, batchId } = params;
		const { delta, reason } = await request.json();

		if (typeof delta !== 'number') {
			return errorResponse('BAD_REQUEST', 'Delta must be a number', 400);
		}

		const batch = await inventoryService.getBatch(batchId);
		if (!batch || batch.productId !== id) {
			return errorResponse('NOT_FOUND', 'Batch not found for this product', 404);
		}

		const updatedBatch = await inventoryService.updateBatch(batchId, {
			quantity: batch.quantity + delta
			// In a full implementation, reason would be recorded in batch_stock_events
		});

		return jsonResponse(updatedBatch);
	} catch (err: any) {
		return errorResponse('INTERNAL_ERROR', err.message, 500);
	}
}
