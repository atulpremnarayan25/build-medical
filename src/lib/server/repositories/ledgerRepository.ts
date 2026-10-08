import type { LedgerRepository } from '$lib/repositories/ledgerRepository.js';
import type { LedgerEntry, CreateLedgerEntryInput } from '$lib/types/index.js';
import {
	salesTable,
	purchasesTable,
	paymentsTable,
	customersTable,
	suppliersTable,
	returnsTable,
	returnItemsTable
} from '../db/schema.js';
import { eq, and, or, sql } from 'drizzle-orm';

export class DbLedgerRepository implements LedgerRepository {
	private _db;

	constructor(database: any) {
		this._db = database;
	}

	async getAll(): Promise<LedgerEntry[]> {
		return [];
	}

	async getByPartyId(partyId: string): Promise<LedgerEntry[]> {
		// 1. Resolve party identity (Customer vs Supplier)
		const [customer] = await this._db
			.select()
			.from(customersTable)
			.where(eq(customersTable.id, partyId))
			.limit(1);

		const [supplier] = !customer
			? await this._db
					.select()
					.from(suppliersTable)
					.where(eq(suppliersTable.id, partyId))
					.limit(1)
			: [null];

		const entries: LedgerEntry[] = [];

		if (customer) {
			const partyName = customer.name;

			// Invoices (Dr: Sale debt increases)
			const rawSales = await this._db
				.select()
				.from(salesTable)
				.where(eq(salesTable.customerId, partyId));

			for (const sale of rawSales) {
				const dateStr = sale.createdAt ? new Date(sale.createdAt).toISOString() : new Date().toISOString();
				entries.push({
					id: sale.id,
					date: dateStr,
					partyId,
					partyName,
					partyType: 'customer',
					type: 'sale',
					reference: sale.invoiceNumber,
					particulars: `Sales Invoice #${sale.invoiceNumber}`,
					debit: Number(sale.totalAmount || 0),
					credit: 0,
					balance: 0,
					createdAt: dateStr
				});
			}

			// Payment Receipts (Cr: Customer payment reduces debt)
			const rawPayments = await this._db
				.select()
				.from(paymentsTable)
				.where(
					and(
						eq(paymentsTable.customerId, partyId),
						eq(paymentsTable.direction, 'customer_payment')
					)
				);

			for (const payment of rawPayments) {
				const dateStr = payment.createdAt ? new Date(payment.createdAt).toISOString() : new Date().toISOString();
				const methodStr = (payment.method || 'cash').toUpperCase();
				entries.push({
					id: payment.id,
					date: dateStr,
					partyId,
					partyName,
					partyType: 'customer',
					type: 'payment-received',
					reference: payment.notes || `RCP-${payment.id.slice(0, 8).toUpperCase()}`,
					particulars: `Payment Receipt via ${methodStr}${payment.notes ? ' (' + payment.notes + ')' : ''}`,
					debit: 0,
					credit: Number(payment.amount || 0),
					balance: 0,
					createdAt: dateStr
				});
			}

			// Sales Returns (Cr: Sales return credit reduces debt)
			const rawReturns = await this._db
				.select({
					id: returnsTable.id,
					createdAt: returnsTable.createdAt,
					reason: returnsTable.reason,
					invoiceNumber: salesTable.invoiceNumber,
					totalAmount: sql<string>`COALESCE(SUM(CAST(${returnItemsTable.lineAmount} AS NUMERIC)), 0)`
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
				.groupBy(returnsTable.id, returnsTable.createdAt, returnsTable.reason, salesTable.invoiceNumber);

			for (const rtn of rawReturns) {
				const dateStr = rtn.createdAt ? new Date(rtn.createdAt).toISOString() : new Date().toISOString();
				entries.push({
					id: rtn.id,
					date: dateStr,
					partyId,
					partyName,
					partyType: 'customer',
					type: 'sales-return',
					reference: `RET-${rtn.id.slice(0, 8).toUpperCase()}`,
					particulars: `Sales Return - Inv #${rtn.invoiceNumber || 'Direct'} (${rtn.reason || 'Goods Return'})`,
					debit: 0,
					credit: Number(rtn.totalAmount || 0),
					balance: 0,
					createdAt: dateStr
				});
			}
		} else if (supplier) {
			const partyName = supplier.name;

			// Inward Purchases (Cr: Supplier payable increases)
			const rawPurchases = await this._db
				.select()
				.from(purchasesTable)
				.where(eq(purchasesTable.supplierId, partyId));

			for (const purchase of rawPurchases) {
				const dateStr = purchase.createdAt ? new Date(purchase.createdAt).toISOString() : new Date().toISOString();
				const ref = purchase.supplierInvoiceRef || purchase.invoiceNumber;
				entries.push({
					id: purchase.id,
					date: dateStr,
					partyId,
					partyName,
					partyType: 'supplier',
					type: 'purchase',
					reference: ref,
					particulars: `Purchase Inward Bill #${ref}`,
					debit: 0,
					credit: Number(purchase.totalAmount || 0),
					balance: 0,
					createdAt: dateStr
				});
			}

			// Payment Disbursements (Dr: Outflow payment reduces payable debt)
			const rawPayments = await this._db
				.select()
				.from(paymentsTable)
				.where(
					and(
						eq(paymentsTable.supplierId, partyId),
						eq(paymentsTable.direction, 'supplier_payment')
					)
				);

			for (const payment of rawPayments) {
				const dateStr = payment.createdAt ? new Date(payment.createdAt).toISOString() : new Date().toISOString();
				const methodStr = (payment.method || 'bank').toUpperCase();
				entries.push({
					id: payment.id,
					date: dateStr,
					partyId,
					partyName,
					partyType: 'supplier',
					type: 'payment-made',
					reference: payment.notes || `DISB-${payment.id.slice(0, 8).toUpperCase()}`,
					particulars: `Payment Made via ${methodStr}${payment.notes ? ' (' + payment.notes + ')' : ''}`,
					debit: Number(payment.amount || 0),
					credit: 0,
					balance: 0,
					createdAt: dateStr
				});
			}

			// Purchase Returns (Dr: Returned goods reduce vendor payable debt)
			const rawReturns = await this._db
				.select({
					id: returnsTable.id,
					createdAt: returnsTable.createdAt,
					reason: returnsTable.reason,
					invoiceNumber: purchasesTable.supplierInvoiceRef,
					totalAmount: sql<string>`COALESCE(SUM(CAST(${returnItemsTable.lineAmount} AS NUMERIC)), 0)`
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
				.groupBy(returnsTable.id, returnsTable.createdAt, returnsTable.reason, purchasesTable.supplierInvoiceRef);

			for (const rtn of rawReturns) {
				const dateStr = rtn.createdAt ? new Date(rtn.createdAt).toISOString() : new Date().toISOString();
				entries.push({
					id: rtn.id,
					date: dateStr,
					partyId,
					partyName,
					partyType: 'supplier',
					type: 'purchase-return',
					reference: `RET-${rtn.id.slice(0, 8).toUpperCase()}`,
					particulars: `Purchase Return - Bill #${rtn.invoiceNumber || 'Direct'} (${rtn.reason || 'Goods Return'})`,
					debit: Number(rtn.totalAmount || 0),
					credit: 0,
					balance: 0,
					createdAt: dateStr
				});
			}
		}

		// Sort in chronological order (oldest first) to compute running balance
		entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

		let runningBalance = 0;
		for (const entry of entries) {
			if (entry.partyType === 'customer') {
				// Customer: Debit increases debt (Dr), Credit reduces debt (Cr)
				runningBalance = Math.round((runningBalance + entry.debit - entry.credit) * 100) / 100;
			} else {
				// Supplier: Credit increases payable (Cr), Debit reduces payable (Dr)
				runningBalance = Math.round((runningBalance + entry.credit - entry.debit) * 100) / 100;
			}
			entry.balance = runningBalance;
		}

		return entries;
	}

	async getByDateRange(from: string, to: string): Promise<LedgerEntry[]> {
		return [];
	}

	async create(input: CreateLedgerEntryInput): Promise<LedgerEntry> {
		return {
			...input,
			id: `ledger-${Date.now()}`,
			createdAt: new Date().toISOString()
		} as LedgerEntry;
	}
}
