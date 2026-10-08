import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import {
	salesTable,
	saleItemsTable,
	productsTable,
	batchesTable,
	customersTable,
	usersTable,
	storesTable
} from '$lib/server/db/schema.js';
import { eq, and, ne, desc, gte, lte, or, ilike } from 'drizzle-orm';
import type { RequestEvent } from './$types';

export async function GET(event: RequestEvent) {
	if (!event.locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const url = new URL(event.request.url);
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');
	const schedule = url.searchParams.get('schedule') || 'all';
	const search = url.searchParams.get('search')?.trim();

	const filters = [eq(salesTable.storeId, event.locals.user.storeId)];

	if (from) {
		const fromDate = new Date(from);
		fromDate.setHours(0, 0, 0, 0);
		filters.push(gte(salesTable.createdAt, fromDate));
	}
	if (to) {
		const toDate = new Date(to);
		toDate.setHours(23, 59, 59, 999);
		filters.push(lte(salesTable.createdAt, toDate));
	}

	if (schedule && schedule !== 'all') {
		filters.push(eq(productsTable.drugSchedule, schedule));
	} else {
		// All scheduled drugs (H, H1, X, etc. — exclude 'none' and empty string)
		filters.push(
			and(
				ne(productsTable.drugSchedule, 'none'),
				ne(productsTable.drugSchedule, '')
			)!
		);
	}

	if (search) {
		const q = `%${search}%`;
		filters.push(
			or(
				ilike(salesTable.invoiceNumber, q),
				ilike(salesTable.patientName, q),
				ilike(salesTable.prescriberName, q),
				ilike(salesTable.prescriberRegNo, q),
				ilike(productsTable.name, q),
				ilike(productsTable.genericName, q),
				ilike(productsTable.manufacturer, q),
				ilike(batchesTable.batchNo, q),
				ilike(customersTable.name, q)
			)!
		);
	}

	const [store] = await db
		.select({
			name: storesTable.name,
			address: storesTable.address,
			phone: storesTable.phone,
			gstin: storesTable.gstin,
			drugLicenseNo: storesTable.drugLicenseNo,
			drugLicenseNo2: storesTable.drugLicenseNo2
		})
		.from(storesTable)
		.where(eq(storesTable.id, event.locals.user.storeId))
		.limit(1);

	const rows = await db
		.select({
			saleItemId: saleItemsTable.id,
			saleId: salesTable.id,
			date: salesTable.createdAt,
			invoiceNumber: salesTable.invoiceNumber,
			saleType: salesTable.saleType,
			patientName: salesTable.patientName,
			prescriberName: salesTable.prescriberName,
			prescriberRegNo: salesTable.prescriberRegNo,
			notes: salesTable.notes,
			customerId: salesTable.customerId,
			customerName: customersTable.name,
			customerPhone: customersTable.contactPhone,
			customerAddress: customersTable.address,
			productId: productsTable.id,
			productName: productsTable.name,
			genericName: productsTable.genericName,
			manufacturer: productsTable.manufacturer,
			drugSchedule: productsTable.drugSchedule,
			hsnCode: productsTable.hsnCode,
			batchId: batchesTable.id,
			batchNo: batchesTable.batchNo,
			expiryDate: batchesTable.expiryDate,
			quantity: saleItemsTable.quantity,
			rate: saleItemsTable.rate,
			gstRate: saleItemsTable.gstRate,
			lineTotal: saleItemsTable.lineTotal,
			dispensedBy: usersTable.name
		})
		.from(saleItemsTable)
		.innerJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
		.innerJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
		.innerJoin(batchesTable, eq(saleItemsTable.batchId, batchesTable.id))
		.leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
		.leftJoin(usersTable, eq(salesTable.createdBy, usersTable.id))
		.where(and(...filters))
		.orderBy(desc(salesTable.createdAt));

	const formattedRows = rows.map((r) => {
		const patientDisplayName = r.patientName || r.customerName || 'Walk-in Customer';
		const patientFullAddress = r.customerAddress || (r.customerPhone ? `Contact: ${r.customerPhone}` : 'Local Resident');
		return {
			...r,
			patientDisplayName,
			patientFullAddress,
			medicineWithStrength: r.genericName ? `${r.productName} (${r.genericName})` : r.productName,
			billerName: r.dispensedBy || 'Registered Pharmacist',
			quantity: Number(r.quantity || 0),
			rate: Number(r.rate || 0),
			gstRate: Number(r.gstRate || 0),
			lineTotal: Number(r.lineTotal || 0)
		};
	});

	const summary = {
		totalEntries: formattedRows.length,
		distinctInvoices: new Set(formattedRows.map((r) => r.invoiceNumber)).size,
		totalQuantity: formattedRows.reduce((acc, r) => acc + r.quantity, 0),
		totalValue: formattedRows.reduce((acc, r) => acc + r.lineTotal, 0),
		h1Count: formattedRows.filter((r) => r.drugSchedule === 'H1').length,
		hCount: formattedRows.filter((r) => r.drugSchedule === 'H').length,
		xCount: formattedRows.filter((r) => r.drugSchedule === 'X').length
	};

	return json({
		store: store || {
			name: 'MedStock Pharmacy',
			address: '123 Healthcare Road, Medical Square',
			phone: '+91 98765 43210',
			gstin: '29ABCDE1234F1Z5',
			drugLicenseNo: 'KA-B2-192847',
			drugLicenseNo2: 'KA-B2-192848'
		},
		entries: formattedRows,
		summary
	});
}
