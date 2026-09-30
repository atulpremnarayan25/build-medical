import { percentOf, roundToRupee } from './money.js';

/**
 * GST computation per NFR-013 / FR-SAL-005.
 * Intra-state sale: tax splits equally into CGST + SGST.
 * Inter-state sale: full amount is IGST.
 */
export interface GstBreakdown {
	gstRate: number; // percentage as given, e.g. 12
	taxablePaise: number;
	totalGstPaise: number;
	cgstPaise: number;
	sgstPaise: number;
	igstPaise: number;
}

export function computeLineGst(
	taxablePaise: number,
	gstRatePct: string | number,
	interState: boolean
): GstBreakdown {
	const totalGst = percentOf(taxablePaise, gstRatePct);
	if (interState) {
		return {
			gstRate: Number(gstRatePct),
			taxablePaise,
			totalGstPaise: totalGst,
			cgstPaise: 0,
			sgstPaise: 0,
			igstPaise: totalGst
		};
	}
	// Split CGST/SGST evenly; odd paise (from rounding) go to SGST so halves always sum to total.
	const cgst = Math.floor(totalGst / 2);
	return {
		gstRate: Number(gstRatePct),
		taxablePaise,
		totalGstPaise: totalGst,
		cgstPaise: cgst,
		sgstPaise: totalGst - cgst,
		igstPaise: 0
	};
}

export interface BillTotalsInput {
	lines: { taxablePaise: number; gstRatePct: string | number }[];
	interState: boolean;
	discountPaise?: number;
}

export interface BillTotals {
	subtotalPaise: number; // list value before discounts
	discountPaise: number;
	taxableTotalPaise: number;
	gstTotalPaise: number;
	grandTotalPaise: number; // taxable + gst, rounded to whole rupee
	roundOffPaise: number; // grand - exact
	lines: GstBreakdown[];
}

/** Totals for the whole bill. Bill-level discount reduces taxable value (GST applies post-discount). */
export function computeBillTotals(input: BillTotalsInput): BillTotals {
	const subtotal = input.lines.reduce((s, l) => s + l.taxablePaise, 0);
	const discount = Math.min(Math.max(input.discountPaise ?? 0, 0), subtotal);

	let lines: GstBreakdown[];
	if (discount > 0 && subtotal > 0) {
		// Apply the bill-level discount proportionally across lines BEFORE computing GST.
		const factor = (subtotal - discount) / subtotal;
		lines = input.lines.map((l) =>
			computeLineGst(Math.floor(l.taxablePaise * factor), l.gstRatePct, input.interState)
		);
	} else {
		lines = input.lines.map((l) => computeLineGst(l.taxablePaise, l.gstRatePct, input.interState));
	}

	const taxableTotal = lines.reduce((s, l) => s + l.taxablePaise, 0);
	const gstTotal = lines.reduce((s, l) => s + l.totalGstPaise, 0);
	const exact = taxableTotal + gstTotal;
	const grand = roundToRupee(exact);
	return {
		subtotalPaise: subtotal,
		discountPaise: discount,
		taxableTotalPaise: taxableTotal,
		gstTotalPaise: gstTotal,
		grandTotalPaise: grand,
		roundOffPaise: grand - exact,
		lines
	};
}
