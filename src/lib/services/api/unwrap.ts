/**
 * API responses come in two shapes depending on the endpoint:
 * - Envelope: { data: T, error: { code, message } | null } (apiUtils.jsonResponse)
 * - Bare: T (older endpoints using kit's json() directly)
 * This normalizes both and turns non-2xx into thrown Errors with server messages.
 */
export async function unwrap<T>(res: Response): Promise<T> {
	let body: unknown;
	try {
		body = await res.json();
	} catch {
		throw new Error(`Request failed (${res.status})`);
	}

	if (!res.ok) {
		const err =
			body && typeof body === 'object' && 'error' in body && body.error
				? (body.error as { message?: string })
				: null;
		throw new Error(err?.message || `Request failed (${res.status})`);
	}

	if (body && typeof body === 'object' && 'data' in body && 'error' in body) {
		return body.data as T;
	}
	return body as T;
}
