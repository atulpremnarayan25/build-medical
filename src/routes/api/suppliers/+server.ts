import { supplierService } from '$lib/server/servicesLocator';
import { jsonResponse, errorResponse } from '$lib/server/apiUtils';
import type { RequestEvent } from './$types';

export async function GET({ url }: RequestEvent) {
	try {
		const q = url.searchParams.get('q') || url.searchParams.get('search');
		let suppliers = await supplierService.getSuppliers();

		if (q) {
			suppliers = await supplierService.searchSuppliers(q);
		}

		return jsonResponse(suppliers);
	} catch (err: any) {
		return errorResponse('INTERNAL_ERROR', err.message, 500);
	}
}

export async function POST({ request, locals }: RequestEvent) {
	try {
		if (!locals.user) {
			return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
		}
		if (locals.user.role !== 'owner_admin') {
			return errorResponse('FORBIDDEN', 'Only owner_admin can create suppliers', 403);
		}
		const input = await request.json();
		if (!input?.name || typeof input.name !== 'string' || !input.name.trim()) {
			return errorResponse('VALIDATION_ERROR', 'Supplier name is required', 400);
		}
		if (locals.user.storeId) {
			input.storeId = locals.user.storeId;
		}
		const newSupplier = await supplierService.createSupplier(input);
		return jsonResponse(newSupplier, 201);
	} catch (err: any) {
		return errorResponse('BAD_REQUEST', err.message, 400);
	}
}
