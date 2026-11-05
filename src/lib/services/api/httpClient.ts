/**
 * High-Performance API HTTP Client with In-Flight Request Deduplication,
 * Auto-Timeout Guards, and AbortController Support.
 */

interface FetchOptions extends RequestInit {
	timeoutMs?: number;
	dedupe?: boolean;
}

// In-flight GET promise registry to prevent duplicate concurrent network calls
const inFlightRequests = new Map<string, Promise<Response>>();

export async function apiFetch(url: string, options: FetchOptions = {}): Promise<Response> {
	const method = (options.method || 'GET').toUpperCase();
	const dedupeKey = method === 'GET' && options.dedupe !== false ? url : null;

	if (dedupeKey && inFlightRequests.has(dedupeKey)) {
		// Return cloned response from the in-flight promise so body can be read independently
		const originalResponse = await inFlightRequests.get(dedupeKey)!;
		return originalResponse.clone();
	}

	const timeoutMs = options.timeoutMs ?? 10_000;
	let timeoutId: ReturnType<typeof setTimeout> | undefined;

	let signal = options.signal;
	let abortController: AbortController | undefined;

	if (!signal && timeoutMs > 0) {
		abortController = new AbortController();
		signal = abortController.signal;
		timeoutId = setTimeout(() => {
			abortController?.abort(new Error(`API request timed out after ${timeoutMs}ms`));
		}, timeoutMs);
	}

	const fetchPromise = (async () => {
		try {
			const res = await fetch(url, {
				...options,
				signal
			});
			return res;
		} finally {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
			if (dedupeKey) {
				inFlightRequests.delete(dedupeKey);
			}
		}
	})();

	if (dedupeKey) {
		inFlightRequests.set(dedupeKey, fetchPromise);
	}

	return fetchPromise;
}
