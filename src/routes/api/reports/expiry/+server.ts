import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import {
	batchesTable,
	productsTable,
	suppliersTable,
	purchasesTable,
	storesTable
} from '$lib/server/db/schema.js';
import { eq, and, gt, asc, or, ilike } from 'drizzle-orm';
import type { RequestEvent } from './$types';

export async function GET(event: RequestEvent) {
	if (!event.locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const url = new URL(event.request.url);
	const windowFilter = url.searchParams.get('window') || 'all'; // 'all' | 'expired' | '30' | '60' | '90'
	const search = url.searchParams.get('search')?.trim();
	const supplierFilter = url.searchParams.get('supplierId');
	const storeId = event.locals.user.storeId;

	// Store info
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
		.where(eq(storesTable.id, storeId))
		.limit(1);

	// Fetch all batches with positive remaining stock
	const queryFilters = [
		eq(productsTable.storeId, storeId),
		gt(batchesTable.quantityRemaining, '0')
	];

	if (supplierFilter) {
		queryFilters.push(eq(batchesTable.supplierId, supplierFilter));
	}

	if (search) {
		const q = `%${search}%`;
		queryFilters.push(
			or(
				ilike(productsTable.name, q),
				ilike(productsTable.genericName, q),
				ilike(batchesTable.batchNo, q),
				ilike(suppliersTable.name, q)
			)!
		);
	}

	const rawBatches = await db
		.select({
			id: batchesTable.id,
			productId: productsTable.id,
			productName: productsTable.name,
			genericName: productsTable.genericName,
			manufacturer: productsTable.manufacturer,
			drugSchedule: productsTable.drugSchedule,
			hsnCode: productsTable.hsnCode,
			baseUnit: productsTable.baseUnit,
			batchNo: batchesTable.batchNo,
			expiryDate: batchesTable.expiryDate,
			mrp: batchesTable.mrp,
			purchasePrice: batchesTable.purchasePrice,
			quantityReceived: batchesTable.quantityReceived,
			quantityRemaining: batchesTable.quantityRemaining,
			supplierId: batchesTable.supplierId,
			supplierName: suppliersTable.name,
			supplierPhone: suppliersTable.contactPhone,
			supplierGstin: suppliersTable.gstin,
			purchaseId: batchesTable.purchaseId,
			purchaseInvoiceNo: purchasesTable.supplierInvoiceRef
		})
		.from(batchesTable)
		.innerJoin(productsTable, eq(batchesTable.productId, productsTable.id))
		.leftJoin(suppliersTable, eq(batchesTable.supplierId, suppliersTable.id))
		.leftJoin(purchasesTable, eq(batchesTable.purchaseId, purchasesTable.id))
		.where(and(...queryFilters))
		.orderBy(asc(batchesTable.expiryDate));

	const now = new Date();
	const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	// Process risk categorization
	const allItems = rawBatches.map((b) => {
		const exp = new Date(b.expiryDate);
		const expMidnight = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate());
		const diffTime = expMidnight.getTime() - todayDate.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		let category: 'expired' | '30_days' | '60_days' | '90_days' | 'safe';
		let riskLabel: string;
		let riskLevel: 'danger' | 'warning' | 'info' | 'safe';

		if (diffDays <= 0) {
			category = 'expired';
			riskLabel = diffDays === 0 ? 'Expires Today' : `Expired (${Math.abs(diffDays)}d ago)`;
			riskLevel = 'danger';
		} else if (diffDays <= 30) {
			category = '30_days';
			riskLabel = `< 30 Days (${diffDays}d left)`;
			riskLevel = 'danger';
		} else if (diffDays <= 60) {
			category = '60_days';
			riskLabel = `30–60 Days (${diffDays}d left)`;
			riskLevel = 'warning';
		} else if (diffDays <= 90) {
			category = '90_days';
			riskLabel = `60–90 Days (${diffDays}d left)`;
			riskLevel = 'info';
		} else {
			category = 'safe';
			riskLabel = `> 90 Days (${diffDays}d left)`;
			riskLevel = 'safe';
		}

		const remainingStock = Number(b.quantityRemaining || 0);
		const unitPurchaseCost = Number(b.purchasePrice || 0);
		const mrp = Number(b.mrp || 0);
		const totalValueAtRisk = Number((remainingStock * unitPurchaseCost).toFixed(2));
		const totalMrpValue = Number((remainingStock * mrp).toFixed(2));

		return {
			id: b.id,
			productId: b.productId,
			productName: b.productName,
			genericName: b.genericName,
			manufacturer: b.manufacturer || 'Standard',
			drugSchedule: b.drugSchedule,
			hsnCode: b.hsnCode,
			baseUnit: b.baseUnit,
			batchNo: b.batchNo,
			expiryDate: b.expiryDate,
			daysToExpiry: diffDays,
			category,
			riskLabel,
			riskLevel,
			remainingStock,
			unitPurchaseCost,
			mrp,
			totalValueAtRisk,
			totalMrpValue,
			supplierId: b.supplierId,
			supplierName: b.supplierName || 'Primary Distributor',
			supplierPhone: b.supplierPhone || null,
			supplierGstin: b.supplierGstin || null,
			purchaseId: b.purchaseId,
			purchaseInvoiceNo: b.purchaseInvoiceNo
		};
	});

	// Filter down by window if specified (exclude 'safe' by default if window is 'all' or '90')
	let filteredItems = allItems;
	if (windowFilter === 'expired') {
		filteredItems = allItems.filter((i) => i.category === 'expired');
	} else if (windowFilter === '30') {
		filteredItems = allItems.filter((i) => i.category === '30_days');
	} else if (windowFilter === '60') {
		filteredItems = allItems.filter((i) => i.category === '60_days');
	} else if (windowFilter === '90') {
		filteredItems = allItems.filter((i) => i.category === '90_days');
	} else if (windowFilter === 'all' || windowFilter === 'risk') {
		// All at risk: expired + 30 + 60 + 90 days
		filteredItems = allItems.filter((i) => i.category !== 'safe');
	}

	// Calculate statutory summary metrics
	const atRiskItems = allItems.filter((i) => i.category !== 'safe');
	const expiredItems = allItems.filter((i) => i.category === 'expired');
	const within30Items = allItems.filter((i) => i.category === '30_days');
	const within60Items = allItems.filter((i) => i.category === '60_days');
	const within90Items = allItems.filter((i) => i.category === '90_days');

	const summary = {
		totalBatchesAtRisk: atRiskItems.length,
		totalUnitsAtRisk: atRiskItems.reduce((acc, i) => acc + i.remainingStock, 0),
		totalCostAtRisk: Number(atRiskItems.reduce((acc, i) => acc + i.totalValueAtRisk, 0).toFixed(2)),
		totalMrpAtRisk: Number(atRiskItems.reduce((acc, i) => acc + i.totalMrpValue, 0).toFixed(2)),

		expiredCount: expiredItems.length,
		expiredCost: Number(expiredItems.reduce((acc, i) => acc + i.totalValueAtRisk, 0).toFixed(2)),

		within30Count: within30Items.length,
		within30Cost: Number(within30Items.reduce((acc, i) => acc + i.totalValueAtRisk, 0).toFixed(2)),

		within60Count: within60Items.length,
		within60Cost: Number(within60Items.reduce((acc, i) => acc + i.totalValueAtRisk, 0).toFixed(2)),

		within90Count: within90Items.length,
		within90Cost: Number(within90Items.reduce((acc, i) => acc + i.totalValueAtRisk, 0).toFixed(2))
	};

	// Group at-risk items by supplier for bulk return notes
	const supplierMap = new Map<
		string,
		{
			supplierId: string | null;
			supplierName: string;
			supplierPhone: string | null;
			batchCount: number;
			totalUnits: number;
			totalValue: number;
			batchIds: string[];
		}
	>();

	for (const item of atRiskItems) {
		const key = item.supplierId || 'unknown';
		let s = supplierMap.get(key);
		if (!s) {
			s = {
				supplierId: item.supplierId,
				supplierName: item.supplierName,
				supplierPhone: item.supplierPhone,
				batchCount: 0,
				totalUnits: 0,
				totalValue: 0,
				batchIds: []
			};
			supplierMap.set(key, s);
		}
		s.batchCount += 1;
		s.totalUnits += item.remainingStock;
		s.totalValue = Number((s.totalValue + item.totalValueAtRisk).toFixed(2));
		s.batchIds.push(item.id);
	}

	const suppliersAtRisk = Array.from(supplierMap.values()).sort(
		(a, b) => b.totalValue - a.totalValue
	);

	return json({
		store: store || {
			name: 'MedStock Pharmacy',
			address: '123 Healthcare Road, Medical Square',
			phone: '+91 98765 43210',
			gstin: '29ABCDE1234F1Z5',
			drugLicenseNo: 'KA-B2-192847',
			drugLicenseNo2: 'KA-B2-192848'
		},
		summary,
		items: filteredItems,
		suppliersAtRisk
	});
}
