import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import {
	customersTable,
	suppliersTable,
	salesTable,
	purchasesTable,
	paymentsTable,
	returnsTable,
	returnItemsTable
} from '$lib/server/db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { RequestEvent } from './$types';

export async function GET(event: RequestEvent) {
	if (!event.locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const url = new URL(event.request.url);
	const type = url.searchParams.get('type') || 'receivable'; // 'receivable' | 'payable'
	const partyId = url.searchParams.get('partyId');

	if (type === 'receivable') {
		// Customer Ledgers & Balances
		if (partyId) {
			// Specific customer statement
			const customer = await db
				.select()
				.from(customersTable)
				.where(and(eq(customersTable.id, partyId), eq(customersTable.storeId, event.locals.user.storeId)))
				.then((rows) => rows[0]);

			if (!customer) {
				return new Response('Customer not found', { status: 404 });
			}

			// Invoices (Dr: Sale debt increases)
			const sales = await db
				.select({
					id: salesTable.id,
					date: salesTable.createdAt,
					ref: salesTable.invoiceNumber,
					type: sql`'invoice'`,
					debit: salesTable.totalAmount,
					credit: sql`0`,
					particulars: sql`'Sales Invoice #' || ${salesTable.invoiceNumber}`
				})
				.from(salesTable)
				.where(and(eq(salesTable.customerId, partyId), eq(salesTable.storeId, event.locals.user.storeId)));

			// Payments (Cr: Customer payment reduces debt)
			const payments = await db
				.select({
					id: paymentsTable.id,
					date: paymentsTable.createdAt,
					ref: sql`COALESCE(${paymentsTable.notes}, 'Payment Received')`,
					type: sql`'receipt'`,
					debit: sql`0`,
					credit: paymentsTable.amount,
					particulars: sql`'Receipt via ' || ${paymentsTable.method}`
				})
				.from(paymentsTable)
				.where(
					and(
						eq(paymentsTable.customerId, partyId),
						eq(paymentsTable.direction, 'customer_payment'),
						eq(paymentsTable.storeId, event.locals.user.storeId)
					)
				);

			// Sales Returns (Cr: Sales return credit reduces debt)
			const returns = await db
				.select({
					id: returnsTable.id,
					date: returnsTable.createdAt,
					ref: sql`'RET-' || UPPER(SUBSTRING(${returnsTable.id}::text, 1, 8))`,
					type: sql`'return'`,
					debit: sql`0`,
					credit: sql`COALESCE(SUM(CAST(${returnItemsTable.lineAmount} AS NUMERIC)), 0)`,
					particulars: sql`'Sales Return - Inv #' || COALESCE(${salesTable.invoiceNumber}, 'Direct')`
				})
				.from(returnsTable)
				.innerJoin(salesTable, eq(returnsTable.originalSaleId, salesTable.id))
				.leftJoin(returnItemsTable, eq(returnsTable.id, returnItemsTable.returnId))
				.where(
					and(
						eq(salesTable.customerId, partyId),
						eq(returnsTable.returnType, 'sales_return')
					)
				)
				.groupBy(returnsTable.id, returnsTable.createdAt, salesTable.invoiceNumber);

			const combined = [...sales, ...payments, ...returns]
				.map((tx) => ({
					id: tx.id,
					date: tx.date ? new Date(tx.date).toISOString() : new Date().toISOString(),
					ref: String(tx.ref),
					type: String(tx.type),
					debit: Number(tx.debit || 0),
					credit: Number(tx.credit || 0),
					particulars: String(tx.particulars)
				}))
				.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

			let runningBalance = 0;
			const transactions = combined.map((tx) => {
				runningBalance = Math.round((runningBalance + tx.debit - tx.credit) * 100) / 100;
				return {
					...tx,
					balance: runningBalance
				};
			});

			return json({
				party: {
					id: customer.id,
					name: customer.name,
					phone: customer.contactPhone,
					gstin: customer.gstin,
					creditLimit: customer.creditLimit ? Number(customer.creditLimit) : null,
					type: 'customer'
				},
				closingBalance: runningBalance,
				transactions
			});
		} else {
			// All Customer Outstanding Receivables Summary
			const customers = await db
				.select({
					id: customersTable.id,
					name: customersTable.name,
					phone: customersTable.contactPhone,
					gstin: customersTable.gstin,
					creditLimit: customersTable.creditLimit,
					customerType: customersTable.customerType,
					totalSales: sql`COALESCE((SELECT SUM(CAST(total_amount AS NUMERIC)) FROM sales WHERE sales.customer_id = ${customersTable.id}), 0)`,
					totalPaid: sql`COALESCE((SELECT SUM(CAST(amount AS NUMERIC)) FROM payments WHERE payments.customer_id = ${customersTable.id} AND payments.direction = 'customer_payment'), 0)`,
					totalReturns: sql`COALESCE((SELECT SUM(CAST(ri.line_amount AS NUMERIC)) FROM returns r JOIN return_items ri ON r.id = ri.return_id JOIN sales s ON r.original_sale_id = s.id WHERE s.customer_id = ${customersTable.id} AND r.return_type = 'sales_return'), 0)`
				})
				.from(customersTable)
				.where(eq(customersTable.storeId, event.locals.user.storeId));

			return json(
				customers.map((c) => {
					const billed = Number(c.totalSales || 0);
					const paid = Number(c.totalPaid || 0);
					const returns = Number(c.totalReturns || 0);
					const balance = Math.round((billed - paid - returns) * 100) / 100;
					return {
						id: c.id,
						name: c.name,
						phone: c.phone,
						gstin: c.gstin,
						creditLimit: c.creditLimit ? Number(c.creditLimit) : null,
						customerType: c.customerType,
						totalBilled: billed,
						totalPaid: paid,
						totalReturns: returns,
						balanceDue: balance
					};
				})
			);
		}
	} else {
		// Payable: Supplier Ledgers & Balances
		if (partyId) {
			const supplier = await db
				.select()
				.from(suppliersTable)
				.where(and(eq(suppliersTable.id, partyId), eq(suppliersTable.storeId, event.locals.user.storeId)))
				.then((rows) => rows[0]);

			if (!supplier) {
				return new Response('Supplier not found', { status: 404 });
			}

			// Inward Bills (Cr: Supplier payable debt increases)
			const purchases = await db
				.select({
					id: purchasesTable.id,
					date: purchasesTable.createdAt,
					ref: purchasesTable.supplierInvoiceRef,
					type: sql`'purchase'`,
					debit: sql`0`,
					credit: purchasesTable.totalAmount,
					particulars: sql`'Purchase Bill #' || ${purchasesTable.supplierInvoiceRef}`
				})
				.from(purchasesTable)
				.where(and(eq(purchasesTable.supplierId, partyId), eq(purchasesTable.storeId, event.locals.user.storeId)));

			// Disbursements (Dr: Outflow payment reduces payable debt)
			const payments = await db
				.select({
					id: paymentsTable.id,
					date: paymentsTable.createdAt,
					ref: sql`COALESCE(${paymentsTable.notes}, 'Payment Disbursed')`,
					type: sql`'disbursement'`,
					debit: paymentsTable.amount,
					credit: sql`0`,
					particulars: sql`'Payment via ' || ${paymentsTable.method}`
				})
				.from(paymentsTable)
				.where(
					and(
						eq(paymentsTable.supplierId, partyId),
						eq(paymentsTable.direction, 'supplier_payment'),
						eq(paymentsTable.storeId, event.locals.user.storeId)
					)
				);

			// Purchase Returns (Dr: Returned goods reduce vendor payable debt)
			const returns = await db
				.select({
					id: returnsTable.id,
					date: returnsTable.createdAt,
					ref: sql`'RET-' || UPPER(SUBSTRING(${returnsTable.id}::text, 1, 8))`,
					type: sql`'return'`,
					debit: sql`COALESCE(SUM(CAST(${returnItemsTable.lineAmount} AS NUMERIC)), 0)`,
					credit: sql`0`,
					particulars: sql`'Purchase Return - Bill #' || COALESCE(${purchasesTable.supplierInvoiceRef}, 'Direct')`
				})
				.from(returnsTable)
				.innerJoin(purchasesTable, eq(returnsTable.originalPurchaseId, purchasesTable.id))
				.leftJoin(returnItemsTable, eq(returnsTable.id, returnItemsTable.returnId))
				.where(
					and(
						eq(purchasesTable.supplierId, partyId),
						eq(returnsTable.returnType, 'purchase_return')
					)
				)
				.groupBy(returnsTable.id, returnsTable.createdAt, purchasesTable.supplierInvoiceRef);

			const combined = [...purchases, ...payments, ...returns]
				.map((tx) => ({
					id: tx.id,
					date: tx.date ? new Date(tx.date).toISOString() : new Date().toISOString(),
					ref: String(tx.ref),
					type: String(tx.type),
					debit: Number(tx.debit || 0),
					credit: Number(tx.credit || 0),
					particulars: String(tx.particulars)
				}))
				.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

			let runningBalance = 0;
			const transactions = combined.map((tx) => {
				runningBalance = Math.round((runningBalance + tx.credit - tx.debit) * 100) / 100;
				return {
					...tx,
					balance: runningBalance
				};
			});

			return json({
				party: {
					id: supplier.id,
					name: supplier.name,
					phone: supplier.contactPhone,
					gstin: supplier.gstin,
					type: 'supplier'
				},
				closingBalance: runningBalance,
				transactions
			});
		} else {
			// All Supplier Outstanding Payables Summary
			const suppliers = await db
				.select({
					id: suppliersTable.id,
					name: suppliersTable.name,
					phone: suppliersTable.contactPhone,
					gstin: suppliersTable.gstin,
					totalPurchases: sql`COALESCE((SELECT SUM(CAST(total_amount AS NUMERIC)) FROM purchases WHERE purchases.supplier_id = ${suppliersTable.id}), 0)`,
					totalPaid: sql`COALESCE((SELECT SUM(CAST(amount AS NUMERIC)) FROM payments WHERE payments.supplier_id = ${suppliersTable.id} AND payments.direction = 'supplier_payment'), 0)`,
					totalReturns: sql`COALESCE((SELECT SUM(CAST(ri.line_amount AS NUMERIC)) FROM returns r JOIN return_items ri ON r.id = ri.return_id JOIN purchases p ON r.original_purchase_id = p.id WHERE p.supplier_id = ${suppliersTable.id} AND r.return_type = 'purchase_return'), 0)`
				})
				.from(suppliersTable)
				.where(eq(suppliersTable.storeId, event.locals.user.storeId));

			return json(
				suppliers.map((s) => {
					const purchased = Number(s.totalPurchases || 0);
					const paid = Number(s.totalPaid || 0);
					const returns = Number(s.totalReturns || 0);
					const balance = Math.round((purchased - paid - returns) * 100) / 100;
					return {
						id: s.id,
						name: s.name,
						phone: s.phone,
						gstin: s.gstin,
						totalPurchased: purchased,
						totalPaid: paid,
						totalReturns: returns,
						balancePayable: balance
					};
				})
			);
		}
	}
}
