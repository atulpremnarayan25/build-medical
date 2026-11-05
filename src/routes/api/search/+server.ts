import { jsonResponse, errorResponse } from '$lib/server/apiUtils.js';
import { db } from '$lib/server/db/index.js';
import {
	productsTable,
	customersTable,
	suppliersTable,
	salesTable,
	purchasesTable
} from '$lib/server/db/schema.js';
import { eq, and, or, ilike, desc } from 'drizzle-orm';
import type { RequestEvent } from './$types.js';

export interface GlobalSearchResultItem {
	type: 'Product' | 'Customer' | 'Supplier' | 'Sale' | 'Purchase';
	id: string;
	title: string;
	subtitle: string;
	href: string;
}

export async function GET({ url, locals }: RequestEvent) {
	try {
		if (!locals.user) {
			return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
		}

		const query = (url.searchParams.get('q') || url.searchParams.get('query') || '').trim();
		if (!query || query.length < 2) {
			return jsonResponse({ items: [], groups: { products: [], customers: [], suppliers: [], sales: [], purchases: [] } });
		}

		const searchPattern = `%${query}%`;
		const storeId = locals.user.storeId;

		// 1. Products search
		const productConditions = [
			eq(productsTable.isActive, true),
			or(
				ilike(productsTable.name, searchPattern),
				ilike(productsTable.genericName, searchPattern),
				ilike(productsTable.barcode, searchPattern)
			)!
		];
		if (storeId) productConditions.push(eq(productsTable.storeId, storeId));

		// 2. Customers search
		const customerConditions = [
			eq(customersTable.isActive, true),
			or(
				ilike(customersTable.name, searchPattern),
				ilike(customersTable.contactPhone, searchPattern)
			)!
		];
		if (storeId) customerConditions.push(eq(customersTable.storeId, storeId));

		// 3. Suppliers search
		const supplierConditions = [
			eq(suppliersTable.isActive, true),
			or(
				ilike(suppliersTable.name, searchPattern),
				ilike(suppliersTable.contactPhone, searchPattern)
			)!
		];
		if (storeId) supplierConditions.push(eq(suppliersTable.storeId, storeId));

		// 4. Sales search
		const saleConditions = [
			or(
				ilike(salesTable.invoiceNumber, searchPattern),
				ilike(customersTable.name, searchPattern)
			)!
		];
		if (storeId) saleConditions.push(eq(salesTable.storeId, storeId));

		// 5. Purchases search
		const purchaseConditions = [
			or(
				ilike(purchasesTable.supplierInvoiceRef, searchPattern),
				ilike(suppliersTable.name, searchPattern)
			)!
		];
		if (storeId) purchaseConditions.push(eq(purchasesTable.storeId, storeId));

		// Parallel fetch with tight LIMIT 5 each
		const [products, customers, suppliers, sales, purchases] = await Promise.all([
			db
				.select({
					id: productsTable.id,
					name: productsTable.name,
					genericName: productsTable.genericName
				})
				.from(productsTable)
				.where(and(...productConditions))
				.limit(5),

			db
				.select({
					id: customersTable.id,
					name: customersTable.name,
					phone: customersTable.contactPhone
				})
				.from(customersTable)
				.where(and(...customerConditions))
				.limit(5),

			db
				.select({
					id: suppliersTable.id,
					name: suppliersTable.name,
					phone: suppliersTable.contactPhone
				})
				.from(suppliersTable)
				.where(and(...supplierConditions))
				.limit(5),

			db
				.select({
					id: salesTable.id,
					invoiceNumber: salesTable.invoiceNumber,
					customerName: customersTable.name
				})
				.from(salesTable)
				.leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
				.where(and(...saleConditions))
				.orderBy(desc(salesTable.createdAt))
				.limit(5),

			db
				.select({
					id: purchasesTable.id,
					invoiceNumber: purchasesTable.supplierInvoiceRef,
					supplierName: suppliersTable.name
				})
				.from(purchasesTable)
				.leftJoin(suppliersTable, eq(purchasesTable.supplierId, suppliersTable.id))
				.where(and(...purchaseConditions))
				.orderBy(desc(purchasesTable.createdAt))
				.limit(5)
		]);

		const formattedProducts: GlobalSearchResultItem[] = products.map((p) => ({
			type: 'Product',
			id: p.id,
			title: p.name,
			subtitle: p.genericName || 'No generic name',
			href: `/inventory/products/${p.id}`
		}));

		const formattedCustomers: GlobalSearchResultItem[] = customers.map((c) => ({
			type: 'Customer',
			id: c.id,
			title: c.name,
			subtitle: c.phone || 'No phone',
			href: `/customers/${c.id}`
		}));

		const formattedSuppliers: GlobalSearchResultItem[] = suppliers.map((s) => ({
			type: 'Supplier',
			id: s.id,
			title: s.name,
			subtitle: s.phone || 'No phone',
			href: `/suppliers/${s.id}`
		}));

		const formattedSales: GlobalSearchResultItem[] = sales.map((s) => ({
			type: 'Sale',
			id: s.id,
			title: s.invoiceNumber,
			subtitle: `Customer: ${s.customerName || 'Walk-in'}`,
			href: `/sales/${s.id}`
		}));

		const formattedPurchases: GlobalSearchResultItem[] = purchases.map((p) => ({
			type: 'Purchase',
			id: p.id,
			title: p.invoiceNumber || 'Purchase',
			subtitle: `Supplier: ${p.supplierName || 'N/A'}`,
			href: `/purchases/${p.id}`
		}));

		const combinedItems = [
			...formattedProducts,
			...formattedCustomers,
			...formattedSuppliers,
			...formattedSales,
			...formattedPurchases
		];

		return jsonResponse({
			items: combinedItems,
			groups: {
				products: formattedProducts,
				customers: formattedCustomers,
				suppliers: formattedSuppliers,
				sales: formattedSales,
				purchases: formattedPurchases
			}
		});
	} catch (err: any) {
		return errorResponse('INTERNAL_ERROR', err.message, 500);
	}
}
