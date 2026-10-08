import { describe, it, expect } from 'vitest';
import { createPaymentService } from './paymentService.js';
import { createLedgerService } from './ledgerService.js';
import type { PaymentRepository } from '$lib/repositories/paymentRepository.js';
import type { LedgerRepository } from '$lib/repositories/ledgerRepository.js';
import type { Sale, Purchase, LedgerEntry } from '$lib/types/index.js';

function makeSale(overrides: Partial<Sale> = {}): Sale {
	return {
		id: 'sale-1',
		invoiceNumber: 'INV-1001',
		date: '2026-03-01',
		customerId: 'cust-city-hospital',
		customerName: 'City Hospital Pharmacy',
		items: [],
		subtotal: 10000,
		discountTotal: 0,
		taxableTotal: 10000,
		gstTotal: 0,
		roundOff: 0,
		grandTotal: 10000,
		paidAmount: 0,
		dueAmount: 10000,
		paymentMethod: 'credit',
		status: 'confirmed',
		paymentStatus: 'credit',
		createdBy: 'tester',
		createdAt: new Date('2026-03-01T10:00:00Z').toISOString(),
		updatedAt: new Date('2026-03-01T10:00:00Z').toISOString(),
		...overrides
	};
}

function makePurchase(overrides: Partial<Purchase> = {}): Purchase {
	return {
		id: 'pur-1',
		invoiceNumber: 'PINV-5001',
		invoiceDate: '2026-03-01',
		supplierId: 'sup-apollo',
		supplierName: 'Apollo Pharma Distributors',
		items: [],
		subtotal: 15000,
		discountTotal: 0,
		taxableTotal: 15000,
		gstTotal: 0,
		roundOff: 0,
		grandTotal: 15000,
		paidAmount: 0,
		dueAmount: 15000,
		status: 'confirmed',
		paymentStatus: 'credit',
		paymentMethod: 'credit',
		createdBy: 'tester',
		createdAt: new Date('2026-03-01T10:00:00Z').toISOString(),
		updatedAt: new Date('2026-03-01T10:00:00Z').toISOString(),
		...overrides
	};
}

describe('Phase 4: Khata Ledger Running Balances & FIFO Settlement', () => {
	it('should verify customer wholesale sale of ₹10,000 on credit, ledger balance of ₹10,000 Dr, and UPI receipt of ₹4,000 reducing to ₹6,000 Dr (Exit Criteria)', async () => {
		// Mock Customer State
		let customerBalance = 0;
		const salesStore: Sale[] = [];

		const customerService = {
			getCustomer: async () => ({
				id: 'cust-city-hospital',
				name: 'City Hospital Pharmacy',
				outstandingBalance: customerBalance
			}),
			updateCustomerBalance: async (_id: string, bal: number) => {
				customerBalance = bal;
			}
		};

		// 1. Initial Wholesale Sale of ₹10,000 on credit
		const sale1 = makeSale({
			id: 'sale-ch-101',
			invoiceNumber: 'INV-CH-1001',
			grandTotal: 10000,
			paidAmount: 0,
			dueAmount: 10000,
			paymentStatus: 'credit'
		});
		salesStore.push(sale1);
		customerBalance = 10000;

		const saleService = {
			getSalesByCustomer: async () => salesStore,
			updateSalePaymentDetails: async (
				id: string,
				paidAmount: number,
				dueAmount: number,
				paymentStatus: string
			) => {
				const s = salesStore.find((x) => x.id === id);
				if (s) {
					s.paidAmount = paidAmount;
					s.dueAmount = dueAmount;
					s.paymentStatus = paymentStatus as any;
				}
				return s!;
			}
		};

		// Mock payment repo
		const paymentRecords: any[] = [];
		const paymentRepo = {
			create: async (input: any) => {
				const rec = { ...input, id: 'pay-001', createdAt: new Date('2026-03-02T12:00:00Z').toISOString() };
				paymentRecords.push(rec);
				return rec;
			}
		} as unknown as PaymentRepository;

		const paymentSvc = createPaymentService(
			paymentRepo,
			customerService as never,
			undefined,
			saleService as never
		);

		// Customer balance immediately after sale: ₹10,000 Dr
		const custAfterSale = await customerService.getCustomer();
		expect(custAfterSale.outstandingBalance).toBe(10000);

		// 2. Record Payment Receipt of ₹4,000 via UPI
		const receipt = await paymentSvc.createPayment({
			type: 'received',
			partyId: 'cust-city-hospital',
			partyType: 'customer',
			amount: 4000,
			paymentMethod: 'upi',
			reference: 'UPI/REF/99281729',
			date: '2026-03-02',
			notes: 'Partial payment received',
			createdBy: 'user-001'
		});

		expect(receipt.amount).toBe(4000);

		// Customer balance immediately reflects ₹6,000 Dr
		const custAfterReceipt = await customerService.getCustomer();
		expect(custAfterReceipt.outstandingBalance).toBe(6000);

		// FIFO settlement: sales invoice updated
		expect(sale1.paidAmount).toBe(4000);
		expect(sale1.dueAmount).toBe(6000);
		expect(sale1.paymentStatus).toBe('partial');

		// 3. Verify Ledger Repository running balance calculation rules
		// Customer: Debit (Dr) = Sale Invoices. Credit (Cr) = Payment Receipts + Sales Returns.
		// Running Balance = Previous Balance + Debit - Credit.
		const ledgerEntries: LedgerEntry[] = [
			{
				id: sale1.id,
				partyId: 'cust-city-hospital',
				partyName: 'City Hospital Pharmacy',
				partyType: 'customer',
				type: 'sale',
				reference: sale1.invoiceNumber,
				particulars: 'Wholesale Medicine Sale',
				date: sale1.date,
				debit: 10000,
				credit: 0,
				balance: 10000,
				createdAt: sale1.date
			},
			{
				id: receipt.id,
				partyId: 'cust-city-hospital',
				partyName: 'City Hospital Pharmacy',
				partyType: 'customer',
				type: 'payment-received',
				reference: 'PAY-001',
				particulars: 'UPI / UTR: UPI/REF/99281729',
				date: '2026-03-02',
				debit: 0,
				credit: 4000,
				balance: 6000,
				createdAt: '2026-03-02'
			}
		];

		const ledgerRepo = {
			getByPartyId: async () => ledgerEntries
		} as unknown as LedgerRepository;

		const ledgerSvc = createLedgerService(ledgerRepo);
		const ledger = await ledgerSvc.getLedgerByParty('cust-city-hospital');

		expect(ledger.length).toBe(2);
		expect(ledger[0].debit).toBe(10000);
		expect(ledger[0].credit).toBe(0);
		expect(ledger[0].balance).toBe(10000); // 10,000 Dr

		expect(ledger[1].debit).toBe(0);
		expect(ledger[1].credit).toBe(4000);
		expect(ledger[1].balance).toBe(6000); // 6,000 Dr
	});

	it('should verify supplier purchases (Credit Cr) and disbursements (Debit Dr) with FIFO settlement', async () => {
		let supplierBalance = 0;
		const purchaseStore: Purchase[] = [];

		const supplierService = {
			getSupplier: async () => ({
				id: 'sup-apollo',
				name: 'Apollo Pharma Distributors',
				outstandingBalance: supplierBalance
			}),
			updateSupplierBalance: async (_id: string, bal: number) => {
				supplierBalance = bal;
			}
		};

		// 1. Credit Purchase of ₹15,000
		const pur1 = makePurchase({
			id: 'pur-1',
			invoiceNumber: 'PINV-5001',
			grandTotal: 15000,
			paidAmount: 0,
			dueAmount: 15000
		});
		purchaseStore.push(pur1);
		supplierBalance = 15000;

		const purchaseService = {
			getPurchasesBySupplier: async () => purchaseStore,
			updatePurchasePaymentDetails: async (
				id: string,
				paidAmount: number,
				dueAmount: number,
				paymentStatus: string
			) => {
				const p = purchaseStore.find((x) => x.id === id);
				if (p) {
					p.paidAmount = paidAmount;
					p.dueAmount = dueAmount;
					p.paymentStatus = paymentStatus as any;
				}
				return p!;
			}
		};

		const paymentRepo = {
			create: async (input: any) => ({ ...input, id: 'pay-sup-1' })
		} as unknown as PaymentRepository;

		const paymentSvc = createPaymentService(
			paymentRepo,
			undefined,
			supplierService as never,
			undefined,
			purchaseService as never
		);

		// Initial supplier balance: ₹15,000 payable (Cr)
		expect((await supplierService.getSupplier()).outstandingBalance).toBe(15000);

		// 2. Disburse ₹10,000 via Bank Transfer
		await paymentSvc.createPayment({
			type: 'made',
			partyId: 'sup-apollo',
			partyType: 'supplier',
			amount: 10000,
			paymentMethod: 'bank',
			reference: 'NEFT/0019284',
			date: '2026-03-05',
			createdBy: 'user-001'
		});

		// Supplier balance reduces to ₹5,000 payable (Cr)
		expect((await supplierService.getSupplier()).outstandingBalance).toBe(5000);

		// FIFO settlement against purchase bill
		expect(pur1.paidAmount).toBe(10000);
		expect(pur1.dueAmount).toBe(5000);
		expect(pur1.paymentStatus).toBe('partial');
	});

	it('should settle a lump-sum payment across multiple unpaid customer invoices in FIFO order', async () => {
		const salesStore: Sale[] = [
			makeSale({
				id: 'sale-1',
				invoiceNumber: 'INV-1',
				date: '2026-01-10',
				grandTotal: 3000,
				paidAmount: 0,
				dueAmount: 3000
			}),
			makeSale({
				id: 'sale-2',
				invoiceNumber: 'INV-2',
				date: '2026-01-20',
				grandTotal: 4000,
				paidAmount: 0,
				dueAmount: 4000
			}),
			makeSale({
				id: 'sale-3',
				invoiceNumber: 'INV-3',
				date: '2026-01-30',
				grandTotal: 5000,
				paidAmount: 0,
				dueAmount: 5000
			})
		];

		let customerBalance = 12000;
		const customerService = {
			getCustomer: async () => ({
				id: 'cust-1',
				name: 'Test Pharmacy',
				outstandingBalance: customerBalance
			}),
			updateCustomerBalance: async (_id: string, bal: number) => {
				customerBalance = bal;
			}
		};

		const saleService = {
			getSalesByCustomer: async () => salesStore,
			updateSalePaymentDetails: async (
				id: string,
				paidAmount: number,
				dueAmount: number,
				paymentStatus: string
			) => {
				const s = salesStore.find((x) => x.id === id);
				if (s) {
					s.paidAmount = paidAmount;
					s.dueAmount = dueAmount;
					s.paymentStatus = paymentStatus as any;
				}
				return s!;
			}
		};

		const paymentRepo = {
			create: async (input: any) => ({ ...input, id: 'pay-lump' })
		} as unknown as PaymentRepository;

		const paymentSvc = createPaymentService(
			paymentRepo,
			customerService as never,
			undefined,
			saleService as never
		);

		// Record lump-sum receipt of ₹5,000 against ₹12,000 debt
		await paymentSvc.createPayment({
			type: 'received',
			partyId: 'cust-1',
			partyType: 'customer',
			amount: 5000,
			paymentMethod: 'bank',
			date: '2026-02-01',
			createdBy: 'user-001'
		});

		// Total balance reduces to 12000 - 5000 = 7000
		expect(customerBalance).toBe(7000);

		// FIFO settlement:
		// Invoice 1 (₹3,000): fully paid
		expect(salesStore[0].paidAmount).toBe(3000);
		expect(salesStore[0].dueAmount).toBe(0);
		expect(salesStore[0].paymentStatus).toBe('paid');

		// Invoice 2 (₹4,000): remaining ₹2,000 applied -> partially paid
		expect(salesStore[1].paidAmount).toBe(2000);
		expect(salesStore[1].dueAmount).toBe(2000);
		expect(salesStore[1].paymentStatus).toBe('partial');

		// Invoice 3 (₹5,000): untouched
		expect(salesStore[2].paidAmount).toBe(0);
		expect(salesStore[2].dueAmount).toBe(5000);
		expect(salesStore[2].paymentStatus).toBe('credit');
	});
});
