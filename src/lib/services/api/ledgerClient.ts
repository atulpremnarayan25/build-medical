import type { LedgerEntry } from '$lib/types/index.js';
import { unwrap } from './unwrap.js';

export const ledgerService = {
	async getLedgerEntries(): Promise<LedgerEntry[]> {
		const res = await fetch('/api/ledger');
		if (!res.ok) throw new Error('Failed to fetch ledger entries');
		return unwrap(res);
	},

	async getLedgerByParty(partyId: string, partyType?: 'customer' | 'supplier'): Promise<LedgerEntry[]> {
		if (partyType === 'supplier') {
			const res = await fetch(`/api/suppliers/${partyId}/ledger`);
			if (res.ok) return unwrap(res);
		} else if (partyType === 'customer') {
			const res = await fetch(`/api/customers/${partyId}/ledger`);
			if (res.ok) return unwrap(res);
		}

		// Try customer endpoint
		let res = await fetch(`/api/customers/${partyId}/ledger`);
		if (res.ok) return unwrap(res);

		// Try supplier endpoint
		res = await fetch(`/api/suppliers/${partyId}/ledger`);
		if (res.ok) return unwrap(res);

		// Fallback to reports/ledger endpoint
		const reportRes = await fetch(`/api/reports/ledger?type=${partyType === 'supplier' ? 'payable' : 'receivable'}&partyId=${partyId}`);
		if (reportRes.ok) {
			const data = await reportRes.json();
			return (data.transactions || []).map((t: any) => ({
				id: t.id,
				date: t.date,
				partyId,
				partyName: data.party?.name || '',
				partyType: partyType || 'customer',
				type: t.type === 'invoice' ? 'sale' : t.type === 'receipt' ? 'payment-received' : t.type === 'purchase' ? 'purchase' : 'payment-made',
				reference: t.ref,
				particulars: t.particulars,
				debit: t.debit,
				credit: t.credit,
				balance: t.balance,
				createdAt: t.date
			}));
		}

		throw new Error('Failed to fetch ledger statement');
	}
};
