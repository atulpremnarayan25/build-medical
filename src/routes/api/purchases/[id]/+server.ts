import { json, error } from '@sveltejs/kit';
import { purchaseService } from '$lib/server/servicesLocator.js';

export async function GET({ params }) {
	const purchase = await purchaseService.getPurchase(params.id);
	if (!purchase) throw error(404, 'Purchase not found');
	return json(purchase);
}
