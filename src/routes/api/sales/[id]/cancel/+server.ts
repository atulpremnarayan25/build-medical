import { json } from '@sveltejs/kit';
import { salesService } from '$lib/server/servicesLocator.js';

export async function POST({ params, locals }) {
	if (!locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const sale = await salesService.cancelSale(params.id);
	return json(sale);
}
