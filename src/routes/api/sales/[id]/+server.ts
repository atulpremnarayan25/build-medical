import { json, error } from '@sveltejs/kit';
import { salesService } from '$lib/server/servicesLocator.js';

export async function GET({ params }) {
	const sale = await salesService.getSale(params.id);
	if (!sale) throw error(404, 'Sale not found');
	return json(sale);
}
