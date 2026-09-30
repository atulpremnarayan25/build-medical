import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { syncOutboxTable } from '$lib/server/db/schema';
import { env } from '$env/dynamic/private';
import { and, eq, gt } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url }) => {
	const since = url.searchParams.get('since');

	// If a caller hits this node's pull endpoint, they want the items that this node
	// intends to send to them. Wait, actually, the caller identifies itself.
	const callerNode = url.searchParams.get('clientId') || 'store_server';
	// So we return rows where targetNode == callerNode

	let conditions = eq(syncOutboxTable.targetNode, callerNode);
	if (since) {
		const sinceDate = new Date(since);
		if (!isNaN(sinceDate.getTime())) {
			conditions = and(conditions, gt(syncOutboxTable.createdAt, sinceDate)) as any;
		}
	}

	const entries = await db
		.select()
		.from(syncOutboxTable)
		.where(conditions)
		.orderBy(syncOutboxTable.createdAt);

	return json({ items: entries });
};
