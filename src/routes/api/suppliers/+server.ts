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

export async function POST({ request }: RequestEvent) {
	try {
		const input = await request.json();
		const newSupplier = await supplierService.createSupplier(input);
		return jsonResponse(newSupplier, 201);
	} catch (err: any) {
		return errorResponse('BAD_REQUEST', err.message, 400);
	}
}
