/**
 * Money helpers for billing math.
 *
 * All arithmetic happens in integer paise (1 INR = 100 paise). PostgreSQL
 * NUMERIC arrives as a string; converting to paise integers keeps GST and
 * total math exact — no floating-point drift in financial results.
 */

export {
	toPaise,
	fromPaise,
	paiseToRupees,
	roundToRupee,
	percentOf
} from '$lib/utils/money.js';
