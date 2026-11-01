import { ledgerService, customerService } from '$lib/server/servicesLocator';
import { jsonResponse, errorResponse } from '$lib/server/apiUtils';
import type { RequestEvent } from './$types';

export async function GET({ params, locals }: RequestEvent) {
	try {
		if (!locals.user) {
			return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
		}

		const { id } = params;
		const customer = await customerService.getCustomer(id);

		if (!customer) {
			return errorResponse('NOT_FOUND', 'Customer not found', 404);
		}

		if (locals.user.storeId && customer.storeId && customer.storeId !== locals.user.storeId) {
			return errorResponse('FORBIDDEN', 'Cross-tenant access denied', 403);
		}

		const entries = await ledgerService.getLedgerByParty(id);
		return jsonResponse(entries);
	} catch (err: any) {
		return errorResponse('INTERNAL_ERROR', err.message, 500);
	}
}
