import { db } from '$lib/server/db/index.js';
import { usersTable } from '$lib/server/db/schema.js';
import { jsonResponse, errorResponse } from '$lib/server/apiUtils.js';
import { hashPassword } from '$lib/server/auth/index.js';
import { eq } from 'drizzle-orm';
import type { RequestEvent } from './$types.js';

export async function GET({ locals, params }: RequestEvent) {
	try {
		if (!locals.user) {
			return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
		}

		const user = await db.query.usersTable.findFirst({
			where: eq(usersTable.id, params.id),
			columns: {
				id: true,
				storeId: true,
				name: true,
				username: true,
				role: true,
				isActive: true,
				createdAt: true
			}
		});

		if (!user) {
			return errorResponse('NOT_FOUND', 'User not found', 404);
		}

		return jsonResponse(user);
	} catch (err: any) {
		return errorResponse('INTERNAL_ERROR', err.message, 500);
	}
}

export async function PATCH({ locals, params, request }: RequestEvent) {
	try {
		if (!locals.user) {
			return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
		}

		if (locals.user.role !== 'owner_admin') {
			return errorResponse('FORBIDDEN', 'Only owner_admin can modify users', 403);
		}

		const target = await db.query.usersTable.findFirst({
			where: eq(usersTable.id, params.id)
		});

		if (!target) {
			return errorResponse('NOT_FOUND', 'User not found', 404);
		}

		const body = await request.json();
		const updateData: Record<string, any> = {};

		if (typeof body.isActive === 'boolean') {
			// Prevent disabling the current admin if they are the one logged in
			if (target.id === locals.user.id && !body.isActive) {
				return errorResponse('INVALID_ACTION', 'Cannot deactivate your own account', 400);
			}
			updateData.isActive = body.isActive;
		}

		if (body.password && typeof body.password === 'string') {
			if (body.password.length < 4) {
				return errorResponse('VALIDATION_ERROR', 'Password must be at least 4 characters', 400);
			}
			updateData.passwordHash = await hashPassword(body.password);
		}

		if (body.name && typeof body.name === 'string') {
			updateData.name = body.name.trim();
		}

		if (body.role && (body.role === 'biller' || body.role === 'owner_admin')) {
			updateData.role = body.role;
		}

		if (Object.keys(updateData).length === 0) {
			return errorResponse('BAD_REQUEST', 'No update fields provided', 400);
		}

		const [updated] = await db
			.update(usersTable)
			.set(updateData)
			.where(eq(usersTable.id, params.id))
			.returning({
				id: usersTable.id,
				storeId: usersTable.storeId,
				name: usersTable.name,
				username: usersTable.username,
				role: usersTable.role,
				isActive: usersTable.isActive,
				createdAt: usersTable.createdAt
			});

		return jsonResponse(updated);
	} catch (err: any) {
		return errorResponse('BAD_REQUEST', err.message, 400);
	}
}
