import { json } from '@sveltejs/kit';

export function jsonResponse(data: any, status = 200) {
	return json({ data, error: null }, { status });
}

export function errorResponse(code: string, message: string, status = 400) {
	return json({ data: null, error: { code, message } }, { status });
}
