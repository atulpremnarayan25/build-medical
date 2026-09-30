import { json } from '@sveltejs/kit';
import { ledgerService } from '$lib/server/servicesLocator.js';

export async function GET({ params }) {
	const entries = await ledgerService.getLedgerByParty(params.partyId);
	return json(entries);
}
