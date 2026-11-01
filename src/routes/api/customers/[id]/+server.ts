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

export async function PATCH({ params, request, locals }: RequestEvent) {
	try {
		if (!locals.user) {
			return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
		}
		const input = await request.json();

		if (input.creditLimit !== undefined && locals.user.role !== 'owner_admin') {
			return errorResponse('FORBIDDEN', 'Only owner_admin can modify credit limits', 403);
		}

		const { id } = params;
		const customer = await customerService.getCustomer(id);

		if (!customer) {
			return errorResponse('NOT_FOUND', 'Customer not found', 404);
		}

		if (locals.user.storeId && customer.storeId && customer.storeId !== locals.user.storeId) {
			return errorResponse('FORBIDDEN', 'Cross-tenant access denied', 403);
		}

		const updatedCustomer = await customerService.updateCustomer(id, input);
		return jsonResponse(updatedCustomer);
	} catch (err: any) {
		return errorResponse('BAD_REQUEST', err.message, 400);
	}
}
