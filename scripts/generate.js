import fs from 'fs';
import path from 'path';

const salesOutput = path.resolve('src/lib/mock/data/sales.ts');
const purchasesOutput = path.resolve('src/lib/mock/data/purchases.ts');

export function _generateSales() {
	let sales = [];
	const baseDate = new Date();

	for (let i = 1; i <= 50; i++) {
		const date = new Date(baseDate.getTime() - Math.floor(Math.random() * 30) * 86400000); // within last 30 days
		const id = `sale-${String(i).padStart(3, '0')}`;
		const invoiceNumber = `INV/2026/${String(i).padStart(3, '0')}`;

		let subtotal = 0;
		let discountTotal = 0;
		let gstTotal = 0;
		let totalItems = Math.floor(Math.random() * 3) + 1; // 1 to 3 items
		let items = [];

		for (let j = 1; j <= totalItems; j++) {
			const qty = Math.floor(Math.random() * 20) + 1;
			const rate = 10 + Math.floor(Math.random() * 100);
			const discount = Math.random() > 0.8 ? 5 : 0; // 5% some times
			const gstRate = 12;
			const taxable = qty * rate * (1 - discount / 100);
			const gst = taxable * (gstRate / 100);
			const total = taxable + gst;

			subtotal += qty * rate;
			discountTotal += qty * rate * (discount / 100);
			gstTotal += gst;

			items.push({
				id: `sitem-${i}-${j}`,
				productId: `prod-00${Math.floor(Math.random() * 9) + 1}`,
				productName: `Product ${i} Generic`, // Real-world enough for mock logic
				batchId: `batch-00${Math.floor(Math.random() * 9) + 1}`,
				batchNumber: `BN2024A00${j}`,
				expiryDate: '2026-12-31',
				quantity: qty,
				mrp: rate * 1.5,
				rate: rate,
				discount: discount,
				taxableAmount: taxable,
				gstRate: gstRate,
				gstAmount: gst,
				totalAmount: total
			});
		}

		const taxableTotal = subtotal - discountTotal;
		const grandTotalRaw = taxableTotal + gstTotal;
		const grandTotal = Math.round(grandTotalRaw);
		const roundOff = grandTotal - grandTotalRaw;

		const status = 'confirmed';
		const isPaid = Math.random() > 0.3; // 70% paid
		const paymentStatus = isPaid ? 'paid' : Math.random() > 0.5 ? 'partial' : 'unpaid';
		const paidAmount =
			paymentStatus === 'paid' ? grandTotal : paymentStatus === 'partial' ? grandTotal / 2 : 0;
		const dueAmount = grandTotal - paidAmount;

		sales.push({
			id,
			invoiceNumber,
			date: date.toISOString().split('T')[0],
			customerId: `cust-00${Math.floor(Math.random() * 9) + 1}`,
			customerName: `Customer Pharmacy ${i}`,
			items,
			subtotal,
			discountTotal,
			taxableTotal,
			gstTotal,
			roundOff,
			grandTotal,
			paidAmount,
			dueAmount,
			paymentMethod: 'bank',
			status,
			paymentStatus,
			createdBy: 'user-001',
			createdAt: date.toISOString(),
			updatedAt: date.toISOString()
		});
	}

	// Sort array by date desc so the recent are on top
	sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	const content = `import type { Sale } from '$lib/types/sale.js';\n\nexport const mockSales: Sale[] = ${JSON.stringify(sales, null, 4)};\n`;
	fs.writeFileSync(salesOutput, content);
}

export function _generatePurchases() {
	let purchases = [];
	const baseDate = new Date();

	for (let i = 1; i <= 30; i++) {
		const date = new Date(baseDate.getTime() - Math.floor(Math.random() * 30) * 86400000);
		const id = `purch-${String(i).padStart(3, '0')}`;
		const invoiceNumber = `SUP-${String(i).padStart(3, '0')}/26`;

		let subtotal = 0;
		let discountTotal = 0;
		let gstTotal = 0;
		let totalItems = Math.floor(Math.random() * 4) + 1;
		let items = [];

		for (let j = 1; j <= totalItems; j++) {
			const qty = Math.floor(Math.random() * 100) + 10;
			const rate = 5 + Math.floor(Math.random() * 50);
			const discount = Math.random() > 0.7 ? 10 : 0;
			const gstRate = 12;
			const taxable = qty * rate * (1 - discount / 100);
			const gst = taxable * (gstRate / 100);
			const total = taxable + gst;

			subtotal += qty * rate;
			discountTotal += qty * rate * (discount / 100);
			gstTotal += gst;

			items.push({
				id: `pitem-${i}-${j}`,
				productId: `prod-00${Math.floor(Math.random() * 9) + 1}`,
				productName: `Purchase Product ${j}`,
				batchNumber: `PN2024A00${j}`,
				expiryDate: '2026-12-31',
				quantity: qty,
				freeQuantity: Math.floor(qty * 0.1),
				mrp: rate * 1.5,
				purchaseRate: rate,
				discount: discount,
				taxableAmount: taxable,
				gstRate: gstRate,
				gstAmount: gst,
				totalAmount: total
			});
		}

		const taxableTotal = subtotal - discountTotal;
		const grandTotalRaw = taxableTotal + gstTotal;
		const grandTotal = Math.round(grandTotalRaw);
		const roundOff = grandTotal - grandTotalRaw;

		const status = 'confirmed';
		const isPaid = Math.random() > 0.5;
		const paymentStatus = isPaid ? 'paid' : Math.random() > 0.5 ? 'partial' : 'unpaid';
		const paidAmount =
			paymentStatus === 'paid' ? grandTotal : paymentStatus === 'partial' ? grandTotal / 2 : 0;
		const dueAmount = grandTotal - paidAmount;

		purchases.push({
			id,
			invoiceNumber,
			invoiceDate: date.toISOString().split('T')[0],
			supplierId: `sup-00${Math.floor(Math.random() * 9) + 1}`,
			supplierName: `Distributor ${i}`,
			items,
			subtotal,
			discountTotal,
			taxableTotal,
			gstTotal,
			roundOff,
			grandTotal,
			paidAmount,
			dueAmount,
			paymentMethod: 'bank',
			status,
			paymentStatus,
			createdBy: 'user-001',
			createdAt: date.toISOString(),
			updatedAt: date.toISOString()
		});
	}

	// Sort array by date desc so the recent are on top
	purchases.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());

	const content = `import type { Purchase } from '$lib/types/purchase.js';\n\nexport const mockPurchases: Purchase[] = ${JSON.stringify(purchases, null, 4)};\n`;
	fs.writeFileSync(purchasesOutput, content);
}

import { mockSales } from '../src/lib/mock/data/sales.js';
import { mockPurchases } from '../src/lib/mock/data/purchases.js';
import { mockCustomers } from '../src/lib/mock/data/customers.js';
import { mockSuppliers } from '../src/lib/mock/data/suppliers.js';

const paymentsOutput = path.resolve('src/lib/mock/data/payments.ts');
const ledgerOutput = path.resolve('src/lib/mock/data/ledger.ts');

function generatePaymentsAndLedgers() {
	let payments = [];
	let ledgers = [];

	let pId = 1;
	let lId = 1;

	// Process Sales (Invoices AND Payments)
	for (const sale of mockSales) {
		const customer = mockCustomers.find((c) => c.id === sale.customerId);
		const currentBal = customer ? customer.outstandingBalance : 0; // rough mock

		// Ledger for Sale
		ledgers.push({
			id: `ledg-${String(lId++).padStart(4, '0')}`,
			date: sale.date,
			partyId: sale.customerId,
			partyName: sale.customerName,
			partyType: 'customer',
			type: 'sale',
			reference: sale.id,
			particulars: `Sales Invoice ${sale.invoiceNumber}`,
			debit: sale.grandTotal,
			credit: 0,
			balance: currentBal + sale.dueAmount, // Mock approx
			createdAt: sale.createdAt
		});

		if (sale.paidAmount > 0) {
			const payment = {
				id: `pay-${String(pId++).padStart(3, '0')}`,
				type: 'received',
				partyId: sale.customerId,
				partyName: sale.customerName,
				partyType: 'customer',
				invoiceId: sale.id,
				invoiceNumber: sale.invoiceNumber,
				amount: sale.paidAmount,
				paymentMethod: 'bank',
				reference: `REF-${Math.floor(Math.random() * 100000)}`,
				date: sale.date,
				notes: `Payment for ${sale.invoiceNumber}`,
				createdBy: 'user-001',
				createdAt: sale.createdAt
			};
			payments.push(payment);

			// Add ledger for the payment
			ledgers.push({
				id: `ledg-${String(lId++).padStart(4, '0')}`,
				date: sale.date,
				partyId: sale.customerId,
				partyName: sale.customerName,
				partyType: 'customer',
				type: 'payment-received',
				reference: payment.id,
				particulars: `Payment Received against ${sale.invoiceNumber}`,
				debit: 0,
				credit: sale.paidAmount,
				balance: currentBal,
				createdAt: sale.createdAt
			});
		}
	}

	// Process Purchases (Invoices AND payments)
	for (const purch of mockPurchases) {
		const supplier = mockSuppliers.find((s) => s.id === purch.supplierId);
		const currentBal = supplier ? supplier.outstandingBalance : 0;
		// Ledger for Purchase
		ledgers.push({
			id: `ledg-${String(lId++).padStart(4, '0')}`,
			date: purch.invoiceDate,
			partyId: purch.supplierId,
			partyName: purch.supplierName,
			partyType: 'supplier',
			type: 'purchase',
			reference: purch.id,
			particulars: `Purchase Invoice ${purch.invoiceNumber}`,
			debit: 0,
			credit: purch.grandTotal,
			balance: currentBal + purch.dueAmount, // approximate mock
			createdAt: purch.createdAt
		});

		if (purch.paidAmount > 0) {
			const payment = {
				id: `pay-${String(pId++).padStart(3, '0')}`,
				type: 'made',
				partyId: purch.supplierId,
				partyName: purch.supplierName,
				partyType: 'supplier',
				invoiceId: purch.id,
				invoiceNumber: purch.invoiceNumber,
				amount: purch.paidAmount,
				paymentMethod: 'bank',
				reference: `TXN-${Math.floor(Math.random() * 100000)}`,
				date: purch.invoiceDate,
				notes: `Payment for ${purch.invoiceNumber}`,
				createdBy: 'user-001',
				createdAt: purch.createdAt
			};
			payments.push(payment);

			ledgers.push({
				id: `ledg-${String(lId++).padStart(4, '0')}`,
				date: purch.invoiceDate,
				partyId: purch.supplierId,
				partyName: purch.supplierName,
				partyType: 'supplier',
				type: 'payment-made',
				reference: payment.id,
				particulars: `Payment Made against ${purch.invoiceNumber}`,
				debit: purch.paidAmount,
				credit: 0,
				balance: currentBal,
				createdAt: purch.createdAt
			});
		}
	}

	payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
	ledgers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	const pContent = `import type { Payment } from '$lib/types/payment.js';\n\nexport const mockPayments: Payment[] = ${JSON.stringify(payments, null, 4)};\n`;
	fs.writeFileSync(paymentsOutput, pContent);

	const lContent = `import type { LedgerEntry } from '$lib/types/ledger.js';\n\nexport const mockLedgerEntries: LedgerEntry[] = ${JSON.stringify(ledgers, null, 4)};\n`;
	fs.writeFileSync(ledgerOutput, lContent);
}

generatePaymentsAndLedgers();
