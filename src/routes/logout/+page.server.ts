import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { Cookies } from '@sveltejs/kit';
import { invalidateSession } from '$lib/server/auth/index.js';

// Shared so both POST (form action) and GET (direct navigation/bookmark)
// log out identically.
async function clearSession(cookies: Cookies) {
	const sessionId = cookies.get('sessionId');
	if (sessionId) {
		await invalidateSession(sessionId);
	}
	cookies.delete('sessionId', { path: '/' });
}

// GET must clear the session too: users reach /logout via typed URLs and
// bookmarks, and keeping them signed in there reads as "logout is broken".
// Logout-CSRF via GET is accepted: worst case is a forced logout, no data
// is exposed or mutated.
export const load: PageServerLoad = async ({ cookies }) => {
	await clearSession(cookies);
	throw redirect(302, '/login');
};

export const actions: Actions = {
	default: async ({ cookies }) => {
		await clearSession(cookies);
		throw redirect(302, '/login');
	}
};
