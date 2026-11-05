import { json } from '@sveltejs/kit';
import { salesService } from '$lib/server/servicesLocator.js';
import type { RequestEvent } from './$types.js';

export async function GET({ locals }: RequestEvent) {
	if (!locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const storeId = locals.user.storeId || undefined;
	const summary = await salesService.getDashboardSummary(storeId);
	return json(summary);
}
