import { describe, it, expect } from 'vitest';
import { calculateDeal, parseDealString } from './dealScheme.js';

describe('dealScheme utilities', () => {
	it('parses deal string correctly', () => {
		expect(parseDealString('89+1')).toEqual([89, 1]);
		expect(parseDealString(' 10 + 2 ')).toEqual([10, 2]);
		expect(parseDealString('invalid')).toBeNull();
		expect(parseDealString('')).toBeNull();
	});

	it('calculates deal when input is billed quantity', () => {
		// Billed 89 with 89+1 gives 1 free, 90 total
		const res1 = calculateDeal(89, '89+1', false);
		expect(res1.billedQty).toBe(89);
		expect(res1.freeQty).toBe(1);
		expect(res1.totalQty).toBe(90);

		// Billed 20 with 10+1 gives 2 free, 22 total
		const res2 = calculateDeal(20, '10+1', false);
		expect(res2.billedQty).toBe(20);
		expect(res2.freeQty).toBe(2);
		expect(res2.totalQty).toBe(22);
	});

	it('calculates deal when input is total received quantity', () => {
		// Total 90 with 89+1 gives 89 billed, 1 free
		const res = calculateDeal(90, '89+1', true);
		expect(res.billedQty).toBe(89);
		expect(res.freeQty).toBe(1);
		expect(res.totalQty).toBe(90);
	});

	it('gracefully handles missing or blank scheme', () => {
		const res = calculateDeal(50, '', false);
		expect(res.billedQty).toBe(50);
		expect(res.freeQty).toBe(0);
		expect(res.totalQty).toBe(50);
	});
});
