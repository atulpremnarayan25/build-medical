import { json } from '@sveltejs/kit';
import { purchaseService } from '$lib/server/servicesLocator.js';
import { db } from '$lib/server/db/index.js';
import { purchasesTable } from '$lib/server/db/schema.js';
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

	const [existingPurchase] = await db
		.select({ id: purchasesTable.id, storeId: purchasesTable.storeId })
		.from(purchasesTable)
		.where(eq(purchasesTable.id, params.id));

	if (!existingPurchase) {
		return new Response(JSON.stringify({ error: 'Purchase not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (locals.user.storeId && existingPurchase.storeId !== locals.user.storeId) {
		return new Response(JSON.stringify({ error: 'Forbidden: Cross-tenant access denied' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const purchase = await purchaseService.cancelPurchase(params.id);
	return json(purchase);
}
