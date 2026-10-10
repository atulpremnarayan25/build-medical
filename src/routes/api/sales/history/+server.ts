import { jsonResponse, errorResponse } from '$lib/server/apiUtils.js';
import { db } from '$lib/server/db/index.js';
import { salesTable, saleItemsTable, batchesTable, customersTable, productsTable } from '$lib/server/db/schema.js';
import { eq, desc, and, sql } from 'drizzle-orm';
import type { RequestEvent } from './$types.js';

export async function GET({ url }: RequestEvent) {
	try {
		const productId = url.searchParams.get('productId');
		if (!productId) {
			return errorResponse('BAD_REQUEST', 'productId query parameter is required', 400);
		}

		const customerId = url.searchParams.get('customerId');
		const conditions = [eq(saleItemsTable.productId, productId)];
		if (customerId) {
			conditions.push(eq(salesTable.customerId, customerId));
		}

		const [stockRow] = await db
			.select({
				totalStock: sql<string>`COALESCE(SUM(${batchesTable.quantityRemaining}), 0)`
			})
			.from(batchesTable)
			.where(eq(batchesTable.productId, productId));

		const rows = await db
			.select({
				id: saleItemsTable.id,
				invoiceNumber: salesTable.invoiceNumber,
				createdAt: salesTable.createdAt,
				customerId: salesTable.customerId,
				customerName: customersTable.name,
				batchNo: batchesTable.batchNo,
				expiryDate: batchesTable.expiryDate,
				mrp: batchesTable.mrp,
				quantity: saleItemsTable.quantity,
				rate: saleItemsTable.rate,
				gstRate: saleItemsTable.gstRate,
				schemeApplied: saleItemsTable.schemeApplied,
				productName: productsTable.name,
				packSize: productsTable.packSize
			})
			.from(saleItemsTable)
			.innerJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
			.innerJoin(batchesTable, eq(saleItemsTable.batchId, batchesTable.id))
			.innerJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
			.leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
			.where(and(...conditions))
			.orderBy(desc(salesTable.createdAt))
			.limit(5);

		return jsonResponse({
			history: rows,
			currentStock: Number(stockRow?.totalStock || 0)
		});
	} catch (err: any) {
		return errorResponse('INTERNAL_ERROR', err.message, 500);
	}
}
