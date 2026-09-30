import { json } from '@sveltejs/kit';
import { errorResponse, jsonResponse } from '$lib/server/apiUtils.js';
import { processReturn } from '$lib/server/billing/returns.js';
import { db } from '$lib/server/db/index.js';
import {
	returnsTable,
	returnItemsTable,
	batchesTable,
	productsTable,
	salesTable,
	purchasesTable
} from '$lib/server/db/schema.js';
import { desc, eq, inArray } from 'drizzle-orm';
import type { RequestEvent } from './$types';

export async function GET(event: RequestEvent) {
	if (!event.locals.user) {
		return errorResponse('UNAUTHORIZED', 'Login required', 401);
	}

	const rtns = await db.select().from(returnsTable).orderBy(desc(returnsTable.createdAt));
	if (rtns.length === 0) {
		return json([]);
	}

	const returnIds = rtns.map((r) => r.id);
	const items = await db
		.select({
			id: returnItemsTable.id,
			returnId: returnItemsTable.returnId,
			batchId: returnItemsTable.batchId,
			quantity: returnItemsTable.quantity,
			lineAmount: returnItemsTable.lineAmount,
			batchNumber: batchesTable.batchNo,
			expiryDate: batchesTable.expiryDate,
			productId: batchesTable.productId,
			productName: productsTable.name
		})
		.from(returnItemsTable)
		.leftJoin(batchesTable, eq(returnItemsTable.batchId, batchesTable.id))
		.leftJoin(productsTable, eq(batchesTable.productId, productsTable.id))
		.where(inArray(returnItemsTable.returnId, returnIds));

	// Fetch referenced sales & purchases
	const saleIds = rtns.map((r) => r.originalSaleId).filter(Boolean) as string[];
	const purchaseIds = rtns.map((r) => r.originalPurchaseId).filter(Boolean) as string[];

	const salesMap = new Map<string, string>();
	if (saleIds.length > 0) {
		const sales = await db
			.select({ id: salesTable.id, invoiceNumber: salesTable.invoiceNumber })
			.from(salesTable)
			.where(inArray(salesTable.id, saleIds));
		for (const s of sales) salesMap.set(s.id, s.invoiceNumber);
	}

	const purchasesMap = new Map<string, string>();
	if (purchaseIds.length > 0) {
		const purchases = await db
			.select({ id: purchasesTable.id, invoiceNumber: purchasesTable.supplierInvoiceRef })
			.from(purchasesTable)
			.where(inArray(purchasesTable.id, purchaseIds));
		for (const p of purchases) purchasesMap.set(p.id, p.invoiceNumber);
	}

	const itemsByReturn = new Map<string, any[]>();
	for (const item of items) {
		if (!itemsByReturn.has(item.returnId)) {
			itemsByReturn.set(item.returnId, []);
		}
		itemsByReturn.get(item.returnId)!.push({
			id: item.id,
			batchId: item.batchId,
			quantity: Number(item.quantity),
			lineAmount: Number(item.lineAmount),
			batchNumber: item.batchNumber || 'N/A',
			expiryDate: item.expiryDate || '',
			productName: item.productName || 'Unknown Product'
		});
	}

	const enrichedReturns = rtns.map((r) => {
		const rItems = itemsByReturn.get(r.id) || [];
		const totalAmount = rItems.reduce((acc, curr) => acc + (curr.lineAmount || 0), 0);
		const totalQuantity = rItems.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
		const invoiceNumber = r.originalSaleId
			? salesMap.get(r.originalSaleId)
			: r.originalPurchaseId
				? purchasesMap.get(r.originalPurchaseId)
				: null;

		return {
			...r,
			invoiceNumber,
			items: rItems,
			totalAmount,
			totalQuantity
		};
	});

	return json(enrichedReturns);
}

export async function POST(event: RequestEvent) {
	if (!event.locals.user) {
		return errorResponse('UNAUTHORIZED', 'Login required', 401);
	}

	let body;
	try {
		body = await event.request.json();
	} catch {
		return errorResponse('BAD_REQUEST', 'Invalid JSON', 400);
	}

	try {
		const storeId = event.locals.user.storeId;
		const newReturn = await processReturn(body, storeId, event.locals.user.id);
		return jsonResponse(newReturn, 201);
	} catch (err: any) {
		return errorResponse('INTERNAL_ERROR', err.message || 'Failed to process return', 500);
	}
}
