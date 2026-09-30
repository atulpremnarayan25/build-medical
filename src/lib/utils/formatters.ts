/**
 * Indian Pharma ERP Formatting Utilities
 */

export function formatCurrency(amount: number | null | undefined): string {
	if (amount === null || amount === undefined || isNaN(amount)) {
		return '₹0.00';
	}
	return (
		'₹' +
		amount.toLocaleString('en-IN', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		})
	);
}

export function formatDate(dateStr: string | Date | null | undefined): string {
	if (!dateStr) return '-';
	try {
		const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
		if (isNaN(d.getTime())) return String(dateStr);
		return d.toLocaleDateString('en-IN', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	} catch {
		return String(dateStr);
	}
}

export function formatDateTime(dateStr: string | Date | null | undefined): string {
	if (!dateStr) return '-';
	try {
		const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
		if (isNaN(d.getTime())) return String(dateStr);
		return (
			d.toLocaleDateString('en-IN', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric'
			}) +
			' ' +
			d.toLocaleTimeString('en-IN', {
				hour: '2-digit',
				minute: '2-digit',
				hour12: true
			})
		);
	} catch {
		return String(dateStr);
	}
}

/**
 * Converts a number to Indian currency words (e.g. 1240.50 -> "Rupees One Thousand Two Hundred Forty and Fifty Paise Only")
 */
export function numberToWordsRupees(amount: number): string {
	if (isNaN(amount) || amount === 0) return 'Rupees Zero Only';

	const ones = [
		'',
		'One',
		'Two',
		'Three',
		'Four',
		'Five',
		'Six',
		'Seven',
		'Eight',
		'Nine',
		'Ten',
		'Eleven',
		'Twelve',
		'Thirteen',
		'Fourteen',
		'Fifteen',
		'Sixteen',
		'Seventeen',
		'Eighteen',
		'Nineteen'
	];

	const tens = [
		'',
		'',
		'Twenty',
		'Thirty',
		'Forty',
		'Fifty',
		'Sixty',
		'Seventy',
		'Eighty',
		'Ninety'
	];

	function convertLessThanThousand(n: number): string {
		let current = '';
		if (n >= 100) {
			current += ones[Math.floor(n / 100)] + ' Hundred ';
			n %= 100;
		}
		if (n >= 20) {
			current += tens[Math.floor(n / 10)] + ' ';
			n %= 10;
		}
		if (n > 0) {
			current += ones[n] + ' ';
		}
		return current.trim();
	}

	const whole = Math.floor(Math.abs(amount));
	const fraction = Math.round((Math.abs(amount) - whole) * 100);

	let words = '';

	const crore = Math.floor(whole / 10000000);
	let rem = whole % 10000000;

	const lakh = Math.floor(rem / 100000);
	rem %= 100000;

	const thousand = Math.floor(rem / 1000);
	rem %= 1000;

	const rest = rem;

	if (crore > 0) {
		words += convertLessThanThousand(crore) + ' Crore ';
	}
	if (lakh > 0) {
		words += convertLessThanThousand(lakh) + ' Lakh ';
	}
	if (thousand > 0) {
		words += convertLessThanThousand(thousand) + ' Thousand ';
	}
	if (rest > 0) {
		words += convertLessThanThousand(rest) + ' ';
	}

	words = words.trim();
	if (!words) words = 'Zero';

	let result = `Rupees ${words}`;
	if (fraction > 0) {
		result += ` and ${convertLessThanThousand(fraction)} Paise`;
	}
	result += ' Only';

	return result;
}
