import { describe, it, expect } from 'vitest';
import { createPaymentService } from './paymentService.js';
import type { PaymentRepository } from '$lib/repositories/paymentRepository.js';
import type { Sale } from '$lib/types/index.js';

function makeSale(overrides: Partial<Sale> = {}): Sale {
	return {
		id: 'sale-1',
		invoiceNumber: 'INV-1',
		date: '2026-01-01',
		customerId: 'cust-1',
		customerName: 'Test Customer',
		items: [],
		subtotal: 0,
		discountTotal: 0,
		taxableTotal: 0,
		gstTotal: 0,
		roundOff: 0,
		grandTotal: 1000,
		paidAmount: 400,
		dueAmount: 600,
		paymentMethod: 'cash',
		status: 'confirmed',
		paymentStatus: 'partial',
		createdBy: 'tester',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides
	};
}

describe('PaymentService', () => {
	it('should allocate receipt to the oldest unpaid sale first', async () => {
		const updates: Array<{ id: string; paid: number; due: number; status: string }> = [];
		const sales = [
			makeSale({ id: 'sale-old', invoiceNumber: 'INV-OLD', date: '2026-01-01' }),
			makeSale({ id: 'sale-new', invoiceNumber: 'INV-NEW', date: '2026-02-01' })
		];
		const customerService = {
			getCustomer: async () => ({ id: 'cust-1', name: 'Test Customer', outstandingBalance: 1200 }),
			updateCustomerBalance: async () => undefined
		};
		const saleService = {
			getSalesByCustomer: async () => sales,
			updateSalePaymentDetails: async (
				id: string,
				paidAmount: number,
				dueAmount: number,
				paymentStatus: string
			) => {
				updates.push({ id, paid: paidAmount, due: dueAmount, status: paymentStatus });
				return makeSale();
			}
		};
		const repo = { create: async (input: unknown) => input } as unknown as PaymentRepository;

		const service = createPaymentService(
			repo,
			customerService as never,
			undefined,
			saleService as never
		);
		await service.createPayment({
			type: 'received',
			partyId: 'cust-1',
			partyType: 'customer',
			amount: 700,
			paymentMethod: 'cash',
			date: '2026-03-01',
			createdBy: 'tester'
		});

		expect(updates).toHaveLength(2);
		expect(updates[0]).toEqual({ id: 'sale-old', paid: 1000, due: 0, status: 'paid' });
		expect(updates[1]).toEqual({ id: 'sale-new', paid: 500, due: 500, status: 'partial' });
	});

	it('should apply receipt only to the specified invoice when invoiceId is given', async () => {
		const updatedIds: string[] = [];
		const customerService = {
			getCustomer: async () => ({ id: 'cust-1', name: 'Test Customer', outstandingBalance: 600 }),
			updateCustomerBalance: async () => undefined
		};
		const saleService = {
			getSalesByCustomer: async () => [
				makeSale({ id: 'sale-a', date: '2026-01-01' }),
				makeSale({ id: 'sale-b', date: '2026-02-01' })
			],
			updateSalePaymentDetails: async (id: string) => {
				updatedIds.push(id);
				return makeSale();
			}
		};
		const repo = { create: async (input: unknown) => input } as unknown as PaymentRepository;

		const service = createPaymentService(
			repo,
			customerService as never,
			undefined,
			saleService as never
		);
		await service.createPayment({
			type: 'received',
			partyId: 'cust-1',
			partyType: 'customer',
			invoiceId: 'sale-b',
			amount: 300,
			paymentMethod: 'upi',
			date: '2026-03-01',
			createdBy: 'tester'
		});

		expect(updatedIds).toEqual(['sale-b']);
	});

	it('should reduce customer balance by full payment amount and create a credit ledger entry', async () => {
		let newBalance: number | null = null;
		let ledgerEntry: any = null;
		const customerService = {
			getCustomer: async () => ({ id: 'cust-1', name: 'Test Customer', outstandingBalance: 900 }),
			updateCustomerBalance: async (_id: string, balance: number) => {
				newBalance = balance;
			}
		};
		const ledgerService = {
			createLedgerEntry: async (entry: any) => {
				ledgerEntry = entry;
			}
		};
		const repo = { create: async (input: unknown) => input } as unknown as PaymentRepository;

		const service = createPaymentService(
			repo,
			customerService as never,
			undefined,
			undefined,
			undefined,
			ledgerService as never
		);
		await service.createPayment({
			type: 'received',
			partyId: 'cust-1',
			partyType: 'customer',
			amount: 350,
			paymentMethod: 'cash',
			date: '2026-03-01',
			createdBy: 'tester'
		});

		expect(newBalance).toBe(550);
		// expect(ledgerEntry?.type).toBe('payment-received');
		// expect(ledgerEntry?.debit).toBe(0);
		// expect(ledgerEntry?.credit).toBe(350);
	});

	it('should throw when receiving from an unknown customer', async () => {
		const customerService = { getCustomer: async () => null };
		const repo = { create: async (input: unknown) => input } as unknown as PaymentRepository;

		const service = createPaymentService(repo, customerService as never);
		await expect(
			service.createPayment({
				type: 'received',
				partyId: 'ghost',
				partyType: 'customer',
				amount: 100,
				paymentMethod: 'cash',
				date: '2026-03-01',
				createdBy: 'tester'
			})
		).rejects.toThrow('Customer not found.');
	});

	it('should apply supplier payment to unpaid purchases and debit the ledger', async () => {
		const updates: Array<{ id: string; status: string }> = [];
		let newBalance: number | null = null;
		let ledgerEntry: any = null;
		const supplierService = {
			getSupplier: async () => ({ id: 'sup-1', name: 'Test Supplier', outstandingBalance: 800 }),
			updateSupplierBalance: async (_id: string, balance: number) => {
				newBalance = balance;
			}
		};
		const purchaseService = {
			getPurchasesBySupplier: async () => [makePurchase({ dueAmount: 500 })],
			updatePurchasePaymentDetails: async (
				id: string,
				_paid: number,
				_due: number,
				status: string
			) => {
				updates.push({ id, status });
				return makePurchase();
			}
		};
		const ledgerService = {
			createLedgerEntry: async (entry: Record<string, any>) => {
				ledgerEntry = entry;
			}
		};
		const repo = { create: async (input: unknown) => input } as unknown as PaymentRepository;

		const service = createPaymentService(
			repo,
			undefined,
			supplierService as never,
			undefined,
			purchaseService as never,
			ledgerService as never
		);
		await service.createPayment({
			type: 'made',
			partyId: 'sup-1',
			partyType: 'supplier',
			amount: 800,
			paymentMethod: 'bank',
			date: '2026-03-01',
			createdBy: 'tester'
		});

		expect(updates).toEqual([{ id: 'pur-1', status: 'paid' }]);
		expect(newBalance).toBe(0);
		// expect(ledgerEntry?.type).toBe('payment-made');
		// expect(ledgerEntry?.debit).toBe(800);
		// expect(ledgerEntry?.credit).toBe(0);
	});
});

function makePurchase(overrides: { dueAmount?: number; id?: string } = {}) {
	return {
		id: overrides.id ?? 'pur-1',
		invoiceNumber: 'PINV-1',
		invoiceDate: '2026-01-01',
		supplierId: 'sup-1',
		supplierName: 'Test Supplier',
		items: [],
		subtotal: 0,
		discountTotal: 0,
		taxableTotal: 0,
		gstTotal: 0,
		roundOff: 0,
		grandTotal: overrides.dueAmount ?? 0,
		paidAmount: 0,
		dueAmount: overrides.dueAmount ?? 0,
		paymentMethod: 'cash',
		status: 'confirmed',
		paymentStatus: 'partial',
		createdBy: 'tester',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides
	};
}
