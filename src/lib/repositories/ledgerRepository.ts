import type { LedgerEntry, CreateLedgerEntryInput } from '$lib/types/index.js';

export interface LedgerRepository {
	getAll(): Promise<LedgerEntry[]>;
	getByPartyId(partyId: string): Promise<LedgerEntry[]>;
	getByDateRange(from: string, to: string): Promise<LedgerEntry[]>;
	create(input: CreateLedgerEntryInput): Promise<LedgerEntry>;
}
