import { ledgerService, supplierService } from '$lib/server/servicesLocator';
import { jsonResponse, errorResponse } from '$lib/server/apiUtils';
import type { RequestEvent } from './$types';

export async function GET({ params, locals }: RequestEvent) {
	try {
		if (!locals.user) {
			return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
		}

		const { id } = params;
		const supplier = await supplierService.getSupplier(id);

		if (!supplier) {
			return errorResponse('NOT_FOUND', 'Supplier not found', 404);
		}

		if (locals.user.storeId && supplier.storeId && supplier.storeId !== locals.user.storeId) {
			return errorResponse('FORBIDDEN', 'Cross-tenant access denied', 403);
		}

		const entries = await ledgerService.getLedgerByParty(id);
		return jsonResponse(entries);
	} catch (err: any) {
		return errorResponse('INTERNAL_ERROR', err.message, 500);
	}
}
