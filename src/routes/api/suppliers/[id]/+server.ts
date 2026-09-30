import { supplierService } from '$lib/server/servicesLocator';
import { jsonResponse, errorResponse } from '$lib/server/apiUtils';
import type { RequestEvent } from './$types';

export async function GET({ params }: RequestEvent) {
	try {
		const { id } = params;
		const supplier = await supplierService.getSupplier(id);
		if (!supplier) {
			return errorResponse('NOT_FOUND', 'Supplier not found', 404);
		}
		return jsonResponse(supplier);
	} catch (err: any) {
		return errorResponse('INTERNAL_ERROR', err.message, 500);
	}
}

export async function PATCH({ params, request }: RequestEvent) {
	try {
		const { id } = params;
		const input = await request.json();
		const supplier = await supplierService.getSupplier(id);

		if (!supplier) {
			return errorResponse('NOT_FOUND', 'Supplier not found', 404);
		}

		const updatedSupplier = await supplierService.updateSupplier(id, input);
		return jsonResponse(updatedSupplier);
	} catch (err: any) {
		return errorResponse('BAD_REQUEST', err.message, 400);
	}
}
