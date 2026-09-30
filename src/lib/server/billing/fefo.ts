/**
 * FEFO — First Expiry First Out batch allocation (spec §18, FR-INV-004).
 *
 * Pure function: no DB, no clock. The caller supplies the candidate batches
 * (already filtered to a single product) and today's date for expiry checks.
 * This is the most correctness-critical logic in the system — keep it pure
 * so it stays exhaustively testable.
 */

export interface FefoBatch {
	id: string;
	batchNo: string;
	expiryDate: string; // 'YYYY-MM-DD'
	/** Available quantity in whole base units (NUMERIC strings converted upstream). */
	quantityRemaining: number;
}

export interface FefoAllocation {
	batchId: string;
	batchNo: string;
	expiryDate: string;
	quantityBaseUnits: number;
}

export interface FefoOptions {
	/** ISO date (YYYY-MM-DD). Batches expiring on/before this date are skipped unless override. */
	today: string;
	/**
	 * FR-INV-005: expired stock may only be drawn with explicit owner override.
	 * When true and an expired batch is consumed, the result carries
	 * usedExpiredBatch=true so the caller can enforce/log the override.
	 */
	includeExpired?: boolean;
	/** Pin allocation to one specific batch (client-picked line). Stock/expiry still validated. */
	pinnedBatchId?: string;
}

export interface FefoResult {
	allocations: FefoAllocation[];
	usedExpiredBatch: boolean;
}

/** Thrown when stock is insufficient. `shortage` = unfulfillable base units. */
export class OutOfStockError extends Error {
	shortage: number;
	constructor(shortage: number) {
		super(`Insufficient stock: short by ${shortage} base unit(s)`);
		this.name = 'OutOfStockError';
		this.shortage = shortage;
	}
}

/**
 * Allocate `requestedBaseUnits` across candidate batches.
 * FEFO order = earliest expiry first; ties broken by batch id so allocation
 * (and the row locks taken upstream) are deterministic.
 */
export function allocateFefo(
	requestedBaseUnits: number,
	candidates: FefoBatch[],
	options: FefoOptions
): FefoResult {
	if (!Number.isInteger(requestedBaseUnits) || requestedBaseUnits <= 0) {
		throw new Error('Requested quantity must be a positive integer number of base units');
	}

	let pool = [...candidates];

	if (options.pinnedBatchId) {
		pool = pool.filter((b) => b.id === options.pinnedBatchId);
		if (pool.length === 0) throw new Error(`Pinned batch ${options.pinnedBatchId} not found`);
	} else if (!options.includeExpired) {
		pool = pool.filter((b) => b.expiryDate > options.today);
	}
	// Zero-stock batches never allocate, even when pinned.
	pool = pool.filter((b) => b.quantityRemaining > 0);

	pool.sort((a, b) => {
		if (a.expiryDate !== b.expiryDate) return a.expiryDate < b.expiryDate ? -1 : 1;
		return a.id < b.id ? -1 : 1;
	});

	const allocations: FefoAllocation[] = [];
	let remaining = requestedBaseUnits;
	for (const batch of pool) {
		if (remaining <= 0) break;
		const take = Math.min(remaining, batch.quantityRemaining);
		allocations.push({
			batchId: batch.id,
			batchNo: batch.batchNo,
			expiryDate: batch.expiryDate,
			quantityBaseUnits: take
		});
		remaining -= take;
	}

	if (remaining > 0) {
		const totalAvailable = candidates.reduce((s, b) => s + Math.max(b.quantityRemaining, 0), 0);
		if (totalAvailable < requestedBaseUnits) {
			throw new OutOfStockError(requestedBaseUnits - totalAvailable);
		}
		// Stock exists somewhere but was filtered out (expired, or pinned to a smaller batch).
		throw new OutOfStockError(remaining);
	}

	return {
		allocations,
		usedExpiredBatch: allocations.some((a) => a.expiryDate <= options.today)
	};
}
