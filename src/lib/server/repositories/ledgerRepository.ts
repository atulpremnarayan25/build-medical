import type { LedgerRepository } from '$lib/repositories/ledgerRepository.js';
import type { LedgerEntry, CreateLedgerEntryInput } from '$lib/types/index.js';
import { salesTable, purchasesTable, paymentsTable } from '../db/schema.js';
import { eq, or } from 'drizzle-orm';

export class DbLedgerRepository implements LedgerRepository {
	private _db;

	constructor(database: any) {
		this._db = database;
	}

	async getAll(): Promise<LedgerEntry[]> {
		return [];
	}

	async getByPartyId(partyId: string): Promise<LedgerEntry[]> {
		const rawSales = await this._db
			.select()
			.from(salesTable)
			.where(eq(salesTable.customerId, partyId));
		const rawPurchases = await this._db
			.select()
			.from(purchasesTable)
			.where(eq(purchasesTable.supplierId, partyId));
		const rawPayments = await this._db
			.select()
			.from(paymentsTable)
			.where(or(eq(paymentsTable.customerId, partyId), eq(paymentsTable.supplierId, partyId)));

		const entries: LedgerEntry[] = [];

		for (const sale of rawSales) {
			entries.push({
				id: sale.id,
				date: sale.date,
				partyId: sale.customerId,
				partyName: sale.customerName,
				partyType: 'customer',
				type: 'sale',
				reference: sale.invoiceNumber,
				particulars: `Sale against invoice ${sale.invoiceNumber}`,
				debit: sale.grandTotal,
				credit: 0,
				balance: 0,
				createdAt: sale.createdAt
			});
		}

		for (const purchase of rawPurchases) {
			entries.push({
				id: purchase.id,
				date: purchase.invoiceDate,
				partyId: purchase.supplierId,
				partyName: purchase.supplierName,
				partyType: 'supplier',
				type: 'purchase',
				reference: purchase.invoiceNumber,
				particulars: `Purchase against invoice ${purchase.invoiceNumber}`,
				debit: 0,
				credit: purchase.grandTotal,
				balance: 0,
				createdAt: purchase.createdAt
			});
		}

		for (const payment of rawPayments) {
			const isCustomer = payment.partyType === 'customer';
			entries.push({
				id: payment.id,
				date: payment.date,
				partyId: payment.partyId,
				partyName: payment.partyName,
				partyType: isCustomer ? 'customer' : 'supplier',
				type: payment.type === 'received' ? 'payment-received' : 'payment-made',
				reference: payment.reference || payment.id,
				particulars: `Payment ${payment.type} via ${payment.paymentMethod}`,
				debit: isCustomer ? 0 : payment.amount,
				credit: isCustomer ? payment.amount : 0,
				balance: 0,
				createdAt: payment.createdAt
			});
		}

		entries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

		let runningBalance = 0;
		for (const entry of entries) {
			if (entry.partyType === 'customer') {
				runningBalance += entry.debit - entry.credit;
			} else {
				runningBalance += entry.credit - entry.debit;
			}
			entry.balance = runningBalance;
		}

		return entries.reverse();
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
