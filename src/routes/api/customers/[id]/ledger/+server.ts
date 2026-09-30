import { ledgerService, customerService } from '$lib/server/servicesLocator';
import { jsonResponse, errorResponse } from '$lib/server/apiUtils';
import type { RequestEvent } from './$types';

export async function GET({ params }: RequestEvent) {
	try {
		const { id } = params;
		const customer = await customerService.getCustomer(id);

		if (!customer) {
			return errorResponse('NOT_FOUND', 'Customer not found', 404);
		}

		const entries = await ledgerService.getLedgerByParty(id);
		return jsonResponse(entries);
	} catch (err: any) {
		return errorResponse('INTERNAL_ERROR', err.message, 500);
	}
}
