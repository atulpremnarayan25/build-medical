import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { productsTable, batchesTable } from '$lib/server/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import type { RequestEvent } from './$types';

export async function GET(event: RequestEvent) {
	if (!event.locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const stockData = await db
		.select({
			productId: productsTable.id,
			productName: productsTable.name,
			genericName: productsTable.genericName,
			category: productsTable.category,
			manufacturer: productsTable.manufacturer,
			hsnCode: productsTable.hsnCode,
			drugSchedule: productsTable.drugSchedule,
			mrp: sql`COALESCE(NULLIF(${productsTable.mrp}, '0'), MAX(${batchesTable.mrp}), '0')`,
			sellingRate: sql`COALESCE(NULLIF(${productsTable.sellingRate}, '0'), MAX(${batchesTable.mrp}), '0')`,
			purchaseRate: sql`COALESCE(NULLIF(${productsTable.purchaseRate}, '0'), MAX(${batchesTable.purchasePrice}), '0')`,
			reorderThreshold: productsTable.reorderThreshold,
			batchesCount: sql`COUNT(${batchesTable.id})`,
			stockLevel: sql`COALESCE(SUM(CAST(${batchesTable.quantityRemaining} AS NUMERIC)), 0)`,
			costValuation: sql`COALESCE(SUM(CAST(${batchesTable.quantityRemaining} AS NUMERIC) * CAST(${batchesTable.purchasePrice} AS NUMERIC)), 0)`,
			mrpValuation: sql`COALESCE(SUM(CAST(${batchesTable.quantityRemaining} AS NUMERIC) * CAST(${batchesTable.mrp} AS NUMERIC)), 0)`
		})
		.from(productsTable)
		.leftJoin(batchesTable, eq(productsTable.id, batchesTable.productId))
		.where(eq(productsTable.storeId, event.locals.user.storeId))
		.groupBy(productsTable.id);

	return json(
		stockData.map((r) => ({
			...r,
			mrp: Number(r.mrp || 0),
			sellingRate: Number(r.sellingRate || 0),
			purchaseRate: Number(r.purchaseRate || 0),
			reorderThreshold: r.reorderThreshold ? Number(r.reorderThreshold) : null,
			batchesCount: Number(r.batchesCount || 0),
			stockLevel: Number(r.stockLevel || 0),
			costValuation: Number(r.costValuation || 0),
			mrpValuation: Number(r.mrpValuation || 0)
		}))
	);
}
