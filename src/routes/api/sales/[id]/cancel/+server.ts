import { json } from '@sveltejs/kit';
import { salesService } from '$lib/server/servicesLocator.js';
import { db } from '$lib/server/db/index.js';
import { salesTable } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export async function POST({ params, locals }) {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (locals.user.role !== 'owner_admin') {
		return new Response(JSON.stringify({ error: 'Forbidden: Admin role required' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const [existingSale] = await db
		.select({ id: salesTable.id, storeId: salesTable.storeId })
		.from(salesTable)
		.where(eq(salesTable.id, params.id));

	if (!existingSale) {
		return new Response(JSON.stringify({ error: 'Sale not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (locals.user.storeId && existingSale.storeId !== locals.user.storeId) {
		return new Response(JSON.stringify({ error: 'Forbidden: Cross-tenant access denied' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const sale = await salesService.cancelSale(params.id);
	return json(sale);
}
