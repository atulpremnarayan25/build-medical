import { json } from '@sveltejs/kit';
import { purchaseService } from '$lib/server/servicesLocator.js';

export async function POST({ params, locals }) {
	if (!locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	if (locals.user.role !== 'owner_admin') {
		return new Response(JSON.stringify({ error: 'Forbidden: Admin role required' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const purchase = await purchaseService.cancelPurchase(params.id);
	return json(purchase);
}
