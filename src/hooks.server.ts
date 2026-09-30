import type { Handle } from '@sveltejs/kit';
import { validateSession } from '$lib/server/auth/index.js';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get('sessionId');

	if (sessionId) {
		const user = await validateSession(sessionId);
		if (user) {
			event.locals.user = { ...user, active: user.isActive };
		} else {
			event.cookies.delete('sessionId', { path: '/' });
		}
	}

	// Protected routes check
	const isUnprotected =
		event.url.pathname === '/' ||
		event.url.pathname === '/login' ||
		event.url.pathname === '/register' ||
		event.url.pathname.startsWith('/api/public') ||
		event.url.pathname.startsWith('/_');
	if (!isUnprotected && !event.locals.user) {
		if (event.url.pathname.startsWith('/api/')) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		return new Response(null, {
			status: 302,
			headers: {
				location: '/login'
			}
		});
	}

	// Authenticated pages must never be served from cache: after logout, a
	// cached copy (HTTP cache or back/forward cache) would show the app as
	// still logged in. Scope to document requests to keep API responses' own
	// caching semantics untouched.
	const response = await resolve(event);
	const acceptsHtml = event.request.headers.get('accept')?.includes('text/html') ?? false;
	if (event.locals.user && acceptsHtml) {
		response.headers.set('cache-control', 'no-store');
	}

	return response;
};
