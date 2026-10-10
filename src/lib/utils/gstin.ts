/**
 * Indian GSTIN & statutory drug license utilities for pharma ERP.
 */

export const GST_STATE_MAP: Record<string, string> = {
	'01': '01 JAMMU AND KASHMIR',
	'02': '02 HIMACHAL PRADESH',
	'03': '03 PUNJAB',
	'04': '04 CHANDIGARH',
	'05': '05 UTTARAKHAND',
	'06': '06 HARYANA',
	'07': '07 DELHI',
	'08': '08 RAJASTHAN',
	'09': '09 UTTAR PRADESH',
	'10': '10 BIHAR',
	'11': '11 SIKKIM',
	'12': '12 ARUNACHAL PRADESH',
	'13': '13 NAGALAND',
	'14': '14 MANIPUR',
	'15': '15 MIZORAM',
	'16': '16 TRIPURA',
	'17': '17 MEGHALAYA',
	'18': '18 ASSAM',
	'19': '19 WEST BENGAL',
	'20': '20 JHARKHAND',
	'21': '21 ODISHA',
	'22': '22 CHHATTISGARH',
	'23': '23 MADHYA PRADESH',
	'24': '24 GUJARAT',
	'26': '26 DADRA & NAGAR HAVELI AND DAMAN & DIU',
	'27': '27 MAHARASHTRA',
	'29': '29 KARNATAKA',
	'30': '30 GOA',
	'31': '31 LAKSHADWEEP',
	'32': '32 KERALA',
	'33': '33 TAMIL NADU',
	'34': '34 PUDUCHERRY',
	'35': '35 ANDAMAN AND NICOBAR ISLANDS',
	'36': '36 TELANGANA',
	'37': '37 ANDHRA PRADESH',
	'38': '38 LADAKH'
};

/**
 * Extracts 10-character PAN from GSTIN (characters 3 to 12).
 * e.g. 09ADWPV1618G1ZY -> ADWPV1618G
 */
export function extractPanFromGstin(gstin?: string | null): string {
	if (!gstin) return '';
	const clean = gstin.trim().toUpperCase();
	if (clean.length >= 12) {
		return clean.substring(2, 12);
	}
	return '';
}

/**
 * Extracts 2-digit state code from GSTIN.
 * e.g. 09ADWPV1618G1ZY -> 09
 */
export function extractStateCode(gstin?: string | null): string {
	if (!gstin) return '';
	const clean = gstin.trim();
	if (clean.length >= 2) {
		return clean.substring(0, 2);
	}
	return '';
}

/**
 * Returns formatted state name from 2-digit state code.
 */
export function getStateNameByCode(code?: string | null): string {
	if (!code) return '';
	const clean = code.trim();
	return GST_STATE_MAP[clean] || clean;
}

/**
 * Checks if a drug license has expired or is nearing expiry (within 30 days).
 */
export function checkLicenseExpiry(expiryDateStr?: string | null): {
	isExpired: boolean;
	isExpiringSoon: boolean;
	daysRemaining: number | null;
} {
	if (!expiryDateStr) {
		return { isExpired: false, isExpiringSoon: false, daysRemaining: null };
	}
	try {
		const expiry = new Date(expiryDateStr);
		if (isNaN(expiry.getTime())) {
			return { isExpired: false, isExpiringSoon: false, daysRemaining: null };
		}
		const now = new Date();
		// compare date only
		const diffMs = expiry.getTime() - now.getTime();
		const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
		return {
			isExpired: daysRemaining < 0,
			isExpiringSoon: daysRemaining >= 0 && daysRemaining <= 30,
			daysRemaining
		};
	} catch {
		return { isExpired: false, isExpiringSoon: false, daysRemaining: null };
	}
}
