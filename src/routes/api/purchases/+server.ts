import { json } from '@sveltejs/kit';
import { purchaseService } from '$lib/server/servicesLocator.js';
import { errorResponse, jsonResponse } from '$lib/server/apiUtils.js';

export async function GET({ url, locals }: any) {
	if (!locals.user) {
		return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
	}

	const supplierId = url.searchParams.get('supplierId');
	if (supplierId) {
		const purchases = await purchaseService.getPurchasesBySupplier(supplierId);
		return json(purchases);
	}

	const purchases = await purchaseService.getPurchases();
	return json(purchases);
}

export async function POST({ request, locals }) {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (locals.user.role !== 'owner_admin') {
		return new Response(
			JSON.stringify({ error: 'Forbidden: Admin role required for inward purchases' }),
			{
				status: 403,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	const data = await request.json();
	// inject created by
	data.createdBy = locals.user.id;
	if (locals.user.storeId) {
		data.storeId = locals.user.storeId;
	}

	const purchase = await purchaseService.createPurchase(data);
	return json(purchase);
}
