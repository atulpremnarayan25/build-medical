import { db } from '../db/index.js';
import {
	returnsTable,
	returnItemsTable,
	batchStockEventsTable,
	batchesTable,
	salesTable,
	purchasesTable
} from '../db/schema.js';
import { eq, inArray, and, sql } from 'drizzle-orm';
import type { CreateReturnInput, ReturnType } from '$lib/types/return.js';
import { logSyncOutbox } from '../db/sync/outbox.js';

export async function processReturn(input: CreateReturnInput, storeId: string, userId: string) {
	return db.transaction(async (tx) => {
		// 1. Verify related sale/purchase if provided
		if (input.returnType === 'sales_return' && input.originalSaleId) {
			const sale = await tx
				.select()
				.from(salesTable)
				.where(eq(salesTable.id, input.originalSaleId))
				.limit(1);
			if (sale.length === 0) throw new Error('Original sale not found');
		} else if (input.returnType === 'purchase_return' && input.originalPurchaseId) {
			const purchase = await tx
				.select()
				.from(purchasesTable)
				.where(eq(purchasesTable.id, input.originalPurchaseId))
				.limit(1);
			if (purchase.length === 0) throw new Error('Original purchase not found');
		}

		// 2. Insert Return
		const [newReturn] = await tx
			.insert(returnsTable)
			.values({
				returnType: input.returnType,
				originalSaleId: input.returnType === 'sales_return' ? input.originalSaleId : null,
				originalPurchaseId:
					input.returnType === 'purchase_return' ? input.originalPurchaseId : null,
				reason: input.reason,
				createdBy: userId
			})
			.returning();

		await logSyncOutbox(tx, 'returns', newReturn.id, 'insert', newReturn);

		// 3. Process each item (insert return_items and update stock)
		for (const item of input.items) {
			// stock delta: sales_return brings stock IN (+), purchase_return takes stock OUT (-)
			const delta = input.returnType === 'sales_return' ? item.quantity : -item.quantity;

			const [retItem] = await tx
				.insert(returnItemsTable)
				.values({
					returnId: newReturn.id,
					batchId: item.batchId,
					quantity: String(item.quantity),
					lineAmount: String(item.lineAmount)
				})
				.returning();

			await logSyncOutbox(tx, 'return_items', retItem.id, 'insert', retItem);

			const [updatedBatch] = await tx
				.update(batchesTable)
				.set({
					quantityRemaining: sql`${batchesTable.quantityRemaining} + ${delta}`,
					updatedAt: new Date()
				})
				.where(eq(batchesTable.id, item.batchId))
				.returning();

			await logSyncOutbox(tx, 'batches', updatedBatch.id, 'update', updatedBatch);

			const [stockEvent] = await tx
				.insert(batchStockEventsTable)
				.values({
					batchId: item.batchId,
					delta: String(delta),
					eventType: input.returnType,
					referenceId: newReturn.id,
					reason: input.reason,
					createdBy: userId
				})
				.returning();

			await logSyncOutbox(tx, 'batch_stock_events', stockEvent.id, 'insert', stockEvent);
		}

		return newReturn;
	});
}
