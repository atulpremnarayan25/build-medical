/**
 * Pharma Deal Scheme Parser (e.g. "89+1", "10+1", "10+2")
 * Calculates bonus/free quantity and effective landing rate per unit.
 */

export interface DealCalculation {
	deal: string;
	billedQty: number;
	freeQty: number;
	totalQty: number;
	effectiveDiscountPct: number;
}

/**
 * Parses a deal string like "89+1" or "10+2".
 * Returns [buyQty, freeQty] or null if invalid.
 */
export function parseDealString(dealStr?: string | null): [number, number] | null {
	if (!dealStr) return null;
	const clean = dealStr.trim();
	const match = clean.match(/^(\d+)\s*\+\s*(\d+)$/);
	if (!match) return null;
	const buy = parseInt(match[1], 10);
	const free = parseInt(match[2], 10);
	if (isNaN(buy) || isNaN(free) || buy <= 0 || free <= 0) return null;
	return [buy, free];
}

/**
 * Calculates deal scheme quantities given either billed quantity or total quantity.
 * If inputIsTotal = false (default):
 *   billedQty = 89, deal = "89+1" -> freeQty = 1, totalQty = 90
 *   billedQty = 178, deal = "89+1" -> freeQty = 2, totalQty = 180
 *   billedQty = 20, deal = "10+1" -> freeQty = 2, totalQty = 22
 * If inputIsTotal = true:
 *   totalQty = 90, deal = "89+1" -> billedQty = 89, freeQty = 1
 */
export function calculateDeal(
	qty: number,
	dealStr?: string | null,
	inputIsTotal = false
): DealCalculation {
	const parsed = parseDealString(dealStr);
	if (!parsed || qty <= 0) {
		return {
			deal: dealStr || '',
			billedQty: Math.max(0, qty),
			freeQty: 0,
			totalQty: Math.max(0, qty),
			effectiveDiscountPct: 0
		};
	}

	const [buy, free] = parsed;
	const lotSize = buy + free;

	if (inputIsTotal) {
		const numLots = Math.floor(qty / lotSize);
		const remainder = qty % lotSize;
		const totalFree = numLots * free;
		const billed = numLots * buy + remainder;
		const effDisc = qty > 0 ? (totalFree / qty) * 100 : 0;
		return {
			deal: `${buy}+${free}`,
			billedQty: billed,
			freeQty: totalFree,
			totalQty: qty,
			effectiveDiscountPct: Math.round(effDisc * 100) / 100
		};
	} else {
		// qty is billed quantity
		const numLots = Math.floor(qty / buy);
		const totalFree = numLots * free;
		const total = qty + totalFree;
		const effDisc = total > 0 ? (totalFree / total) * 100 : 0;
		return {
			deal: `${buy}+${free}`,
			billedQty: qty,
			freeQty: totalFree,
			totalQty: total,
			effectiveDiscountPct: Math.round(effDisc * 100) / 100
		};
	}
}
