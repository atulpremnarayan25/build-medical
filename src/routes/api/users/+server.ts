import { db } from '$lib/server/db/index.js';
import { usersTable } from '$lib/server/db/schema.js';
import { jsonResponse, errorResponse } from '$lib/server/apiUtils.js';
import { hashPassword } from '$lib/server/auth/index.js';
import { eq } from 'drizzle-orm';
import type { RequestEvent } from './$types.js';

export async function GET({ locals }: RequestEvent) {
	try {
		if (!locals.user) {
			return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
		}

		let users = await db
			.select({
				id: usersTable.id,
				storeId: usersTable.storeId,
				name: usersTable.name,
				username: usersTable.username,
				role: usersTable.role,
				isActive: usersTable.isActive,
				createdAt: usersTable.createdAt
			})
			.from(usersTable)
			.where(eq(usersTable.storeId, locals.user.storeId));

		if (users.length === 0) {
			users = await db
				.select({
					id: usersTable.id,
					storeId: usersTable.storeId,
					name: usersTable.name,
					username: usersTable.username,
					role: usersTable.role,
					isActive: usersTable.isActive,
					createdAt: usersTable.createdAt
				})
				.from(usersTable);
		}

		return jsonResponse(users);
	} catch (err: any) {
		return errorResponse('INTERNAL_ERROR', err.message, 500);
	}
}

export async function POST({ locals, request }: RequestEvent) {
	try {
		if (!locals.user) {
			return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
		}

		if (locals.user.role !== 'owner_admin') {
			return errorResponse('FORBIDDEN', 'Only owner_admin can create users', 403);
		}

		const body = await request.json();
		const name = String(body.name || '').trim();
		const username = String(body.username || '').trim().toLowerCase();
		const role = body.role === 'owner_admin' ? 'owner_admin' : 'biller';
		const password = String(body.password || '');

		if (!name) {
			return errorResponse('VALIDATION_ERROR', 'Name is required', 400);
		}
		if (!username) {
			return errorResponse('VALIDATION_ERROR', 'Username is required', 400);
		}
		if (!password || password.length < 4) {
			return errorResponse('VALIDATION_ERROR', 'Password must be at least 4 characters', 400);
		}

		const existing = await db.query.usersTable.findFirst({
			where: eq(usersTable.username, username)
		});
		if (existing) {
			return errorResponse('USERNAME_TAKEN', 'Username is already taken', 400);
		}

		const passwordHash = await hashPassword(password);

		const [newUser] = await db
			.insert(usersTable)
			.values({
				storeId: locals.user.storeId,
				name,
				username,
				role,
				passwordHash,
				isActive: true
			})
			.returning({
				id: usersTable.id,
				storeId: usersTable.storeId,
				name: usersTable.name,
				username: usersTable.username,
				role: usersTable.role,
				isActive: usersTable.isActive,
				createdAt: usersTable.createdAt
			});

		return jsonResponse(newUser, 201);
	} catch (err: any) {
		return errorResponse('BAD_REQUEST', err.message, 400);
	}
}
