import { jsonResponse, errorResponse } from '$lib/server/apiUtils.js';
import { ledgerService } from '$lib/server/servicesLocator.js';
import type { RequestEvent } from './$types.js';

export async function GET({ locals }: RequestEvent) {
	if (!locals.user) {
		return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
	}
	const entries = await ledgerService.getLedgerEntries();
	return jsonResponse(entries);
}
