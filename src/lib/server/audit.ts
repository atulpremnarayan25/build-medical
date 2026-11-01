import { auditLogTable } from '$lib/server/db/schema.js';
import { db as defaultDb } from '$lib/server/db/index.js';

export interface AuditLogParams {
	storeId: string;
	entityType: string;
	entityId: string;
	action: 'create' | 'update' | 'delete' | 'adjust' | 'cancel' | 'approve' | 'settings_change';
	performedBy?: string | null;
	beforeValue?: Record<string, any> | null;
	afterValue?: Record<string, any> | null;
}

/**
 * Appends a record to the statutory audit_log table.
 * Supports running inside an existing Drizzle transaction or using the root database connection.
 */
export async function logAudit(
	txOrDb: any = defaultDb,
	params: AuditLogParams
): Promise<void> {
	try {
		const targetDb = txOrDb || defaultDb;
		await targetDb.insert(auditLogTable).values({
			storeId: params.storeId,
			entityType: params.entityType,
			entityId: params.entityId,
			action: params.action,
			performedBy: params.performedBy || null,
			beforeValue: params.beforeValue || null,
			afterValue: params.afterValue || null
		});
	} catch (err) {
		console.error('[AuditLog] Failed to record statutory audit log:', err);
		// Non-fatal fallback: audit log write failure should not crash business critical flow,
		// but is logged to console for inspection.
	}
}
