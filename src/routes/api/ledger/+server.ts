import { json } from '@sveltejs/kit';
import { ledgerService } from '$lib/server/servicesLocator.js';

export async function GET() {
	const entries = await ledgerService.getLedgerEntries();
	return json(entries);
}
