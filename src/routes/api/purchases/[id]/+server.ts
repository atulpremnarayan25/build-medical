import { purchaseService } from '$lib/server/servicesLocator.js';
import { jsonResponse, errorResponse } from '$lib/server/apiUtils.js';
import type { RequestEvent } from './$types.js';

export async function GET({ params, locals }: RequestEvent) {
	try {
		if (!locals.user) {
			return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
		}

		const purchase = await purchaseService.getPurchase(params.id);
		if (!purchase) {
			return errorResponse('NOT_FOUND', 'Purchase not found', 404);
		}

		if (locals.user.storeId && (purchase as any).storeId && (purchase as any).storeId !== locals.user.storeId) {
			return errorResponse('FORBIDDEN', 'Cross-tenant access denied', 403);
		}

		return jsonResponse(purchase);
	} catch (err: any) {
		return errorResponse('INTERNAL_ERROR', err.message, 500);
	}
}
