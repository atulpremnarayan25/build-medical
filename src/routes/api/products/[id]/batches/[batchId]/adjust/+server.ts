import { inventoryService, productService } from '$lib/server/servicesLocator';
import { jsonResponse, errorResponse } from '$lib/server/apiUtils';
import { db } from '$lib/server/db/index';
import { batchesTable, batchStockEventsTable } from '$lib/server/db/schema';
import { logSyncOutbox } from '$lib/server/db/sync/outbox';
import { eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { RequestEvent } from './$types';

export async function POST({ params, request, locals }: RequestEvent) {
	try {
		if (!locals.user) {
			return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
		}

		if (locals.user.role !== 'owner_admin') {
			return errorResponse('FORBIDDEN', 'Only owner_admin can adjust batch stock', 403);
		}

		const { id, batchId } = params;
		const body = await request.json();
		const { delta, reason } = body;

		if (typeof delta !== 'number' || isNaN(delta) || delta === 0) {
			return errorResponse('BAD_REQUEST', 'Delta must be a non-zero number', 400);
		}

		const product = await productService.getProduct(id);
		if (!product) {
			return errorResponse('NOT_FOUND', 'Product not found', 404);
		}

		if (locals.user.storeId && (product as any).storeId && (product as any).storeId !== locals.user.storeId) {
			return errorResponse('FORBIDDEN', 'Cross-tenant access denied', 403);
		}

		const batch = await inventoryService.getBatch(batchId);
		if (!batch || batch.productId !== id) {
			return errorResponse('NOT_FOUND', 'Batch not found for this product', 404);
		}

		if (batch.quantity + delta < 0) {
			return errorResponse(
				'BAD_REQUEST',
				`Adjustment would result in negative stock (Current: ${batch.quantity}, Delta: ${delta})`,
				400
			);
		}

		const combinedReason = String(reason || 'Manual batch stock adjustment').trim();
		const userId = locals.user.id;

		const updatedBatch = await db.transaction(async (tx) => {
			const [upd] = await tx
				.update(batchesTable)
				.set({
					quantityRemaining: sql`${batchesTable.quantityRemaining} + ${delta}`,
					updatedAt: new Date()
				})
				.where(eq(batchesTable.id, batchId))
				.returning();

			await logSyncOutbox(tx, 'batches', upd.id, 'update', upd);

			const eventId = uuidv4();
			const eventValues = {
				id: eventId,
				batchId,
				delta: String(delta),
				eventType: 'adjustment',
				reason: combinedReason,
				createdBy: userId,
				createdAt: new Date()
			};

			await tx.insert(batchStockEventsTable).values(eventValues as any);
			await logSyncOutbox(tx, 'batch_stock_events', eventId, 'insert', eventValues);

			return {
				...batch,
				quantity: batch.quantity + delta
			};
		});

		return jsonResponse(updatedBatch);
	} catch (err: any) {
		return errorResponse('INTERNAL_ERROR', err.message, 500);
	}
}
