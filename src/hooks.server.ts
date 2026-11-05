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
		event.url.pathname === '/api/health' ||
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

	// Centralized RBAC: restrict administrative operations to owner_admin
	if (event.locals.user && event.locals.user.role !== 'owner_admin') {
		const pathname = event.url.pathname;
		const method = event.request.method;
		const isAdminOnly =
			pathname.startsWith('/api/users') ||
			pathname.startsWith('/api/sync') ||
			pathname.startsWith('/api/settings/backup') ||
			pathname.startsWith('/api/settings/network') ||
			(method === 'POST' && pathname.startsWith('/api/settings')) ||
			pathname.startsWith('/api/reports') ||
			pathname.startsWith('/api/inventory/adjustments') ||
			pathname.endsWith('/cancel') ||
			pathname.endsWith('/adjust') ||
			(method === 'POST' && pathname === '/api/purchases') ||
			(method === 'POST' && pathname === '/api/suppliers') ||
			(method === 'PATCH' && pathname.startsWith('/api/suppliers')) ||
			(method === 'POST' && pathname === '/api/products') ||
			(method === 'PATCH' && pathname.startsWith('/api/products')) ||
			(method === 'POST' && pathname === '/api/batches') ||
			(method === 'PATCH' && pathname.startsWith('/api/batches')) ||
			method === 'DELETE';

		if (isAdminOnly) {
			return new Response(JSON.stringify({ error: 'Forbidden: Admin role required' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' }
			});
		}
	}

	// Authenticated pages must never be served from cache: after logout, a
	// cached copy (HTTP cache or back/forward cache) would show the app as
	// still logged in. Scope to document requests to keep API responses' own
	// caching semantics untouched.
	const response = await resolve(event);

	// Defensive HTTP security headers
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	if (process.env.NODE_ENV === 'production') {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}

	// Static asset caching for fonts, icons, immutable chunks
	if (event.url.pathname.startsWith('/_app/immutable/')) {
		response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
	} else if (event.url.pathname.match(/\.(woff2?|ttf|otf|eot|webp|avif|png|jpg|jpeg|svg|ico)$/)) {
		response.headers.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
	}

	const acceptsHtml = event.request.headers.get('accept')?.includes('text/html') ?? false;
	if (event.locals.user && acceptsHtml) {
		response.headers.set('Cache-Control', 'no-store');
	}

	return response;
};
