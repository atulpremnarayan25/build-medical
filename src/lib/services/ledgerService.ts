import type { LedgerRepository } from '$lib/repositories/ledgerRepository.js';
import type { LedgerEntry, CreateLedgerEntryInput } from '$lib/types/index.js';

export function createLedgerService(repo: LedgerRepository) {
	return {
		async getLedgerEntries(): Promise<LedgerEntry[]> {
			return repo.getAll();
		},

		async getLedgerByParty(partyId: string): Promise<LedgerEntry[]> {
			return repo.getByPartyId(partyId);
		},

		async getLedgerByDateRange(from: string, to: string): Promise<LedgerEntry[]> {
			return repo.getByDateRange(from, to);
		},

		async createLedgerEntry(input: CreateLedgerEntryInput): Promise<LedgerEntry> {
			return repo.create(input);
		}
	};
}
