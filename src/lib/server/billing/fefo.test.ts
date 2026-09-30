import { describe, expect, it } from 'vitest';
import { allocateFefo, OutOfStockError, type FefoBatch } from './fefo.js';

const TODAY = '2026-08-24';

const batch = (
	id: string,
	expiryDate: string,
	quantityRemaining: number,
	batchNo = id
): FefoBatch => ({
	id,
	batchNo,
	expiryDate,
	quantityRemaining
});

describe('allocateFefo', () => {
	it('allocates from the earliest-expiring batch first', () => {
		const result = allocateFefo(
			5,
			[batch('b-late', '2027-01-01', 10), batch('b-early', '2026-09-01', 10)],
			{ today: TODAY }
		);
		expect(result.allocations).toEqual([
			{ batchId: 'b-early', batchNo: 'b-early', expiryDate: '2026-09-01', quantityBaseUnits: 5 }
		]);
		expect(result.usedExpiredBatch).toBe(false);
	});

	it('spills into the next batch only when the first is exhausted (FEFO split)', () => {
		const result = allocateFefo(
			15,
			[batch('b1', '2027-01-01', 10), batch('b2', '2027-06-01', 10)],
			{ today: TODAY }
		);
		expect(result.allocations).toEqual([
			{ batchId: 'b1', batchNo: 'b1', expiryDate: '2027-01-01', quantityBaseUnits: 10 },
			{ batchId: 'b2', batchNo: 'b2', expiryDate: '2027-06-01', quantityBaseUnits: 5 }
		]);
	});

	it('skips expired batches by default even if they expire earliest', () => {
		const result = allocateFefo(
			3,
			[batch('b-expired', '2026-01-01', 50), batch('b-ok', '2027-01-01', 5)],
			{ today: TODAY }
		);
		expect(result.allocations.map((a) => a.batchId)).toEqual(['b-ok']);
	});

	it('treats a batch expiring today as expired', () => {
		expect(() => allocateFefo(1, [batch('b-today', TODAY, 5)], { today: TODAY })).toThrow(
			OutOfStockError
		);
	});

	it('allows expired batches with override and flags the usage', () => {
		const result = allocateFefo(2, [batch('b-expired', '2026-01-01', 9)], {
			today: TODAY,
			includeExpired: true
		});
		expect(result.allocations).toHaveLength(1);
		expect(result.usedExpiredBatch).toBe(true);
	});

	it('never allocates zero-stock batches', () => {
		const result = allocateFefo(
			2,
			[batch('b-zero', '2026-12-31', 0), batch('b-ok', '2027-01-01', 4)],
			{
				today: TODAY
			}
		);
		expect(result.allocations.map((a) => a.batchId)).toEqual(['b-ok']);
	});

	it('breaks expiry ties deterministically by batch id', () => {
		const result = allocateFefo(1, [batch('bbb', '2027-01-01', 5), batch('aaa', '2027-01-01', 5)], {
			today: TODAY
		});
		expect(result.allocations[0].batchId).toBe('aaa');
	});

	it('throws OutOfStockError with the true shortage when total stock is short', () => {
		try {
			allocateFefo(10, [batch('b1', '2027-01-01', 4)], { today: TODAY });
			expect.unreachable();
		} catch (e) {
			expect(e).toBeInstanceOf(OutOfStockError);
			expect((e as OutOfStockError).shortage).toBe(6);
		}
	});

	it('reports shortage when stock exists but is all expired and no override given', () => {
		try {
			allocateFefo(10, [batch('b-expired', '2026-01-01', 20)], { today: TODAY });
			expect.unreachable();
		} catch (e) {
			expect(e).toBeInstanceOf(OutOfStockError);
			expect((e as OutOfStockError).shortage).toBe(10);
		}
	});

	it('pins allocation to a specific batch when asked', () => {
		const result = allocateFefo(
			3,
			[batch('b-early', '2026-12-01', 10), batch('b-pinned', '2028-01-01', 10)],
			{ today: TODAY, pinnedBatchId: 'b-pinned' }
		);
		expect(result.allocations.map((a) => a.batchId)).toEqual(['b-pinned']);
	});

	it('rejects a pinned batch that does not exist or has no stock', () => {
		expect(() =>
			allocateFefo(1, [batch('b1', '2027-01-01', 5)], { today: TODAY, pinnedBatchId: 'nope' })
		).toThrow(/not found/);
		expect(() =>
			allocateFefo(1, [batch('b-zero', '2027-01-01', 0)], { today: TODAY, pinnedBatchId: 'b-zero' })
		).toThrow(OutOfStockError);
	});

	it('rejects invalid requested quantities', () => {
		expect(() => allocateFefo(0, [batch('b1', '2027-01-01', 5)], { today: TODAY })).toThrow();
		expect(() => allocateFefo(-2, [batch('b1', '2027-01-01', 5)], { today: TODAY })).toThrow();
		expect(() => allocateFefo(1.5, [batch('b1', '2027-01-01', 5)], { today: TODAY })).toThrow();
	});

	it('handles an empty candidate list as out of stock', () => {
		expect(() => allocateFefo(1, [], { today: TODAY })).toThrow(OutOfStockError);
	});
});
