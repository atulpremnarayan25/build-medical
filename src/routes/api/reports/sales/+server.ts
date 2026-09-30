import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { salesTable, saleItemsTable, customersTable } from '$lib/server/db/schema.js';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import type { RequestEvent } from './$types';

export async function GET(event: RequestEvent) {
	if (!event.locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const url = new URL(event.request.url);
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');
	const customerId = url.searchParams.get('customerId');
	const saleType = url.searchParams.get('saleType');
	const paymentStatus = url.searchParams.get('paymentStatus');

	const filters = [eq(salesTable.storeId, event.locals.user.storeId)];

	if (from) {
		filters.push(gte(salesTable.createdAt, new Date(from)));
	}
	if (to) {
		const toDate = new Date(to);
		toDate.setHours(23, 59, 59, 999);
		filters.push(lte(salesTable.createdAt, toDate));
	}
	if (customerId) {
		filters.push(eq(salesTable.customerId, customerId));
	}
	if (saleType && saleType !== 'all') {
		filters.push(eq(salesTable.saleType, saleType));
	}
	if (paymentStatus && paymentStatus !== 'all') {
		filters.push(eq(salesTable.paymentStatus, paymentStatus));
	}

	const salesData = await db
		.select({
			id: salesTable.id,
			date: salesTable.createdAt,
			invoiceNumber: salesTable.invoiceNumber,
			saleType: salesTable.saleType,
			customerId: salesTable.customerId,
			customerName: customersTable.name,
			customerGstin: customersTable.gstin,
			customerPhone: customersTable.contactPhone,
			subtotal: salesTable.subtotal,
			gstAmount: salesTable.gstAmount,
			totalAmount: salesTable.totalAmount,
			amountPaidAtSale: salesTable.amountPaidAtSale,
			paymentStatus: salesTable.paymentStatus,
			itemsCount: sql`COALESCE((SELECT COUNT(*) FROM sale_items WHERE sale_items.sale_id = ${salesTable.id}), 0)`
		})
		.from(salesTable)
		.leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
		.where(and(...filters))
		.orderBy(desc(salesTable.createdAt));

	return json(
		salesData.map((r) => ({
			...r,
			subtotal: Number(r.subtotal || 0),
			gstAmount: Number(r.gstAmount || 0),
			totalAmount: Number(r.totalAmount || 0),
			amountPaidAtSale: Number(r.amountPaidAtSale || 0),
			dueAmount: Math.max(0, Number(r.totalAmount || 0) - Number(r.amountPaidAtSale || 0)),
			itemsCount: Number(r.itemsCount || 0)
		}))
	);
}
