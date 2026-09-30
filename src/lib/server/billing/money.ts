/**
 * Money helpers for billing math.
 *
 * All arithmetic happens in integer paise (1 INR = 100 paise). PostgreSQL
 * NUMERIC arrives as a string; converting to paise integers keeps GST and
 * total math exact — no floating-point drift in financial results.
 */

/** Parse a NUMERIC string (or number) into integer paise. Throws on garbage. */
export function toPaise(value: string | number): number {
	if (typeof value === 'number') {
		if (!Number.isFinite(value)) throw new Error(`Invalid amount: ${value}`);
		return Math.round(value * 100);
	}
	const trimmed = value.trim();
	if (!/^-?\d+(\.\d{1,4})?$/.test(trimmed)) throw new Error(`Invalid amount: "${value}"`);
	const neg = trimmed.startsWith('-');
	const [whole, frac = ''] = trimmed.replace(/^-/, '').split('.');
	const paddedFrac = (frac + '00').slice(0, 2);
	const rest = frac.length > 2 ? frac.slice(2) : '';
	// Anything beyond paise (NUMERIC scale > 2) rounds half-up into paise.
	let paise = Number(whole) * 100 + Number(paddedFrac);
	if (Number(rest.slice(0, 1)) >= 5) paise += 1;
	return neg ? -paise : paise;
}

/** Format integer paise as a plain decimal string safe for NUMERIC columns. */
export function fromPaise(paise: number): string {
	const sign = paise < 0 ? '-' : '';
	const abs = Math.abs(Math.round(paise));
	const whole = Math.floor(abs / 100);
	const frac = String(abs % 100).padStart(2, '0');
	return `${sign}${whole}.${frac}`;
}

/** Integer paise -> rupee number with at most 2 decimals (for API responses). */
export function paiseToRupees(paise: number): number {
	return Math.round(paise) / 100;
}

/** Round half-up to the nearest rupee — Indian bills round the grand total. */
export function roundToRupee(paise: number): number {
	return Math.floor((Math.abs(paise) + 50) / 100) * 100 * Math.sign(paise || 1);
}

/** Apply a percentage (e.g. GST rate 12 => 12%) to an amount in paise, half-up. */
export function percentOf(paise: number, pct: string | number): number {
	const pctPaiseBased = toPaise(String(pct)); // rate scaled by 100 (12% -> 1200)
	// amount * pct / 100 computed in rational space, rounded half-up:
	const num = Math.round(paise) * pctPaiseBased;
	return Math.sign(num) * Math.floor((Math.abs(num) + 5000) / 10000);
}
