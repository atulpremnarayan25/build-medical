import { describe, expect, it } from 'vitest';
import { computeBillTotals, computeLineGst } from './gst.js';

describe('computeLineGst', () => {
	it('splits intra-state tax equally into CGST + SGST', () => {
		const gst = computeLineGst(10000, 12, false); // 100.00 @ 12%
		expect(gst.totalGstPaise).toBe(1200);
		expect(gst.cgstPaise).toBe(600);
		expect(gst.sgstPaise).toBe(600);
		expect(gst.igstPaise).toBe(0);
	});

	it('routes the whole tax to IGST for inter-state sales', () => {
		const gst = computeLineGst(10000, 18, true);
		expect(gst.totalGstPaise).toBe(1800);
		expect(gst.igstPaise).toBe(1800);
		expect(gst.cgstPaise).toBe(0);
		expect(gst.sgstPaise).toBe(0);
	});

	it('handles odd paise so halves always sum to the total', () => {
		const gst = computeLineGst(101, 12, false); // 1.01 @ 12% = 12 paise -> even split
		expect(gst.cgstPaise + gst.sgstPaise).toBe(gst.totalGstPaise);

		const odd = computeLineGst(105, 5, false); // 1.05 @ 5% = 5 paise (odd)
		expect(odd.cgstPaise + odd.sgstPaise).toBe(odd.totalGstPaise);
	});

	it('zero-rated items produce zero tax', () => {
		const gst = computeLineGst(500000, 0, false);
		expect(gst.totalGstPaise).toBe(0);
	});
});

describe('computeBillTotals', () => {
	const lines = [
		{ taxablePaise: 10000, gstRatePct: 12 }, // 100.00 -> 12.00 GST
		{ taxablePaise: 5000, gstRatePct: 5 } // 50.00  -> 2.50 GST
	];

	it('sums line taxes and rounds the grand total to whole rupees', () => {
		const totals = computeBillTotals({ lines, interState: false });
		expect(totals.subtotalPaise).toBe(15000);
		expect(totals.taxableTotalPaise).toBe(15000);
		expect(totals.gstTotalPaise).toBe(1450);
		// exact = 16450 paise -> grand 16500
		expect(totals.grandTotalPaise).toBe(16500);
		expect(totals.roundOffPaise).toBe(50);
	});

	it('applies a bill-level discount before GST proportionally', () => {
		const totals = computeBillTotals({
			lines: [{ taxablePaise: 10000, gstRatePct: 10 }],
			interState: false,
			discountPaise: 1000
		});
		expect(totals.discountPaise).toBe(1000);
		expect(totals.taxableTotalPaise).toBe(9000);
		expect(totals.gstTotalPaise).toBe(900);
	});

	it('clamps discounts larger than the bill', () => {
		const totals = computeBillTotals({ lines, interState: false, discountPaise: 999999 });
		expect(totals.discountPaise).toBe(totals.subtotalPaise);
		expect(totals.taxableTotalPaise).toBe(0);
		expect(totals.gstTotalPaise).toBe(0);
		expect(totals.grandTotalPaise).toBe(0);
	});

	it('keeps per-line breakdowns consistent with the totals', () => {
		const totals = computeBillTotals({ lines, interState: false });
		const sumLines = totals.lines.reduce((s, l) => s + l.totalGstPaise, 0);
		expect(sumLines).toBe(totals.gstTotalPaise);
	});
});
