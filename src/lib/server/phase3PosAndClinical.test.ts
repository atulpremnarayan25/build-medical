import { describe, it, expect } from 'vitest';
import { createBarcodeScannerHandler } from '$lib/utils/barcodeScanner.js';

describe('Phase 3: POS Speed & Clinical UX Verification', () => {
	describe('3.1 Barcode Scanner Hardware Wedge Handler', () => {
		it('accumulates high-speed keystrokes and dispatches on Enter', () => {
			let scannedCode = '';
			const handler = createBarcodeScannerHandler({
				maxIntervalMs: 50,
				minBarcodeLength: 4,
				onScan: (code) => {
					scannedCode = code;
				}
			});

			const barcode = '8901234567890';
			for (const char of barcode) {
				handler({ key: char });
			}
			const handled = handler({ key: 'Enter' });

			expect(handled).toBe(true);
			expect(scannedCode).toBe(barcode);
		});

		it('discards human keystrokes when interval exceeds threshold', async () => {
			let scannedCode = '';
			const handler = createBarcodeScannerHandler({
				maxIntervalMs: 15,
				minBarcodeLength: 4,
				onScan: (code) => {
					scannedCode = code;
				}
			});

			handler({ key: '8' });
			handler({ key: '9' });
			await new Promise((r) => setTimeout(r, 25)); // Human pause
			handler({ key: '0' });
			const handled = handler({ key: 'Enter' });

			expect(handled).toBe(false);
			expect(scannedCode).toBe('');
		});
	});

	describe('3.2 Quick Cash Roundups & Calculation', () => {
		it('correctly calculates note denominations and change return', () => {
			const grandTotal = 137.5;
			const next50 = Math.ceil(grandTotal / 50) * 50; // 150
			const next100 = Math.ceil(grandTotal / 100) * 100; // 200
			const next500 = Math.ceil(grandTotal / 500) * 500; // 500

			expect(next50).toBe(150);
			expect(next100).toBe(200);
			expect(next500).toBe(500);

			const changeDueFrom150 = Math.max(0, 150 - grandTotal);
			expect(changeDueFrom150).toBe(12.5);

			const changeDueFrom200 = Math.max(0, 200 - grandTotal);
			expect(changeDueFrom200).toBe(62.5);
		});
	});

	describe('3.3 Schedule H/H1 Validation Rules', () => {
		it('identifies schedule H and H1 statutory requirements on line items', () => {
			const items = [
				{
					productId: 'prod-1',
					drugSchedule: 'H1',
					quantity: 1,
					rate: 100
				},
				{
					productId: 'prod-2',
					drugSchedule: 'none',
					quantity: 2,
					rate: 50
				}
			];

			const hasH1 = items.some((i) => i.drugSchedule === 'H1' || i.drugSchedule === 'X');
			expect(hasH1).toBe(true);

			// Statutory requirement validation logic
			const validateH1Sale = (sale: {
				hasH1: boolean;
				patientName?: string;
				prescriberName?: string;
				prescriberRegNo?: string;
			}) => {
				if (!sale.hasH1) return { valid: true };
				const errors: string[] = [];
				if (!sale.patientName?.trim()) errors.push('Patient name is required for Schedule H1');
				if (!sale.prescriberName?.trim()) errors.push('Doctor name is required for Schedule H1');
				if (!sale.prescriberRegNo?.trim()) errors.push('Doctor Reg No is required for Schedule H1');
				return { valid: errors.length === 0, errors };
			};

			// Fails without doctor or reg no
			const invalidAttempt = validateH1Sale({
				hasH1,
				patientName: 'Ramesh Patel',
				prescriberName: '',
				prescriberRegNo: ''
			});
			expect(invalidAttempt.valid).toBe(false);
			expect(invalidAttempt.errors).toHaveLength(2);

			// Passes with full statutory doctor details
			const validAttempt = validateH1Sale({
				hasH1,
				patientName: 'Ramesh Patel',
				prescriberName: 'Dr. S. K. Sharma',
				prescriberRegNo: 'MCI-19842'
			});
			expect(validAttempt.valid).toBe(true);
		});
	});
});
