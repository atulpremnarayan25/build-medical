/**
 * Integer paise money math utilities.
 * 1 INR = 100 paise. Eliminates floating point inaccuracies.
 */

/** Parse a string or number amount into integer paise. */
export function toPaise(value: string | number): number {
	if (typeof value === 'number') {
		if (!Number.isFinite(value)) throw new Error(`Invalid amount: ${value}`);
		return Math.round(value * 100);
	}
	const trimmed = String(value).trim();
	if (!trimmed) return 0;
	if (!/^-?\d+(\.\d{1,4})?$/.test(trimmed)) throw new Error(`Invalid amount: "${value}"`);
	const neg = trimmed.startsWith('-');
	const [whole, frac = ''] = trimmed.replace(/^-/, '').split('.');
	const paddedFrac = (frac + '00').slice(0, 2);
	const rest = frac.length > 2 ? frac.slice(2) : '';
	let paise = Number(whole) * 100 + Number(paddedFrac);
	if (Number(rest.slice(0, 1)) >= 5) paise += 1;
	return neg ? -paise : paise;
}

/** Format integer paise to decimal string e.g. "100.50". */
export function fromPaise(paise: number): string {
	const sign = paise < 0 ? '-' : '';
	const abs = Math.abs(Math.round(paise));
	const whole = Math.floor(abs / 100);
	const frac = String(abs % 100).padStart(2, '0');
	return `${sign}${whole}.${frac}`;
}

/** Integer paise -> rupee number with 2 decimals. */
export function paiseToRupees(paise: number): number {
	return Math.round(paise) / 100;
}

/** Round half-up to nearest rupee (in paise, i.e. multiples of 100). */
export function roundToRupee(paise: number): number {
	return Math.floor((Math.abs(paise) + 50) / 100) * 100 * Math.sign(paise || 1);
}

/** Apply percentage to paise, half-up. e.g. percentOf(10000, 12) => 1200 paise */
export function percentOf(paise: number, pct: string | number): number {
	const pctNum = typeof pct === 'number' ? pct : parseFloat(pct) || 0;
	const pctPaiseBased = Math.round(pctNum * 100);
	const num = Math.round(paise) * pctPaiseBased;
	return Math.sign(num) * Math.floor((Math.abs(num) + 5000) / 10000);
}
