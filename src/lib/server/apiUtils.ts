import { json } from '@sveltejs/kit';

export function jsonResponse(data: any, status = 200) {
	return json({ data, error: null }, { status });
}

export function errorResponse(code: string, message: string, status = 400) {
	const isInternalOrQuery =
		status >= 500 ||
		message.startsWith('Failed query:') ||
		message.includes('syntax error') ||
		message.includes('relation "');

	if (isInternalOrQuery) {
		console.error(`[API Error ${code}]`, message);
	}

	const safeMessage = isInternalOrQuery
		? 'An unexpected error occurred. Please try again.'
		: message;

	return json({ data: null, error: { code, message: safeMessage } }, { status });
}
