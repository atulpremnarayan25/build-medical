import { jsonResponse, errorResponse } from '$lib/server/apiUtils.js';
import { db } from '$lib/server/db/index.js';
import { purchasesTable, purchaseItemsTable, batchesTable, suppliersTable, productsTable } from '$lib/server/db/schema.js';
import { eq, desc, and, sql } from 'drizzle-orm';
import type { RequestEvent } from './$types.js';

export async function GET({ url }: RequestEvent) {
	try {
		const productId = url.searchParams.get('productId');
		if (!productId) {
			return errorResponse('BAD_REQUEST', 'productId query parameter is required', 400);
		}

		const supplierId = url.searchParams.get('supplierId');
		const conditions = [eq(batchesTable.productId, productId)];
		if (supplierId) {
			conditions.push(eq(purchasesTable.supplierId, supplierId));
		}

		const [stockRow] = await db
			.select({
				totalStock: sql<string>`COALESCE(SUM(${batchesTable.quantityRemaining}), 0)`
			})
			.from(batchesTable)
			.where(eq(batchesTable.productId, productId));

		const rows = await db
			.select({
				id: purchaseItemsTable.id,
				invoiceNo: purchasesTable.supplierInvoiceRef,
				invoiceDate: purchasesTable.supplierInvoiceDate,
				createdAt: purchasesTable.createdAt,
				supplierId: purchasesTable.supplierId,
				supplierName: suppliersTable.name,
				supplierCity: suppliersTable.city,
				batchNo: batchesTable.batchNo,
				mrp: batchesTable.mrp,
				quantity: purchaseItemsTable.quantity,
				purchaseRate: purchaseItemsTable.purchasePrice,
				productName: productsTable.name,
				hsnCode: productsTable.hsnCode,
				gstRate: productsTable.gstRate,
				packSize: productsTable.packSize
			})
			.from(purchaseItemsTable)
			.innerJoin(purchasesTable, eq(purchaseItemsTable.purchaseId, purchasesTable.id))
			.innerJoin(batchesTable, eq(purchaseItemsTable.batchId, batchesTable.id))
			.innerJoin(productsTable, eq(batchesTable.productId, productsTable.id))
			.innerJoin(suppliersTable, eq(purchasesTable.supplierId, suppliersTable.id))
			.where(and(...conditions))
			.orderBy(desc(purchasesTable.createdAt))
			.limit(5);

		return jsonResponse({
			history: rows,
			currentStock: Number(stockRow?.totalStock || 0)
		});
	} catch (err: any) {
		return errorResponse('INTERNAL_ERROR', err.message, 500);
	}
}
