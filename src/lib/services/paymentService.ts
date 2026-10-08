import type { PaymentRepository } from '$lib/repositories/paymentRepository.js';
import type { Payment, CreatePaymentInput, PaymentStatus } from '$lib/types/index.js';
import type { createCustomerService } from './customerService.js';
import type { createSupplierService } from './supplierService.js';
import type { createSaleService } from './saleService.js';
import type { createPurchaseService } from './purchaseService.js';
import type { createLedgerService } from './ledgerService.js';

export function createPaymentService(
	repo: PaymentRepository,
	internalCustomerService?: ReturnType<typeof createCustomerService>,
	internalSupplierService?: ReturnType<typeof createSupplierService>,
	internalSaleService?: ReturnType<typeof createSaleService>,
	internalPurchaseService?: ReturnType<typeof createPurchaseService>,
	internalLedgerService?: ReturnType<typeof createLedgerService>
) {
	return {
		async getPayments(): Promise<Payment[]> {
			return repo.getAll();
		},

		async getPayment(id: string): Promise<Payment | null> {
			return repo.getById(id);
		},

		async createPayment(input: CreatePaymentInput): Promise<Payment> {
			const isCustomer =
				input.partyType === 'customer' ||
				input.type === 'received' ||
				(input as any).type === 'in';

			const isSupplier =
				input.partyType === 'supplier' ||
				input.type === 'made' ||
				(input as any).type === 'out';

			let customer: any = null;
			if (isCustomer && internalCustomerService) {
				customer = await internalCustomerService.getCustomer(input.partyId);
				if (!customer) {
					throw new Error('Customer not found.');
				}
			}

			let supplier: any = null;
			if (isSupplier && internalSupplierService) {
				supplier = await internalSupplierService.getSupplier(input.partyId);
				if (!supplier) {
					throw new Error('Supplier not found.');
				}
			}

			// Save the payment
			const payment = await repo.create(input);

			let remainingAmountToApply = Number(input.amount || 0);

			// Handle Receipt from Customer (FIFO Settlement across unpaid invoices)
			if (isCustomer && customer) {
				payment.partyName = customer.name;

				// Apply sequentially in FIFO order (oldest unpaid invoice first)
				if (internalSaleService) {
					let unpaidSales = await internalSaleService.getSalesByCustomer(input.partyId);
					unpaidSales = unpaidSales
						.filter((s) => Number(s.dueAmount) > 0)
						.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

					if (input.invoiceId) {
						unpaidSales = unpaidSales.filter((s) => s.id === input.invoiceId);
					}

					for (const sale of unpaidSales) {
						if (remainingAmountToApply <= 0) break;

						const saleDue = Number(sale.dueAmount || 0);
						const appliedAmount = Math.min(remainingAmountToApply, saleDue);
						const newPaid = Number(sale.paidAmount || 0) + appliedAmount;
						const newDue = Math.max(0, Number(sale.grandTotal || 0) - newPaid);
						const newStatus: PaymentStatus = newDue <= 0 ? 'paid' : 'partial';

						await internalSaleService.updateSalePaymentDetails(sale.id, newPaid, newDue, newStatus);
						remainingAmountToApply -= appliedAmount;
					}
				}

				// Update Customer Balance
				const currentBal = Number(customer.outstandingBalance || 0);
				const newBalance = currentBal - Number(input.amount || 0);
				await internalCustomerService!.updateCustomerBalance(customer.id, newBalance);
			}

			// Handle Payment Made to Supplier (FIFO Settlement across unpaid bills)
			if (isSupplier && supplier) {
				payment.partyName = supplier.name;

				// Apply sequentially in FIFO order against purchase bills
				if (internalPurchaseService) {
					let unpaidPur = await internalPurchaseService.getPurchasesBySupplier(input.partyId);
					unpaidPur = unpaidPur
						.filter((p) => Number(p.dueAmount) > 0)
						.sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime());

					if (input.invoiceId) {
						unpaidPur = unpaidPur.filter((p) => p.id === input.invoiceId);
					}

					for (const p of unpaidPur) {
						if (remainingAmountToApply <= 0) break;

						const purDue = Number(p.dueAmount || 0);
						const appliedAmount = Math.min(remainingAmountToApply, purDue);
						const newPaid = Number(p.paidAmount || 0) + appliedAmount;
						const newDue = Math.max(0, Number(p.grandTotal || 0) - newPaid);
						const newStatus: PaymentStatus = newDue <= 0 ? 'paid' : 'partial';

						await internalPurchaseService.updatePurchasePaymentDetails(
							p.id,
							newPaid,
							newDue,
							newStatus
						);
						remainingAmountToApply -= appliedAmount;
					}
				}

				// Update Supplier Balance
				const currentBal = Number(supplier.outstandingBalance || 0);
				const newBalance = currentBal - Number(input.amount || 0);
				await internalSupplierService!.updateSupplierBalance(supplier.id, newBalance);
			}

			return payment;
		},

		async getPaymentsByParty(partyId: string): Promise<Payment[]> {
			return repo.getByPartyId(partyId);
		},

		async getPaymentsByDateRange(from: string, to: string): Promise<Payment[]> {
			return repo.getByDateRange(from, to);
		}
	};
}
