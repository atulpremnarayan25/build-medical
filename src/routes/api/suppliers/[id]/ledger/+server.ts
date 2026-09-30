import { ledgerService, supplierService } from '$lib/server/servicesLocator';
import { jsonResponse, errorResponse } from '$lib/server/apiUtils';
import type { RequestEvent } from './$types';

export async function GET({ params }: RequestEvent) {
	try {
		const { id } = params;
		const supplier = await supplierService.getSupplier(id);

		if (!supplier) {
			return errorResponse('NOT_FOUND', 'Supplier not found', 404);
		}

		const entries = await ledgerService.getLedgerByParty(id);
		return jsonResponse(entries);
	} catch (err: any) {
		return errorResponse('INTERNAL_ERROR', err.message, 500);
	}
}
