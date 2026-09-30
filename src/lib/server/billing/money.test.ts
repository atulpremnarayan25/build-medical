import { describe, expect, it } from 'vitest';
import { fromPaise, percentOf, paiseToRupees, roundToRupee, toPaise } from './money.js';

describe('money', () => {
	it('parses NUMERIC strings into paise exactly', () => {
		expect(toPaise('12.34')).toBe(1234);
		expect(toPaise('0.01')).toBe(1);
		expect(toPaise('125')).toBe(12500);
		expect(toPaise('12.3456')).toBe(1235); // scale > 2 rounds half-up
		expect(toPaise('-4.20')).toBe(-420);
	});

	it('parses JS numbers safely (no float drift)', () => {
		expect(toPaise(0.1 + 0.2)).toBe(30); // 0.30000000000000004 -> 30 paise
		expect(toPaise(19.99)).toBe(1999);
	});

	it('throws on malformed amounts', () => {
		expect(() => toPaise('abc')).toThrow();
		expect(() => toPaise(NaN)).toThrow();
		expect(() => toPaise(Infinity)).toThrow();
	});

	it('round-trips paise through decimal strings', () => {
		for (const p of [0, 1, 99, 100, 12345, -999]) {
			expect(toPaise(fromPaise(p))).toBe(p);
		}
		expect(fromPaise(12345)).toBe('123.45');
		expect(fromPaise(5)).toBe('0.05');
	});

	it('applies GST percentages with half-up rounding', () => {
		expect(percentOf(10000, 12)).toBe(1200); // 100.00 @ 12% = 12.00
		expect(percentOf(333, '2.5')).toBe(8); // 3.33 @ 2.5% = 0.083125 -> 8
		expect(percentOf(101, 12)).toBe(12); // 1.01 @ 12% = 0.1212 -> 12
	});

	it('rounds grand totals to whole rupees half-up', () => {
		expect(roundToRupee(1050)).toBe(1100);
		expect(roundToRupee(1049)).toBe(1000);
		expect(roundToRupee(9950)).toBe(10000);
	});

	it('converts to rupee numbers for API responses', () => {
		expect(paiseToRupees(12345)).toBe(123.45);
	});
});
