import { json } from '@sveltejs/kit';
import { purchaseService } from '$lib/server/servicesLocator.js';

export async function POST({ params, locals }) {
	if (!locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const purchase = await purchaseService.cancelPurchase(params.id);
	return json(purchase);
}
