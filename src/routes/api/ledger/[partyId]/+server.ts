import { jsonResponse, errorResponse } from '$lib/server/apiUtils.js';
import { ledgerService, customerService, supplierService } from '$lib/server/servicesLocator.js';
import type { RequestEvent } from './$types.js';

export async function GET({ params, locals }: RequestEvent) {
	if (!locals.user) {
		return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
	}
	const partyId = params.partyId;
	if (locals.user.storeId) {
		const customer = await customerService.getCustomer(partyId);
		if (customer) {
			if (customer.storeId && customer.storeId !== locals.user.storeId) {
				return errorResponse('FORBIDDEN', 'Cross-tenant access denied', 403);
			}
		} else {
			const supplier = await supplierService.getSupplier(partyId);
			if (supplier && supplier.storeId && supplier.storeId !== locals.user.storeId) {
				return errorResponse('FORBIDDEN', 'Cross-tenant access denied', 403);
			}
		}
	}
	const entries = await ledgerService.getLedgerByParty(params.partyId);
	return jsonResponse(entries);
}
