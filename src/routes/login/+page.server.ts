import { dev } from '$app/environment';
import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { usersTable } from '$lib/server/db/schema.js';
import { createSession, verifyPassword } from '$lib/server/auth/index.js';
import { eq } from 'drizzle-orm';

interface RateLimitRecord {
	count: number;
	firstAttempt: number;
}

// In-memory sliding-window rate limiter (per client IP + username)
const loginAttempts = new Map<string, RateLimitRecord>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000; // 60 seconds

function isRateLimited(key: string): boolean {
	const now = Date.now();
	const record = loginAttempts.get(key);
	if (!record) return false;

	if (now - record.firstAttempt > WINDOW_MS) {
		loginAttempts.delete(key);
		return false;
	}

	return record.count >= MAX_ATTEMPTS;
}

function recordFailure(key: string) {
	const now = Date.now();
	const record = loginAttempts.get(key);
	if (!record || now - record.firstAttempt > WINDOW_MS) {
		loginAttempts.set(key, { count: 1, firstAttempt: now });
	} else {
		record.count += 1;
	}
}

function resetFailure(key: string) {
	loginAttempts.delete(key);
}

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(302, '/dashboard');
	}
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const username = data.get('username');
		const password = data.get('password');

		if (typeof username !== 'string' || typeof password !== 'string') {
			return fail(400, { error: 'Invalid username or password' });
		}

		const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
		const rateLimitKey = `${clientIp}:${username.trim().toLowerCase()}`;

		if (isRateLimited(rateLimitKey)) {
			return fail(429, {
				error: 'Too many failed login attempts. Please wait 60 seconds before trying again.'
			});
		}

		const users = await db
			.select()
			.from(usersTable)
			.where(eq(usersTable.username, username.trim().toLowerCase()))
			.limit(1);
		const user = users[0];

		if (!user || !user.isActive) {
			recordFailure(rateLimitKey);
			return fail(400, { error: 'Invalid username or password' });
		}

		const valid = await verifyPassword(password, user.passwordHash);
		if (!valid) {
			recordFailure(rateLimitKey);
			return fail(400, { error: 'Invalid username or password' });
		}

		resetFailure(rateLimitKey);

		const sessionId = await createSession(user.id);

		cookies.set('sessionId', sessionId, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: !dev,
			maxAge: 60 * 60 * 24 * 7 // 7 days
		});

		throw redirect(302, '/dashboard');
	}
};
