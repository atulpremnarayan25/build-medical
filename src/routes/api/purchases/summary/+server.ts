import { json } from '@sveltejs/kit';
import { purchaseService } from '$lib/server/servicesLocator.js';
import type { RequestEvent } from './$types.js';

export async function GET({ locals }: RequestEvent) {
	if (!locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const summary = await purchaseService.getDashboardSummary();
	return json(summary);
}
