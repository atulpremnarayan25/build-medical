import { json } from '@sveltejs/kit';
import { salesService } from '$lib/server/servicesLocator.js';

export async function GET() {
	const summary = await salesService.getDashboardSummary();
	return json(summary);
}
