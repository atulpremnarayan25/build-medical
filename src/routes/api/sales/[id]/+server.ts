import { salesService } from '$lib/server/servicesLocator.js';
import { jsonResponse, errorResponse } from '$lib/server/apiUtils.js';
import type { RequestEvent } from './$types.js';

export async function GET({ params, locals }: RequestEvent) {
	try {
		if (!locals.user) {
			return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
		}

		const sale = await salesService.getSale(params.id);
		if (!sale) {
			return errorResponse('NOT_FOUND', 'Sale not found', 404);
		}

		if (locals.user.storeId && (sale as any).storeId && (sale as any).storeId !== locals.user.storeId) {
			return errorResponse('FORBIDDEN', 'Cross-tenant access denied', 403);
		}

		return jsonResponse(sale);
	} catch (err: any) {
		return errorResponse('INTERNAL_ERROR', err.message, 500);
	}
}
