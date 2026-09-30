import { customerService } from '$lib/server/servicesLocator';
import { jsonResponse, errorResponse } from '$lib/server/apiUtils';
import type { RequestEvent } from './$types';

export async function GET({ url }: RequestEvent) {
	try {
		const q = url.searchParams.get('q') || url.searchParams.get('search');
		// The API Spec mentions "sortable by balance (UI §4.5)" - we can manually sort here or assume it's in service
		let customers = await customerService.getCustomers();

		if (q) {
			customers = await customerService.searchCustomers(q);
		}

		// Sorting
		const sort = url.searchParams.get('sort');
		if (sort === 'balance_desc') {
			customers.sort((a, b) => b.outstandingBalance - a.outstandingBalance);
		} else if (sort === 'balance_asc') {
			customers.sort((a, b) => a.outstandingBalance - b.outstandingBalance);
		}

		return jsonResponse(customers);
	} catch (err: any) {
		return errorResponse('INTERNAL_ERROR', err.message, 500);
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const input = await request.json();
		const newCustomer = await customerService.createCustomer(input);
		return jsonResponse(newCustomer, 201);
	} catch (err: any) {
		return errorResponse('BAD_REQUEST', err.message, 400);
	}
}
