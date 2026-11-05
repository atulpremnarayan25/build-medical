import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import {
	salesTable,
	saleItemsTable,
	customersTable,
	purchasesTable,
	purchaseItemsTable,
	batchesTable,
	productsTable,
	storesTable,
	returnsTable,
	returnItemsTable,
	suppliersTable,
	usersTable
} from '$lib/server/db/schema.js';
import { eq, ne, and, or, gte, lte, desc, inArray } from 'drizzle-orm';
import { toPaise, paiseToRupees } from '$lib/utils/money.js';
import type { RequestEvent } from './$types';

export async function GET(event: RequestEvent) {
	if (!event.locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const url = new URL(event.request.url);
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');
	const storeId = event.locals.user.storeId;

	// Store info for state code determination
	const [store] = await db
		.select({
			id: storesTable.id,
			name: storesTable.name,
			gstin: storesTable.gstin,
			address: storesTable.address,
			phone: storesTable.phone
		})
		.from(storesTable)
		.where(eq(storesTable.id, storeId))
		.limit(1);

	const storeGstin = store?.gstin?.trim() || '29ABCDE1234F1Z5';
	const storeStateCode = storeGstin.slice(0, 2) || '29';
	const defaultPos = `${storeStateCode}-Local State`;

	// Date filters for sales
	const salesDateFilters = [];
	if (from) {
		const fromDate = new Date(from);
		fromDate.setHours(0, 0, 0, 0);
		salesDateFilters.push(gte(salesTable.createdAt, fromDate));
	}
	if (to) {
		const toDate = new Date(to);
		toDate.setHours(23, 59, 59, 999);
		salesDateFilters.push(lte(salesTable.createdAt, toDate));
	}

	// 1. Fetch all sales within period
	const sales = await db
		.select({
			id: salesTable.id,
			invoiceNumber: salesTable.invoiceNumber,
			date: salesTable.createdAt,
			saleType: salesTable.saleType,
			subtotal: salesTable.subtotal,
			gstAmount: salesTable.gstAmount,
			totalAmount: salesTable.totalAmount,
			customerId: salesTable.customerId,
			customerName: customersTable.name,
			customerGstin: customersTable.gstin,
			customerAddress: customersTable.address
		})
		.from(salesTable)
		.leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
		.where(
			and(
				eq(salesTable.storeId, storeId),
				ne(salesTable.status, 'cancelled'),
				...salesDateFilters
			)
		)
		.orderBy(desc(salesTable.createdAt));

	// 2. Fetch all sale items with product HSN within period
	const saleItems = await db
		.select({
			id: saleItemsTable.id,
			saleId: saleItemsTable.saleId,
			productId: saleItemsTable.productId,
			productName: productsTable.name,
			genericName: productsTable.genericName,
			hsnCode: productsTable.hsnCode,
			baseUnit: productsTable.baseUnit,
			quantity: saleItemsTable.quantity,
			rate: saleItemsTable.rate,
			gstRate: saleItemsTable.gstRate,
			lineTotal: saleItemsTable.lineTotal
		})
		.from(saleItemsTable)
		.innerJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
		.innerJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
		.where(
			and(
				eq(salesTable.storeId, storeId),
				ne(salesTable.status, 'cancelled'),
				...salesDateFilters
			)
		);

	// Map items by saleId
	const itemsBySaleId = new Map<string, typeof saleItems>();
	for (const item of saleItems) {
		const list = itemsBySaleId.get(item.saleId) || [];
		list.push(item);
		itemsBySaleId.set(item.saleId, list);
	}

	// Categorize into B2B and B2C
	interface B2BInvoice {
		id: string;
		invoiceNumber: string;
		date: string;
		customerName: string;
		customerGstin: string;
		pos: string;
		reverseCharge: 'N';
		invoiceType: 'Regular';
		taxableAmount: number;
		cgstAmount: number;
		sgstAmount: number;
		igstAmount: number;
		gstAmount: number;
		totalAmount: number;
		rate: number;
	}

	const b2bInvoices: B2BInvoice[] = [];
	let b2bTaxablePaise = 0;
	let b2bCgstPaise = 0;
	let b2bSgstPaise = 0;
	let b2bIgstPaise = 0;
	let b2bGstPaise = 0;
	let b2bTotalPaise = 0;

	let b2cTaxablePaise = 0;
	let b2cCgstPaise = 0;
	let b2cSgstPaise = 0;
	let b2cGstPaise = 0;
	let b2cTotalPaise = 0;
	let b2cInvoiceCount = 0;

	// B2C Slabs aggregation map: key = gstRate
	const b2cSlabsMap = new Map<
		number,
		{
			gstRate: number;
			taxablePaise: number;
			cgstPaise: number;
			sgstPaise: number;
			totalPaise: number;
		}
	>();

	// Initialize standard slabs (0%, 5%, 12%, 18%)
	for (const rate of [0, 5, 12, 18]) {
		b2cSlabsMap.set(rate, {
			gstRate: rate,
			taxablePaise: 0,
			cgstPaise: 0,
			sgstPaise: 0,
			totalPaise: 0
		});
	}

	// HSN Map: key = hsnCode
	const hsnMap = new Map<
		string,
		{
			hsnCode: string;
			description: string;
			uqc: string;
			totalQuantity: number;
			totalValuePaise: number;
			taxableValuePaise: number;
			cgstPaise: number;
			sgstPaise: number;
			igstPaise: number;
		}
	>();

	for (const sale of sales) {
		const hasValidGstin = Boolean(sale.customerGstin && sale.customerGstin.trim().length >= 5);

		const invTaxablePaise = toPaise(sale.subtotal);
		const invGstPaise = toPaise(sale.gstAmount);
		const invTotalPaise = toPaise(sale.totalAmount);

		const items = itemsBySaleId.get(sale.id) || [];

		if (hasValidGstin) {
			// B2B INVOICE
			const customerGstin = sale.customerGstin!.trim();
			const custStateCode = customerGstin.slice(0, 2);
			const isInterState = custStateCode !== storeStateCode;
			const pos = isInterState ? `${custStateCode}-Other State` : defaultPos;

			let invCgst = 0;
			let invSgst = 0;
			let invIgst = 0;

			if (isInterState) {
				invIgst = invGstPaise;
			} else {
				invCgst = Math.floor(invGstPaise / 2);
				invSgst = invGstPaise - invCgst;
			}

			// Weighted or primary GST rate
			const maxRate =
				items.length > 0 ? Math.max(...items.map((it) => Number(it.gstRate || 0))) : 12;

			b2bInvoices.push({
				id: sale.id,
				invoiceNumber: sale.invoiceNumber,
				date: sale.date.toISOString(),
				customerName: sale.customerName || 'Registered Purchaser',
				customerGstin,
				pos,
				reverseCharge: 'N',
				invoiceType: 'Regular',
				taxableAmount: paiseToRupees(invTaxablePaise),
				cgstAmount: paiseToRupees(invCgst),
				sgstAmount: paiseToRupees(invSgst),
				igstAmount: paiseToRupees(invIgst),
				gstAmount: paiseToRupees(invGstPaise),
				totalAmount: paiseToRupees(invTotalPaise),
				rate: maxRate
			});

			b2bTaxablePaise += invTaxablePaise;
			b2bCgstPaise += invCgst;
			b2bSgstPaise += invSgst;
			b2bIgstPaise += invIgst;
			b2bGstPaise += invGstPaise;
			b2bTotalPaise += invTotalPaise;
		} else {
			// B2C INVOICE
			b2cInvoiceCount++;
			b2cTaxablePaise += invTaxablePaise;
			b2cGstPaise += invGstPaise;
			b2cTotalPaise += invTotalPaise;

			const halfGst = Math.floor(invGstPaise / 2);
			b2cCgstPaise += halfGst;
			b2cSgstPaise += invGstPaise - halfGst;

			// Break down into slabs using items if available, or fall back to 12% standard
			if (items.length > 0) {
				for (const it of items) {
					const r = Number(it.gstRate || 0);
					const lineTotalPaise = toPaise(it.lineTotal || 0);
					const lineTaxablePaise = Math.round((lineTotalPaise * 100) / (100 + r));
					const lineGstPaise = lineTotalPaise - lineTaxablePaise;
					const cgst = Math.floor(lineGstPaise / 2);
					const sgst = lineGstPaise - cgst;

					let slab = b2cSlabsMap.get(r);
					if (!slab) {
						slab = { gstRate: r, taxablePaise: 0, cgstPaise: 0, sgstPaise: 0, totalPaise: 0 };
						b2cSlabsMap.set(r, slab);
					}
					slab.taxablePaise += lineTaxablePaise;
					slab.cgstPaise += cgst;
					slab.sgstPaise += sgst;
					slab.totalPaise += lineTotalPaise;
				}
			} else {
				// Fallback slab
				const slab = b2cSlabsMap.get(12)!;
				slab.taxablePaise += invTaxablePaise;
				slab.cgstPaise += halfGst;
				slab.sgstPaise += invGstPaise - halfGst;
				slab.totalPaise += invTotalPaise;
			}
		}

		// Process HSN summary (Table 12) for all items in this sale
		for (const it of items) {
			const rawHsn = it.hsnCode?.trim();
			const hsnCode = rawHsn && rawHsn.length >= 4 ? rawHsn : '30049099';
			const desc = it.genericName || it.productName || 'Medicament Formulation';
			const uqc = (it.baseUnit || 'Unit').toUpperCase().slice(0, 3);
			const qty = Number(it.quantity || 0);

			const r = Number(it.gstRate || 0);
			const lineTotalPaise = toPaise(it.lineTotal || 0);
			const lineTaxablePaise = Math.round((lineTotalPaise * 100) / (100 + r));
			const lineGstPaise = lineTotalPaise - lineTaxablePaise;

			const isInterState = hasValidGstin && sale.customerGstin?.slice(0, 2) !== storeStateCode;
			let cgst = 0;
			let sgst = 0;
			let igst = 0;

			if (isInterState) {
				igst = lineGstPaise;
			} else {
				cgst = Math.floor(lineGstPaise / 2);
				sgst = lineGstPaise - cgst;
			}

			let entry = hsnMap.get(hsnCode);
			if (!entry) {
				entry = {
					hsnCode,
					description: desc,
					uqc: `${uqc} - ${it.baseUnit || 'Units'}`,
					totalQuantity: 0,
					totalValuePaise: 0,
					taxableValuePaise: 0,
					cgstPaise: 0,
					sgstPaise: 0,
					igstPaise: 0
				};
				hsnMap.set(hsnCode, entry);
			}

			entry.totalQuantity += qty;
			entry.totalValuePaise += lineTotalPaise;
			entry.taxableValuePaise += lineTaxablePaise;
			entry.cgstPaise += cgst;
			entry.sgstPaise += sgst;
			entry.igstPaise += igst;
		}
	}

	// Format B2C slabs
	const b2cSlabs = Array.from(b2cSlabsMap.values())
		.sort((a, b) => a.gstRate - b.gstRate)
		.map((s) => ({
			gstRate: s.gstRate,
			taxableAmount: paiseToRupees(s.taxablePaise),
			cgstAmount: paiseToRupees(s.cgstPaise),
			sgstAmount: paiseToRupees(s.sgstPaise),
			totalTax: paiseToRupees(s.cgstPaise + s.sgstPaise),
			totalAmount: paiseToRupees(s.totalPaise)
		}));

	// Format HSN summary Table 12
	const hsnSummary = Array.from(hsnMap.values())
		.sort((a, b) => b.totalValuePaise - a.totalValuePaise)
		.map((h) => ({
			hsnCode: h.hsnCode,
			description: h.description,
			uqc: h.uqc,
			totalQuantity: Math.round(h.totalQuantity * 100) / 100,
			totalValue: paiseToRupees(h.totalValuePaise),
			taxableValue: paiseToRupees(h.taxableValuePaise),
			cgstAmount: paiseToRupees(h.cgstPaise),
			sgstAmount: paiseToRupees(h.sgstPaise),
			igstAmount: paiseToRupees(h.igstPaise),
			cessAmount: 0
		}));

	// Overall totals (Guaranteed exact match with b2b + b2c)
	const totalTaxablePaise = b2bTaxablePaise + b2cTaxablePaise;
	const totalGstPaise = b2bGstPaise + b2cGstPaise;
	const totalAmountPaise = b2bTotalPaise + b2cTotalPaise;
	const totalInvoices = sales.length;

	// 3. Purchase ITC breakdown
	const purchaseDateFilters = [];
	if (from) {
		const fromDate = new Date(from);
		fromDate.setHours(0, 0, 0, 0);
		purchaseDateFilters.push(gte(purchasesTable.createdAt, fromDate));
	}
	if (to) {
		const toDate = new Date(to);
		toDate.setHours(23, 59, 59, 999);
		purchaseDateFilters.push(lte(purchasesTable.createdAt, toDate));
	}

	const purchaseItems = await db
		.select({
			id: purchaseItemsTable.id,
			gstRate: productsTable.gstRate,
			quantity: purchaseItemsTable.quantity,
			purchasePrice: purchaseItemsTable.purchasePrice
		})
		.from(purchasesTable)
		.innerJoin(purchaseItemsTable, eq(purchasesTable.id, purchaseItemsTable.purchaseId))
		.innerJoin(batchesTable, eq(purchaseItemsTable.batchId, batchesTable.id))
		.innerJoin(productsTable, eq(batchesTable.productId, productsTable.id))
		.where(
			and(
				eq(purchasesTable.storeId, storeId),
				ne(purchasesTable.status, 'cancelled'),
				...purchaseDateFilters
			)
		);

	const itcSlabsMap = new Map<
		number,
		{
			taxablePaise: number;
			cgstPaise: number;
			sgstPaise: number;
			totalPaise: number;
			count: number;
		}
	>();
	for (const rate of [0, 5, 12, 18]) {
		itcSlabsMap.set(rate, { taxablePaise: 0, cgstPaise: 0, sgstPaise: 0, totalPaise: 0, count: 0 });
	}

	for (const p of purchaseItems) {
		const r = Number(p.gstRate || 0);
		const qty = Number(p.quantity || 0);
		const pricePaise = toPaise(p.purchasePrice || 0);
		const taxablePaise = Math.round(qty * pricePaise);
		const gstPaise = Math.round((taxablePaise * r) / 100);
		const cgst = Math.floor(gstPaise / 2);
		const sgst = gstPaise - cgst;
		const totalPaise = taxablePaise + gstPaise;

		let slab = itcSlabsMap.get(r);
		if (!slab) {
			slab = { taxablePaise: 0, cgstPaise: 0, sgstPaise: 0, totalPaise: 0, count: 0 };
			itcSlabsMap.set(r, slab);
		}
		slab.taxablePaise += taxablePaise;
		slab.cgstPaise += cgst;
		slab.sgstPaise += sgst;
		slab.totalPaise += totalPaise;
		slab.count += 1;
	}

	const purchases = Array.from(itcSlabsMap.entries())
		.sort(([a], [b]) => a - b)
		.map(([rate, data]) => ({
			gstRate: rate,
			itemCount: data.count,
			taxableAmount: paiseToRupees(data.taxablePaise),
			cgstAmount: paiseToRupees(data.cgstPaise),
			sgstAmount: paiseToRupees(data.sgstPaise),
			totalAmount: paiseToRupees(data.totalPaise)
		}));

	// Overall sales slabs breakdown for quick overview
	const overallSalesSlabs = [0, 5, 12, 18].map((rate) => {
		const b2cSlab = b2cSlabs.find((s) => s.gstRate === rate);
		const b2bTaxable = b2bInvoices
			.filter((inv) => inv.rate === rate)
			.reduce((s, i) => s + i.taxableAmount, 0);
		const b2bCgst = b2bInvoices
			.filter((inv) => inv.rate === rate)
			.reduce((s, i) => s + i.cgstAmount, 0);
		const b2bSgst = b2bInvoices
			.filter((inv) => inv.rate === rate)
			.reduce((s, i) => s + i.sgstAmount, 0);
		const b2bTotal = b2bInvoices
			.filter((inv) => inv.rate === rate)
			.reduce((s, i) => s + i.totalAmount, 0);

		return {
			gstRate: rate,
			taxableAmount: Number(((b2cSlab?.taxableAmount || 0) + b2bTaxable).toFixed(2)),
			cgstAmount: Number(((b2cSlab?.cgstAmount || 0) + b2bCgst).toFixed(2)),
			sgstAmount: Number(((b2cSlab?.sgstAmount || 0) + b2bSgst).toFixed(2)),
			totalAmount: Number(((b2cSlab?.totalAmount || 0) + b2bTotal).toFixed(2))
		};
	});

	// 4. Returns & Table 9B Credit/Debit Notes
	const returnDateFilters = [];
	if (from) {
		const fromDate = new Date(from);
		fromDate.setHours(0, 0, 0, 0);
		returnDateFilters.push(gte(returnsTable.createdAt, fromDate));
	}
	if (to) {
		const toDate = new Date(to);
		toDate.setHours(23, 59, 59, 999);
		returnDateFilters.push(lte(returnsTable.createdAt, toDate));
	}

	const rawReturns = await db
		.select({
			id: returnsTable.id,
			returnType: returnsTable.returnType,
			reason: returnsTable.reason,
			createdAt: returnsTable.createdAt,
			originalSaleId: returnsTable.originalSaleId,
			originalPurchaseId: returnsTable.originalPurchaseId,
			saleInvoiceNumber: salesTable.invoiceNumber,
			customerName: customersTable.name,
			customerGstin: customersTable.gstin,
			purchaseInvoiceRef: purchasesTable.supplierInvoiceRef,
			supplierName: suppliersTable.name,
			supplierGstin: suppliersTable.gstin
		})
		.from(returnsTable)
		.leftJoin(usersTable, eq(returnsTable.createdBy, usersTable.id))
		.leftJoin(salesTable, eq(returnsTable.originalSaleId, salesTable.id))
		.leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
		.leftJoin(purchasesTable, eq(returnsTable.originalPurchaseId, purchasesTable.id))
		.leftJoin(suppliersTable, eq(purchasesTable.supplierId, suppliersTable.id))
		.where(
			and(
				or(
					eq(usersTable.storeId, storeId),
					eq(salesTable.storeId, storeId),
					eq(purchasesTable.storeId, storeId)
				),
				...returnDateFilters
			)
		)
		.orderBy(desc(returnsTable.createdAt));

	let returnItems: any[] = [];
	if (rawReturns.length > 0) {
		const returnIds = rawReturns.map((r) => r.id);
		returnItems = await db
			.select({
				id: returnItemsTable.id,
				returnId: returnItemsTable.returnId,
				batchId: returnItemsTable.batchId,
				quantity: returnItemsTable.quantity,
				lineAmount: returnItemsTable.lineAmount,
				productId: batchesTable.productId,
				productName: productsTable.name,
				hsnCode: productsTable.hsnCode,
				gstRate: productsTable.gstRate,
				baseUnit: productsTable.baseUnit
			})
			.from(returnItemsTable)
			.leftJoin(batchesTable, eq(returnItemsTable.batchId, batchesTable.id))
			.leftJoin(productsTable, eq(batchesTable.productId, productsTable.id))
			.where(inArray(returnItemsTable.returnId, returnIds));
	}

	const itemsByReturnId = new Map<string, typeof returnItems>();
	for (const item of returnItems) {
		const list = itemsByReturnId.get(item.returnId) || [];
		list.push(item);
		itemsByReturnId.set(item.returnId, list);
	}

	const creditNotes: any[] = [];
	let cnTaxablePaise = 0;
	let cnCgstPaise = 0;
	let cnSgstPaise = 0;
	let cnIgstPaise = 0;
	let cnGstPaise = 0;
	let cnTotalPaise = 0;

	const debitNotes: any[] = [];
	let dnTaxablePaise = 0;
	let dnCgstPaise = 0;
	let dnSgstPaise = 0;
	let dnIgstPaise = 0;
	let dnGstPaise = 0;
	let dnTotalPaise = 0;

	for (const rtn of rawReturns) {
		const items = itemsByReturnId.get(rtn.id) || [];
		let rtnTotalPaise = 0;
		let rtnTaxablePaise = 0;
		let rtnCgstPaise = 0;
		let rtnSgstPaise = 0;
		let rtnIgstPaise = 0;

		if (rtn.returnType === 'sales_return') {
			const hasValidGstin = Boolean(rtn.customerGstin && rtn.customerGstin.trim().length >= 5);
			const isInterState = hasValidGstin && rtn.customerGstin!.trim().slice(0, 2) !== storeStateCode;

			for (const it of items) {
				const r = Number(it.gstRate || 0);
				const lineTotalPaise = toPaise(it.lineAmount || 0);
				const lineTaxablePaise = Math.round((lineTotalPaise * 100) / (100 + r));
				const lineGstPaise = lineTotalPaise - lineTaxablePaise;

				let cgst = 0;
				let sgst = 0;
				let igst = 0;
				if (isInterState) {
					igst = lineGstPaise;
				} else {
					cgst = Math.floor(lineGstPaise / 2);
					sgst = lineGstPaise - cgst;
				}

				rtnTotalPaise += lineTotalPaise;
				rtnTaxablePaise += lineTaxablePaise;
				rtnCgstPaise += cgst;
				rtnSgstPaise += sgst;
				rtnIgstPaise += igst;
			}

			const noteNumber = `CN-${rtn.id.slice(0, 8).toUpperCase()}`;
			const maxRate = items.length > 0 ? Math.max(...items.map((it) => Number(it.gstRate || 0))) : 12;

			creditNotes.push({
				id: rtn.id,
				noteNumber,
				noteType: 'C',
				date: rtn.createdAt ? new Date(rtn.createdAt).toISOString() : new Date().toISOString(),
				originalInvoiceNumber: rtn.saleInvoiceNumber || 'N/A',
				recipientName: rtn.customerName || 'Walk-in Customer',
				recipientGstin: rtn.customerGstin || '',
				isRegistered: hasValidGstin,
				reason: rtn.reason,
				taxableAmount: paiseToRupees(rtnTaxablePaise),
				cgstAmount: paiseToRupees(rtnCgstPaise),
				sgstAmount: paiseToRupees(rtnSgstPaise),
				igstAmount: paiseToRupees(rtnIgstPaise),
				gstAmount: paiseToRupees(rtnCgstPaise + rtnSgstPaise + rtnIgstPaise),
				totalAmount: paiseToRupees(rtnTotalPaise),
				rate: maxRate
			});

			cnTaxablePaise += rtnTaxablePaise;
			cnCgstPaise += rtnCgstPaise;
			cnSgstPaise += rtnSgstPaise;
			cnIgstPaise += rtnIgstPaise;
			cnGstPaise += rtnCgstPaise + rtnSgstPaise + rtnIgstPaise;
			cnTotalPaise += rtnTotalPaise;
		} else if (rtn.returnType === 'purchase_return') {
			const hasValidGstin = Boolean(rtn.supplierGstin && rtn.supplierGstin.trim().length >= 5);
			const isInterState = hasValidGstin && rtn.supplierGstin!.trim().slice(0, 2) !== storeStateCode;

			for (const it of items) {
				const r = Number(it.gstRate || 0);
				const lineTotalPaise = toPaise(it.lineAmount || 0);
				const lineTaxablePaise = Math.round((lineTotalPaise * 100) / (100 + r));
				const lineGstPaise = lineTotalPaise - lineTaxablePaise;

				let cgst = 0;
				let sgst = 0;
				let igst = 0;
				if (isInterState) {
					igst = lineGstPaise;
				} else {
					cgst = Math.floor(lineGstPaise / 2);
					sgst = lineGstPaise - cgst;
				}

				rtnTotalPaise += lineTotalPaise;
				rtnTaxablePaise += lineTaxablePaise;
				rtnCgstPaise += cgst;
				rtnSgstPaise += sgst;
				rtnIgstPaise += igst;
			}

			const noteNumber = `DN-${rtn.id.slice(0, 8).toUpperCase()}`;
			const maxRate = items.length > 0 ? Math.max(...items.map((it) => Number(it.gstRate || 0))) : 12;

			debitNotes.push({
				id: rtn.id,
				noteNumber,
				noteType: 'D',
				date: rtn.createdAt ? new Date(rtn.createdAt).toISOString() : new Date().toISOString(),
				originalBillRef: rtn.purchaseInvoiceRef || 'N/A',
				supplierName: rtn.supplierName || 'Supplier',
				supplierGstin: rtn.supplierGstin || '',
				reason: rtn.reason,
				taxableAmount: paiseToRupees(rtnTaxablePaise),
				cgstAmount: paiseToRupees(rtnCgstPaise),
				sgstAmount: paiseToRupees(rtnSgstPaise),
				igstAmount: paiseToRupees(rtnIgstPaise),
				gstAmount: paiseToRupees(rtnCgstPaise + rtnSgstPaise + rtnIgstPaise),
				totalAmount: paiseToRupees(rtnTotalPaise),
				rate: maxRate
			});

			dnTaxablePaise += rtnTaxablePaise;
			dnCgstPaise += rtnCgstPaise;
			dnSgstPaise += rtnSgstPaise;
			dnIgstPaise += rtnIgstPaise;
			dnGstPaise += rtnCgstPaise + rtnSgstPaise + rtnIgstPaise;
			dnTotalPaise += rtnTotalPaise;
		}
	}

	let grossItcTaxablePaise = 0;
	let grossItcCgstPaise = 0;
	let grossItcSgstPaise = 0;
	let grossItcTotalPaise = 0;
	for (const itc of itcSlabsMap.values()) {
		grossItcTaxablePaise += itc.taxablePaise;
		grossItcCgstPaise += itc.cgstPaise;
		grossItcSgstPaise += itc.sgstPaise;
		grossItcTotalPaise += itc.totalPaise;
	}

	const netItcTaxablePaise = Math.max(0, grossItcTaxablePaise - dnTaxablePaise);
	const netItcCgstPaise = Math.max(0, grossItcCgstPaise - dnCgstPaise);
	const netItcSgstPaise = Math.max(0, grossItcSgstPaise - dnSgstPaise);
	const netItcTotalPaise = Math.max(0, grossItcTotalPaise - dnTotalPaise);

	return json({
		from,
		to,
		store: {
			name: store?.name || 'MedStock Pharmacy',
			gstin: storeGstin,
			stateCode: storeStateCode,
			pos: defaultPos
		},
		totals: {
			invoiceCount: totalInvoices,
			taxableAmount: paiseToRupees(totalTaxablePaise),
			gstAmount: paiseToRupees(totalGstPaise),
			cgstAmount: paiseToRupees(b2bCgstPaise + b2cCgstPaise),
			sgstAmount: paiseToRupees(b2bSgstPaise + b2cSgstPaise),
			igstAmount: paiseToRupees(b2bIgstPaise),
			totalAmount: paiseToRupees(totalAmountPaise)
		},
		b2b: {
			summary: {
				invoiceCount: b2bInvoices.length,
				taxableAmount: paiseToRupees(b2bTaxablePaise),
				cgstAmount: paiseToRupees(b2bCgstPaise),
				sgstAmount: paiseToRupees(b2bSgstPaise),
				igstAmount: paiseToRupees(b2bIgstPaise),
				gstAmount: paiseToRupees(b2bGstPaise),
				totalAmount: paiseToRupees(b2bTotalPaise)
			},
			invoices: b2bInvoices
		},
		b2c: {
			summary: {
				invoiceCount: b2cInvoiceCount,
				taxableAmount: paiseToRupees(b2cTaxablePaise),
				cgstAmount: paiseToRupees(b2cCgstPaise),
				sgstAmount: paiseToRupees(b2cSgstPaise),
				gstAmount: paiseToRupees(b2cGstPaise),
				totalAmount: paiseToRupees(b2cTotalPaise)
			},
			slabs: b2cSlabs
		},
		hsnSummary,
		sales: overallSalesSlabs,
		purchases,
		table9b: {
			creditNotes: {
				summary: {
					noteCount: creditNotes.length,
					taxableAmount: paiseToRupees(cnTaxablePaise),
					cgstAmount: paiseToRupees(cnCgstPaise),
					sgstAmount: paiseToRupees(cnSgstPaise),
					igstAmount: paiseToRupees(cnIgstPaise),
					gstAmount: paiseToRupees(cnGstPaise),
					totalAmount: paiseToRupees(cnTotalPaise)
				},
				notes: creditNotes
			},
			debitNotes: {
				summary: {
					noteCount: debitNotes.length,
					taxableAmount: paiseToRupees(dnTaxablePaise),
					cgstAmount: paiseToRupees(dnCgstPaise),
					sgstAmount: paiseToRupees(dnSgstPaise),
					igstAmount: paiseToRupees(dnIgstPaise),
					gstAmount: paiseToRupees(dnGstPaise),
					totalAmount: paiseToRupees(dnTotalPaise)
				},
				notes: debitNotes
			}
		},
		itcSummary: {
			grossItc: {
				taxableAmount: paiseToRupees(grossItcTaxablePaise),
				cgstAmount: paiseToRupees(grossItcCgstPaise),
				sgstAmount: paiseToRupees(grossItcSgstPaise),
				totalAmount: paiseToRupees(grossItcTotalPaise)
			},
			reversedItc: {
				taxableAmount: paiseToRupees(dnTaxablePaise),
				cgstAmount: paiseToRupees(dnCgstPaise),
				sgstAmount: paiseToRupees(dnSgstPaise),
				totalAmount: paiseToRupees(dnTotalPaise)
			},
			netItc: {
				taxableAmount: paiseToRupees(netItcTaxablePaise),
				cgstAmount: paiseToRupees(netItcCgstPaise),
				sgstAmount: paiseToRupees(netItcSgstPaise),
				totalAmount: paiseToRupees(netItcTotalPaise)
			}
		}
	});
}
