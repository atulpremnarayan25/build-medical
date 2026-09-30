import { syncOutboxTable } from '../schema';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type * as schema from '../schema';

const env = { NODE_ID: 'store_server' };

export type Tx = PgTransaction<any, typeof schema, ExtractTablesWithRelations<typeof schema>>;

/**
 * Logs a write operation to the sync_outbox for eventual replication to the other node.
 * Must be called within the same database transaction as the primary write.
 *
 * @param tx Drizzle transaction object
 * @param tableName The table affected (e.g. 'sales', 'products')
 * @param rowId The UUID of the row that was affected
 * @param operation The operation type: 'insert', 'update', or 'delete'
 * @param payload The complete row payload (if insert/update) or just id (if delete)
 */
export async function logSyncOutbox(
	tx: Tx,
	tableName: string,
	rowId: string,
	operation: 'insert' | 'update' | 'delete',
	payload: any
) {
	// In v1, there are only two nodes: 'store_server' and 'cloud'
	const currentNode = env.NODE_ID || 'store_server';
	const targetNode = currentNode === 'store_server' ? 'cloud' : 'store_server';

	await tx.insert(syncOutboxTable).values({
		tableName,
		rowId,
		operation,
		payload,
		targetNode
	});
}
