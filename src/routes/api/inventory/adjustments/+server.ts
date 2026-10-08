import { json } from '@sveltejs/kit';
import { errorResponse, jsonResponse } from '$lib/server/apiUtils.js';
import { db } from '$lib/server/db/index.js';
import {
	batchStockEventsTable,
	batchesTable,
	productsTable,
	usersTable
} from '$lib/server/db/schema.js';
import { logSyncOutbox } from '$lib/server/db/sync/outbox.js';
import { desc, eq, sql } from 'drizzle-orm';
import type { RequestEvent } from './$types';

export async function GET(event: RequestEvent) {
	if (!event.locals.user) {
		return errorResponse('UNAUTHORIZED', 'Login required', 401);
	}

	try {
		const adjustments = await db
			.select({
				id: batchStockEventsTable.id,
				batchId: batchStockEventsTable.batchId,
				delta: batchStockEventsTable.delta,
				eventType: batchStockEventsTable.eventType,
				reason: batchStockEventsTable.reason,
				createdAt: batchStockEventsTable.createdAt,
				batchNo: batchesTable.batchNo,
				expiryDate: batchesTable.expiryDate,
				mrp: batchesTable.mrp,
				currentRemaining: batchesTable.quantityRemaining,
				productId: batchesTable.productId,
				productName: productsTable.name,
				productCode: productsTable.barcode,
				userName: usersTable.name
			})
			.from(batchStockEventsTable)
			.leftJoin(batchesTable, eq(batchStockEventsTable.batchId, batchesTable.id))
			.leftJoin(productsTable, eq(batchesTable.productId, productsTable.id))
			.leftJoin(usersTable, eq(batchStockEventsTable.createdBy, usersTable.id))
			.where(eq(batchStockEventsTable.eventType, 'adjustment'))
			.orderBy(desc(batchStockEventsTable.createdAt))
			.limit(100);

		return json(
			adjustments.map((a) => ({
				...a,
				delta: Number(a.delta),
				mrp: Number(a.mrp || 0),
				currentRemaining: Number(a.currentRemaining || 0)
			}))
		);
	} catch (err: any) {
		console.error('Failed to fetch stock adjustments:', err);
		return errorResponse('INTERNAL_ERROR', err.message || 'Failed to fetch adjustments', 500);
	}
}

export async function POST(event: RequestEvent) {
	if (!event.locals.user) {
		return errorResponse('UNAUTHORIZED', 'Login required', 401);
	}

	let body: any;
	try {
		body = await event.request.json();
	} catch {
		return errorResponse('BAD_REQUEST', 'Invalid JSON body', 400);
	}

	const { items } = body;
	if (!Array.isArray(items) || items.length === 0) {
		return errorResponse('BAD_REQUEST', 'Adjustment items array is required', 400);
	}

	try {
		const userId = event.locals.user.id;

		const result = await db.transaction(async (tx) => {
			const recordedEvents = [];

			for (const item of items) {
				const { batchId, delta, reasonCode, notes, reason } = item;
				const numDelta = Number(delta);

				if (!batchId || isNaN(numDelta) || numDelta === 0) {
					throw new Error('Valid batchId and non-zero numeric delta required for each item');
				}

				const combinedReason = (
					reason ||
					[reasonCode, notes?.trim()].filter(Boolean).join(' — ')
				).trim();

				if (!combinedReason) {
					throw new Error(`Mandatory reason is required for adjusting batch ${batchId}`);
				}

				const [existingBatch] = await tx
					.select()
					.from(batchesTable)
					.where(eq(batchesTable.id, batchId));

				if (!existingBatch) {
					throw new Error(`Batch ID ${batchId} not found`);
				}

				const currentQty = Number(existingBatch.quantityRemaining);
				if (currentQty + numDelta < 0) {
					throw new Error(
						`Adjustment would result in negative stock for batch ${existingBatch.batchNo} (Current: ${currentQty}, Delta: ${numDelta})`
					);
				}

				// 1. Update batch quantity remaining
				const [updatedBatch] = await tx
					.update(batchesTable)
					.set({
						quantityRemaining: sql`${batchesTable.quantityRemaining} + ${numDelta}`,
						updatedAt: new Date()
					})
					.where(eq(batchesTable.id, batchId))
					.returning();

				await logSyncOutbox(tx, 'batches', updatedBatch.id, 'update', updatedBatch);

				// 2. Insert append-only stock event
				const [stockEvent] = await tx
					.insert(batchStockEventsTable)
					.values({
						batchId,
						delta: String(numDelta),
						eventType: 'adjustment',
						reason: combinedReason,
						createdBy: userId
					})
					.returning();

				await logSyncOutbox(tx, 'batch_stock_events', stockEvent.id, 'insert', stockEvent);
				recordedEvents.push(stockEvent);
			}

			return { count: recordedEvents.length, events: recordedEvents };
		});

		return jsonResponse(result, 201);
	} catch (err: any) {
		console.error('Failed to post stock adjustment:', err);
		return errorResponse('INTERNAL_ERROR', err.message || 'Failed to process stock adjustment', 500);
	}
}
