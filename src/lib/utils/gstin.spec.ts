import { describe, it, expect } from 'vitest';
import { extractPanFromGstin, extractStateCode, getStateNameByCode, checkLicenseExpiry } from './gstin.js';

describe('gstin utilities', () => {
	it('extracts PAN and State code accurately from GSTIN', () => {
		const gstin = '09ADWPV1618G1ZY'; // From Image 7
		expect(extractPanFromGstin(gstin)).toBe('ADWPV1618G');
		expect(extractStateCode(gstin)).toBe('09');
		expect(getStateNameByCode('09')).toBe('09 UTTAR PRADESH');
	});

	it('extracts supplier PAN and state code', () => {
		const gstin = '09CVXPK3468G1ZT'; // From Image 6
		expect(extractPanFromGstin(gstin)).toBe('CVXPK3468G');
		expect(extractStateCode(gstin)).toBe('09');
	});

	it('handles empty or short strings safely', () => {
		expect(extractPanFromGstin('')).toBe('');
		expect(extractStateCode('')).toBe('');
		expect(getStateNameByCode('')).toBe('');
	});

	it('detects license expiry status', () => {
		expect(checkLicenseExpiry(undefined).isExpired).toBe(false);
		expect(checkLicenseExpiry('2020-01-01').isExpired).toBe(true);
		expect(checkLicenseExpiry('2099-01-01').isExpired).toBe(false);
	});
});
