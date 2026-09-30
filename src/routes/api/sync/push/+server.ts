import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import * as schema from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { AnyPgTable } from 'drizzle-orm/pg-core';

// Map string names to schema tables
const tableMap: Record<string, AnyPgTable> = {
	products: schema.productsTable,
	product_units: schema.productUnitsTable,
	batches: schema.batchesTable,
	batch_stock_events: schema.batchStockEventsTable,
	suppliers: schema.suppliersTable,
	customers: schema.customersTable,
	purchases: schema.purchasesTable,
	purchase_items: schema.purchaseItemsTable,
	sales: schema.salesTable,
	sale_items: schema.saleItemsTable,
	payments: schema.paymentsTable,
	returns: schema.returnsTable,
	return_items: schema.returnItemsTable,
	audit_log: schema.auditLogTable,
	settings: schema.settingsTable,
	users: schema.usersTable,
	stores: schema.storesTable
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const items: schema.SyncOutboxEntry[] = body.items || [];

	const results = [];

	// Apply each item
	for (const item of items) {
		try {
			await db.transaction(async (tx) => {
				const table = tableMap[item.tableName];
				if (!table) throw new Error(`Unknown table: ${item.tableName}`);
				const payload = item.payload as any;

				if (item.tableName === 'batch_stock_events') {
					// Delta replay for stock events
					// A new event from remote comes in. We insert it locally if it doesn't exist.
					if (item.operation === 'insert' || item.operation === 'update') {
						const existing = await tx
							.select()
							.from(table as any)
							.where(eq((table as any).id, item.rowId))
							.limit(1);
						if (existing.length === 0) {
							await tx.insert(table as any).values(payload);

							// And apply the delta to the local batch!
							const delta = Number(payload.delta);
							if (!isNaN(delta)) {
								await tx
									.update(schema.batchesTable)
									.set({
										quantityRemaining: sql`${schema.batchesTable.quantityRemaining} + ${delta}`
									})
									.where(eq(schema.batchesTable.id, payload.batchId));
							}
						}
					} else if (item.operation === 'delete') {
						const existing = await tx
							.select()
							.from(table as any)
							.where(eq((table as any).id, item.rowId))
							.limit(1);
						if (existing.length > 0) {
							const deltaToRevert = Number(existing[0].delta);
							await tx.delete(table as any).where(eq((table as any).id, item.rowId));
							if (!isNaN(deltaToRevert)) {
								// Undo the local batch delta
								await tx
									.update(schema.batchesTable)
									.set({
										quantityRemaining: sql`${schema.batchesTable.quantityRemaining} - ${deltaToRevert}`
									})
									.where(eq(schema.batchesTable.id, existing[0].batchId));
							}
						}
					}
				} else {
					// LWW for normal tables
					if (item.operation === 'insert' || item.operation === 'update') {
						const existing = await tx
							.select()
							.from(table as any)
							.where(eq((table as any).id, item.rowId))
							.limit(1);
						if (existing.length === 0) {
							await tx.insert(table as any).values(payload);
						} else {
							const remoteUpdatedDate = new Date(payload.updatedAt || payload.created_at || 0);
							const localUpdatedDate = new Date(
								existing[0].updatedAt || existing[0].created_at || 0
							);
							// Apply LWW
							if (remoteUpdatedDate > localUpdatedDate) {
								await tx
									.update(table as any)
									.set(payload)
									.where(eq((table as any).id, item.rowId));
							}
						}
					} else if (item.operation === 'delete') {
						// Soft delete? Normal delete? The schema uses soft-delete for most syncable tables (is_deleted = true)
						// So a delete here might just mean applying the payload with is_deleted=true, but we handle it just in case
						await tx.delete(table as any).where(eq((table as any).id, item.rowId));
					}
				}
			});
			results.push({ id: item.id, status: 'ok' });
		} catch (e: any) {
			console.error(`Failed to apply sync item ${item.id}`, e);
			results.push({ id: item.id, status: 'error', reason: e.message });
		}
	}

	return json({ results });
};
