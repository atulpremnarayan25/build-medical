import { customerService } from '$lib/server/servicesLocator';
import { jsonResponse, errorResponse } from '$lib/server/apiUtils';
import type { RequestEvent } from './$types';

export async function GET({ params }: RequestEvent) {
	try {
		const { id } = params;
		const customer = await customerService.getCustomer(id);
		if (!customer) {
			return errorResponse('NOT_FOUND', 'Customer not found', 404);
		}
		return jsonResponse(customer);
	} catch (err: any) {
		return errorResponse('INTERNAL_ERROR', err.message, 500);
	}
}

export async function PATCH({ params, request }: RequestEvent) {
	try {
		const { id } = params;
		const input = await request.json();
		const customer = await customerService.getCustomer(id);

		if (!customer) {
			return errorResponse('NOT_FOUND', 'Customer not found', 404);
		}

		const updatedCustomer = await customerService.updateCustomer(id, input);
		return jsonResponse(updatedCustomer);
	} catch (err: any) {
		return errorResponse('BAD_REQUEST', err.message, 400);
	}
}
