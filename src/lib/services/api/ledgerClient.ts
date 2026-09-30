import type { LedgerEntry } from '$lib/types/index.js';
import { unwrap } from './unwrap.js';

export const ledgerService = {
	async getLedgerEntries(): Promise<LedgerEntry[]> {
		const res = await fetch('/api/ledger');
		if (!res.ok) throw new Error('Failed to fetch ledger entries');
		return unwrap(res);
	},
	async getLedgerByParty(partyId: string): Promise<LedgerEntry[]> {
		const res = await fetch(`/api/ledger/${partyId}`);
		if (!res.ok) throw new Error('Failed to fetch ledger statement');
		return unwrap(res);
	}
};
