import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { purchasesTable, purchaseItemsTable, suppliersTable, batchesTable, productsTable } from '$lib/server/db/schema.js';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import type { RequestEvent } from './$types';

export async function GET(event: RequestEvent) {
	if (!event.locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const url = new URL(event.request.url);
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');
	const supplierId = url.searchParams.get('supplierId');

	const filters = [eq(purchasesTable.storeId, event.locals.user.storeId)];

	if (from) {
		filters.push(gte(purchasesTable.createdAt, new Date(from)));
	}
	if (to) {
		const toDate = new Date(to);
		toDate.setHours(23, 59, 59, 999);
		filters.push(lte(purchasesTable.createdAt, toDate));
	}
	if (supplierId) {
		filters.push(eq(purchasesTable.supplierId, supplierId));
	}

	const purchasesData = await db
		.select({
			id: purchasesTable.id,
			date: purchasesTable.createdAt,
			supplierInvoiceRef: purchasesTable.supplierInvoiceRef,
			supplierInvoiceDate: purchasesTable.supplierInvoiceDate,
			supplierId: purchasesTable.supplierId,
			supplierName: suppliersTable.name,
			supplierGstin: suppliersTable.gstin,
			supplierPhone: suppliersTable.contactPhone,
			totalAmount: purchasesTable.totalAmount,
			itemsCount: sql`COALESCE((SELECT COUNT(*) FROM purchase_items WHERE purchase_items.purchase_id = ${purchasesTable.id}), 0)`
		})
		.from(purchasesTable)
		.leftJoin(suppliersTable, eq(purchasesTable.supplierId, suppliersTable.id))
		.where(and(...filters))
		.orderBy(desc(purchasesTable.createdAt));

	return json(
		purchasesData.map((r) => ({
			...r,
			totalAmount: Number(r.totalAmount || 0),
			itemsCount: Number(r.itemsCount || 0)
		}))
	);
}
