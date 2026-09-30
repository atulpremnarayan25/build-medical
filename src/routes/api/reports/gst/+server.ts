import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { salesTable, saleItemsTable, customersTable, purchasesTable, purchaseItemsTable, batchesTable, productsTable } from '$lib/server/db/schema.js';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import type { RequestEvent } from './$types';

export async function GET(event: RequestEvent) {
	if (!event.locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const url = new URL(event.request.url);
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');

	const dateFilters = [];
	if (from) {
		dateFilters.push(gte(salesTable.createdAt, new Date(from)));
	}
	if (to) {
		const toDate = new Date(to);
		toDate.setHours(23, 59, 59, 999);
		dateFilters.push(lte(salesTable.createdAt, toDate));
	}

	// 1. Sales GST breakdown by rate
	const salesGstQuery = db
		.select({
			gstRate: saleItemsTable.gstRate,
			itemCount: sql`COUNT(${saleItemsTable.id})`,
			taxableAmount: sql`COALESCE(SUM(CAST(${saleItemsTable.lineTotal} AS NUMERIC)), 0)`,
			cgstAmount: sql`COALESCE(SUM(CAST(${saleItemsTable.lineTotal} AS NUMERIC) * CAST(${saleItemsTable.gstRate} AS NUMERIC) / 200), 0)`,
			sgstAmount: sql`COALESCE(SUM(CAST(${saleItemsTable.lineTotal} AS NUMERIC) * CAST(${saleItemsTable.gstRate} AS NUMERIC) / 200), 0)`,
			totalAmount: sql`COALESCE(SUM(CAST(${saleItemsTable.lineTotal} AS NUMERIC) * (1 + CAST(${saleItemsTable.gstRate} AS NUMERIC) / 100)), 0)`
		})
		.from(salesTable)
		.innerJoin(saleItemsTable, eq(salesTable.id, saleItemsTable.saleId))
		.where(and(eq(salesTable.storeId, event.locals.user.storeId), ...dateFilters));

	const salesGST = await salesGstQuery.groupBy(saleItemsTable.gstRate);

	// 2. B2B Sales (with GSTIN) vs B2C Sales (without GSTIN)
	const b2bQuery = db
		.select({
			invoiceCount: sql`COUNT(DISTINCT ${salesTable.id})`,
			taxableAmount: sql`COALESCE(SUM(CAST(${salesTable.subtotal} AS NUMERIC)), 0)`,
			gstAmount: sql`COALESCE(SUM(CAST(${salesTable.gstAmount} AS NUMERIC)), 0)`,
			totalAmount: sql`COALESCE(SUM(CAST(${salesTable.totalAmount} AS NUMERIC)), 0)`
		})
		.from(salesTable)
		.innerJoin(customersTable, eq(salesTable.customerId, customersTable.id))
		.where(
			and(
				eq(salesTable.storeId, event.locals.user.storeId),
				sql`${customersTable.gstin} IS NOT NULL AND ${customersTable.gstin} != ''`,
				...dateFilters
			)
		);

	const b2bResult = await b2bQuery;

	const b2cQuery = db
		.select({
			invoiceCount: sql`COUNT(DISTINCT ${salesTable.id})`,
			taxableAmount: sql`COALESCE(SUM(CAST(${salesTable.subtotal} AS NUMERIC)), 0)`,
			gstAmount: sql`COALESCE(SUM(CAST(${salesTable.gstAmount} AS NUMERIC)), 0)`,
			totalAmount: sql`COALESCE(SUM(CAST(${salesTable.totalAmount} AS NUMERIC)), 0)`
		})
		.from(salesTable)
		.leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
		.where(
			and(
				eq(salesTable.storeId, event.locals.user.storeId),
				sql`${customersTable.gstin} IS NULL OR ${customersTable.gstin} = ''`,
				...dateFilters
			)
		);

	const b2cResult = await b2cQuery;

	// 3. Purchase ITC breakdown
	const purchaseDateFilters = [];
	if (from) {
		purchaseDateFilters.push(gte(purchasesTable.createdAt, new Date(from)));
	}
	if (to) {
		const toDate = new Date(to);
		toDate.setHours(23, 59, 59, 999);
		purchaseDateFilters.push(lte(purchasesTable.createdAt, toDate));
	}

	const purchaseGstQuery = db
		.select({
			gstRate: productsTable.gstRate,
			itemCount: sql`COUNT(${purchaseItemsTable.id})`,
			taxableAmount: sql`COALESCE(SUM(CAST(${purchaseItemsTable.quantity} AS NUMERIC) * CAST(${purchaseItemsTable.purchasePrice} AS NUMERIC)), 0)`,
			cgstAmount: sql`COALESCE(SUM(CAST(${purchaseItemsTable.quantity} AS NUMERIC) * CAST(${purchaseItemsTable.purchasePrice} AS NUMERIC) * CAST(${productsTable.gstRate} AS NUMERIC) / 200), 0)`,
			sgstAmount: sql`COALESCE(SUM(CAST(${purchaseItemsTable.quantity} AS NUMERIC) * CAST(${purchaseItemsTable.purchasePrice} AS NUMERIC) * CAST(${productsTable.gstRate} AS NUMERIC) / 200), 0)`,
			totalAmount: sql`COALESCE(SUM(CAST(${purchaseItemsTable.quantity} AS NUMERIC) * CAST(${purchaseItemsTable.purchasePrice} AS NUMERIC) * (1 + CAST(${productsTable.gstRate} AS NUMERIC) / 100)), 0)`
		})
		.from(purchasesTable)
		.innerJoin(purchaseItemsTable, eq(purchasesTable.id, purchaseItemsTable.purchaseId))
		.innerJoin(batchesTable, eq(purchaseItemsTable.batchId, batchesTable.id))
		.innerJoin(productsTable, eq(batchesTable.productId, productsTable.id))
		.where(and(eq(purchasesTable.storeId, event.locals.user.storeId), ...purchaseDateFilters));

	const purchasesGST = await purchaseGstQuery.groupBy(productsTable.gstRate);

	return json({
		from,
		to,
		sales: salesGST.map((r) => ({
			gstRate: Number(r.gstRate || 0),
			itemCount: Number(r.itemCount || 0),
			taxableAmount: Number(r.taxableAmount || 0),
			cgstAmount: Number(r.cgstAmount || 0),
			sgstAmount: Number(r.sgstAmount || 0),
			totalAmount: Number(r.totalAmount || 0)
		})),
		b2b: {
			invoiceCount: Number(b2bResult[0]?.invoiceCount || 0),
			taxableAmount: Number(b2bResult[0]?.taxableAmount || 0),
			gstAmount: Number(b2bResult[0]?.gstAmount || 0),
			totalAmount: Number(b2bResult[0]?.totalAmount || 0)
		},
		b2c: {
			invoiceCount: Number(b2cResult[0]?.invoiceCount || 0),
			taxableAmount: Number(b2cResult[0]?.taxableAmount || 0),
			gstAmount: Number(b2cResult[0]?.gstAmount || 0),
			totalAmount: Number(b2cResult[0]?.totalAmount || 0)
		},
		purchases: purchasesGST.map((r) => ({
			gstRate: Number(r.gstRate || 0),
			itemCount: Number(r.itemCount || 0),
			taxableAmount: Number(r.taxableAmount || 0),
			cgstAmount: Number(r.cgstAmount || 0),
			sgstAmount: Number(r.sgstAmount || 0),
			totalAmount: Number(r.totalAmount || 0)
		}))
	});
}
