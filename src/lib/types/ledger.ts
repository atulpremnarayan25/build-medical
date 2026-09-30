export type LedgerEntryType =
	| 'sale'
	| 'purchase'
	| 'payment-received'
	| 'payment-made'
	| 'credit-note'
	| 'debit-note'
	| 'opening-balance';

export interface LedgerEntry {
	id: string;
	date: string;
	partyId: string;
	partyName: string;
	partyType: 'customer' | 'supplier';
	type: LedgerEntryType;
	reference: string;
	particulars: string;
	debit: number;
	credit: number;
	balance: number;
	createdAt: string;
}

export type CreateLedgerEntryInput = Omit<LedgerEntry, 'id' | 'createdAt'>;
