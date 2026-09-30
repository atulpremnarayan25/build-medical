import { json } from '@sveltejs/kit';
import { purchaseService } from '$lib/server/servicesLocator.js';

export async function GET({ url }) {
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
		return new Response('Unauthorized', { status: 401 });
	}

	const data = await request.json();
	// inject created by
	data.createdBy = locals.user.id;

	const purchase = await purchaseService.createPurchase(data);
	return json(purchase);
}
