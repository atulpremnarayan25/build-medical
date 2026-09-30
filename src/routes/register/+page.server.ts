import { dev } from '$app/environment';
import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { usersTable, storesTable } from '$lib/server/db/schema.js';
import { createSession, hashPassword } from '$lib/server/auth/index.js';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(302, '/dashboard');
	}
};

/**
 * v1 assumes exactly one store (spec §1). Registration bootstraps it on first
 * run so the users.store_id FK always points at a real row.
 */
async function ensureDefaultStore(): Promise<string> {
	const existing = await db.select({ id: storesTable.id }).from(storesTable).limit(1);
	if (existing.length > 0) return existing[0].id;

	const [store] = await db
		.insert(storesTable)
		.values({ name: 'Main Store' })
		.returning({ id: storesTable.id });
	return store.id;
}

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const name = data.get('name');
		const username = data.get('username');
		const password = data.get('password');
		const confirmPassword = data.get('confirmPassword');

		if (
			typeof name !== 'string' ||
			typeof username !== 'string' ||
			typeof password !== 'string' ||
			typeof confirmPassword !== 'string' ||
			!name.trim() ||
			!username.trim() ||
			!password
		) {
			return fail(400, { error: 'Please fill in all required fields.' });
		}

		if (password !== confirmPassword) {
			return fail(400, { error: 'Passwords do not match.' });
		}

		if (password.length < 6) {
			return fail(400, { error: 'Password must be at least 6 characters long.' });
		}

		const existingUsers = await db.select({ id: usersTable.id }).from(usersTable).limit(1);
		if (existingUsers.length > 0) {
			return fail(403, {
				error: 'Registration is closed. Please ask an administrator to create your account.'
			});
		}

		const passwordHash = await hashPassword(password);

		const [user] = await db
			.insert(usersTable)
			.values({
				storeId: await ensureDefaultStore(),
				username: username.trim(),
				passwordHash,
				name: name.trim(),
				role: 'owner_admin', // First user owns the store
				isActive: true
			})
			.returning({ id: usersTable.id });

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
