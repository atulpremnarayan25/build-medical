import { dev } from '$app/environment';
import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { usersTable } from '$lib/server/db/schema.js';
import { createSession, verifyPassword } from '$lib/server/auth/index.js';
import { eq } from 'drizzle-orm';

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

		console.log('Login attempt:', username);

		const users = await db
			.select()
			.from(usersTable)
			.where(eq(usersTable.username, username))
			.limit(1);
		const user = users[0];

		if (!user || !user.isActive) {
			return fail(400, { error: 'Invalid username or password' });
		}

		const valid = await verifyPassword(password, user.passwordHash);
		if (!valid) {
			return fail(400, { error: 'Invalid username or password' });
		}

		const sessionId = await createSession(user.id);
		console.log('Login success for:', username);

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
