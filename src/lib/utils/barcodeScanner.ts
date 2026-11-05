/**
 * Barcode Scanner Hardware Wedge Handler
 *
 * Physical handheld and presentation barcode scanners emulate high-speed keyboard input
 * (inter-keystroke interval typically < 50ms) terminating with an 'Enter' key.
 */

export interface BarcodeScannerOptions {
	maxIntervalMs?: number;
	minBarcodeLength?: number;
	onScan: (barcode: string) => void | Promise<void>;
}

export interface BarcodeScannerKeyEvent {
	key: string;
	ctrlKey?: boolean;
	altKey?: boolean;
	metaKey?: boolean;
	preventDefault?: () => void;
	stopPropagation?: () => void;
}

export function createBarcodeScannerHandler(options: BarcodeScannerOptions) {
	const maxIntervalMs = options.maxIntervalMs ?? 50;
	const minBarcodeLength = options.minBarcodeLength ?? 4;
	let buffer: string[] = [];
	let lastTime = 0;

	return function handleKeyDown(e: BarcodeScannerKeyEvent): boolean {
		const now = Date.now();
		const interval = now - lastTime;
		lastTime = now;

		// If time between keystrokes exceeds threshold, this is not a scanner burst
		if (buffer.length > 0 && interval > maxIntervalMs) {
			buffer = [];
		}

		if (e.key === 'Enter') {
			if (buffer.length >= minBarcodeLength) {
				const barcode = buffer.join('').trim();
				buffer = [];
				if (barcode.length >= minBarcodeLength) {
					e.preventDefault?.();
					e.stopPropagation?.();
					options.onScan(barcode);
					return true;
				}
			}
			buffer = [];
			return false;
		}

		// Collect printable characters
		if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
			buffer.push(e.key);
		}

		return false;
	};
}
