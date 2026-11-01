import { supplierService } from '$lib/server/servicesLocator';
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

		if (locals.user.storeId && (supplier as any).storeId && (supplier as any).storeId !== locals.user.storeId) {
			return errorResponse('FORBIDDEN', 'Cross-tenant access denied', 403);
		}

		return jsonResponse(supplier);
	} catch (err: any) {
		return errorResponse('INTERNAL_ERROR', err.message, 500);
	}
}

export async function PATCH({ params, request, locals }: RequestEvent) {
	try {
		if (!locals.user) {
			return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
		}
		if (locals.user.role !== 'owner_admin') {
			return errorResponse('FORBIDDEN', 'Only owner_admin can modify suppliers', 403);
		}
		const { id } = params;
		const input = await request.json();
		const supplier = await supplierService.getSupplier(id);

		if (!supplier) {
			return errorResponse('NOT_FOUND', 'Supplier not found', 404);
		}

		if (locals.user.storeId && supplier.storeId && supplier.storeId !== locals.user.storeId) {
			return errorResponse('FORBIDDEN', 'Cross-tenant access denied', 403);
		}

		const updatedSupplier = await supplierService.updateSupplier(id, input);
		return jsonResponse(updatedSupplier);
	} catch (err: any) {
		return errorResponse('BAD_REQUEST', err.message, 400);
	}
}
