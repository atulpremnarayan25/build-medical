import { paymentService } from '$lib/server/servicesLocator.js';
import { jsonResponse, errorResponse } from '$lib/server/apiUtils.js';
import type { RequestEvent } from './$types.js';

export async function GET({ params, locals }: RequestEvent) {
	try {
		if (!locals.user) {
			return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
		}

		const payment = await paymentService.getPayment(params.id);
		if (!payment) {
			return errorResponse('NOT_FOUND', 'Payment not found', 404);
		}

		if (locals.user.storeId && (payment as any).storeId && (payment as any).storeId !== locals.user.storeId) {
			return errorResponse('FORBIDDEN', 'Cross-tenant access denied', 403);
		}

		return jsonResponse(payment);
	} catch (err: any) {
		return errorResponse('INTERNAL_ERROR', err.message, 500);
	}
}
