import { json } from '@sveltejs/kit';
import { purchaseService } from '$lib/server/servicesLocator.js';

export async function GET() {
	const summary = await purchaseService.getDashboardSummary();
	return json(summary);
}
