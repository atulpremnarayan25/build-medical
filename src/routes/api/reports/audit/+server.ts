import { db } from '$lib/server/db/index.js';
import { auditLogTable, usersTable } from '$lib/server/db/schema.js';
import { errorResponse, jsonResponse } from '$lib/server/apiUtils.js';
import { and, desc, eq, gte, lte, ilike, or, sql } from 'drizzle-orm';
import type { RequestEvent } from './$types.js';

export async function GET({ url, locals }: RequestEvent) {
	try {
		if (!locals.user) {
			return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
		}

		if (locals.user.role !== 'owner_admin') {
			return errorResponse('FORBIDDEN', 'Only owner_admin can access the statutory audit log', 403);
		}

		const storeId = locals.user.storeId;
		const from = url.searchParams.get('from');
		const to = url.searchParams.get('to');
		const action = url.searchParams.get('action');
		const entityType = url.searchParams.get('entityType');
		const search = url.searchParams.get('search')?.trim();
		const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 50, 1), 200);
		const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);

		const conditions = [eq(auditLogTable.storeId, storeId)];

		if (from) {
			conditions.push(gte(auditLogTable.createdAt, new Date(from)));
		}
		if (to) {
			const toDate = new Date(to);
			// Include end of the day if date only string
			if (to.length === 10) {
				toDate.setHours(23, 59, 59, 999);
			}
			conditions.push(lte(auditLogTable.createdAt, toDate));
		}
		if (action && action !== 'all') {
			conditions.push(eq(auditLogTable.action, action));
		}
		if (entityType && entityType !== 'all') {
			conditions.push(eq(auditLogTable.entityType, entityType));
		}
		if (search) {
			const term = `%${search}%`;
			conditions.push(
				or(
					ilike(auditLogTable.entityType, term),
					ilike(auditLogTable.action, term),
					ilike(usersTable.name, term),
					ilike(usersTable.username, term)
				)!
			);
		}

		const whereClause = and(...conditions);

		// Execute data query with user join
		const [rows, countResult, summaryResult] = await Promise.all([
			db
				.select({
					id: auditLogTable.id,
					storeId: auditLogTable.storeId,
					entityType: auditLogTable.entityType,
					entityId: auditLogTable.entityId,
					action: auditLogTable.action,
					performedBy: auditLogTable.performedBy,
					performedByName: usersTable.name,
					performedByUsername: usersTable.username,
					beforeValue: auditLogTable.beforeValue,
					afterValue: auditLogTable.afterValue,
					createdAt: auditLogTable.createdAt
				})
				.from(auditLogTable)
				.leftJoin(usersTable, eq(auditLogTable.performedBy, usersTable.id))
				.where(whereClause)
				.orderBy(desc(auditLogTable.createdAt))
				.limit(limit)
				.offset(offset),

			db
				.select({ count: sql<number>`count(*)::int` })
				.from(auditLogTable)
				.leftJoin(usersTable, eq(auditLogTable.performedBy, usersTable.id))
				.where(whereClause),

			db
				.select({
					totalEvents: sql<number>`count(*)::int`,
					adjustmentsCount: sql<number>`count(*) filter (where ${auditLogTable.action} = 'adjust')::int`,
					masterChangesCount: sql<number>`count(*) filter (where ${auditLogTable.action} in ('create', 'update', 'delete', 'settings_change'))::int`,
					cancellationsCount: sql<number>`count(*) filter (where ${auditLogTable.action} = 'cancel')::int`
				})
				.from(auditLogTable)
				.where(eq(auditLogTable.storeId, storeId))
		]);

		const total = countResult[0]?.count || 0;
		const summary = summaryResult[0] || {
			totalEvents: 0,
			adjustmentsCount: 0,
			masterChangesCount: 0,
			cancellationsCount: 0
		};

		return jsonResponse({
			items: rows,
			total,
			limit,
			offset,
			summary
		});
	} catch (err: any) {
		console.error('Failed to query audit logs:', err);
		return errorResponse('INTERNAL_ERROR', err.message || 'Failed to query audit logs', 500);
	}
}
