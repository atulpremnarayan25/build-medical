import { describe, it, expect, vi } from 'vitest';
import { createBarcodeScannerHandler } from './barcodeScanner.js';

describe('Barcode Scanner Hardware Wedge Handler', () => {
	it('detects rapid keystrokes ending in Enter as a barcode scan', () => {
		const onScan = vi.fn();
		const handler = createBarcodeScannerHandler({
			maxIntervalMs: 50,
			minBarcodeLength: 4,
			onScan
		});

		const barcode = '8901234567890';
		for (const char of barcode) {
			const prevented = handler({ key: char });
			expect(prevented).toBe(false);
		}

		const preventDefault = vi.fn();
		const stopPropagation = vi.fn();
		const handled = handler({ key: 'Enter', preventDefault, stopPropagation });

		expect(handled).toBe(true);
		expect(preventDefault).toHaveBeenCalled();
		expect(onScan).toHaveBeenCalledWith('8901234567890');
	});

	it('ignores slow human typing where keystroke intervals exceed threshold', async () => {
		const onScan = vi.fn();
		const handler = createBarcodeScannerHandler({
			maxIntervalMs: 20,
			minBarcodeLength: 4,
			onScan
		});

		handler({ key: '1' });
		handler({ key: '2' });

		// Wait 30ms (> 20ms)
		await new Promise((r) => setTimeout(r, 30));

		handler({ key: '3' });
		const handled = handler({ key: 'Enter' });

		expect(handled).toBe(false);
		expect(onScan).not.toHaveBeenCalled();
	});

	it('ignores inputs shorter than minBarcodeLength', () => {
		const onScan = vi.fn();
		const handler = createBarcodeScannerHandler({
			maxIntervalMs: 50,
			minBarcodeLength: 5,
			onScan
		});

		handler({ key: 'A' });
		handler({ key: 'B' });
		handler({ key: 'C' });
		const handled = handler({ key: 'Enter' });

		expect(handled).toBe(false);
		expect(onScan).not.toHaveBeenCalled();
	});
});
