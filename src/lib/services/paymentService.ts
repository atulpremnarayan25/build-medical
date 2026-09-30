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
			// Save the payment
			const payment = await repo.create(input);

			let remainingAmountToApply = input.amount;

			// Handle Receipt from Customer
			if (input.type === 'received' && input.partyType === 'customer' && internalCustomerService) {
				const customer = await internalCustomerService.getCustomer(input.partyId);
				if (!customer) throw new Error('Customer not found.');

				payment.partyName = customer.name;

				if (remainingAmountToApply > customer.outstandingBalance) {
					// We'll allow it technically as advance, but update logic accordingly
				}

				// Apply to sales
				if (internalSaleService) {
					// Either one specific sale or apply sequentially
					let unpaidSales = await internalSaleService.getSalesByCustomer(input.partyId);
					unpaidSales = unpaidSales
						.filter((s) => s.dueAmount > 0)
						.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

					if (input.invoiceId) {
						// Filter to exactly this one
						unpaidSales = unpaidSales.filter((s) => s.id === input.invoiceId);
					}

					for (const sale of unpaidSales) {
						if (remainingAmountToApply <= 0) break;

						const appliedAmount = Math.min(remainingAmountToApply, sale.dueAmount);
						const newPaid = sale.paidAmount + appliedAmount;
						const newDue = sale.grandTotal - newPaid;
						const newStatus: PaymentStatus = newDue <= 0 ? 'paid' : 'partial';

						await internalSaleService.updateSalePaymentDetails(sale.id, newPaid, newDue, newStatus);
						remainingAmountToApply -= appliedAmount;
					}
				}

				// Update Customer Balance
				const newBalance = customer.outstandingBalance - input.amount;
				await internalCustomerService.updateCustomerBalance(customer.id, newBalance);
			}

			// Handle Payment Made to Supplier
			if (input.type === 'made' && input.partyType === 'supplier' && internalSupplierService) {
				const supplier = await internalSupplierService.getSupplier(input.partyId);
				if (!supplier) throw new Error('Supplier not found.');

				payment.partyName = supplier.name;

				// Apply to Purchases
				if (internalPurchaseService) {
					let unpaidPur = await internalPurchaseService.getPurchasesBySupplier(input.partyId);
					unpaidPur = unpaidPur
						.filter((p) => p.dueAmount > 0)
						.sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime());

					if (input.invoiceId) {
						unpaidPur = unpaidPur.filter((p) => p.id === input.invoiceId);
					}

					for (const p of unpaidPur) {
						if (remainingAmountToApply <= 0) break;

						const appliedAmount = Math.min(remainingAmountToApply, p.dueAmount);
						const newPaid = p.paidAmount + appliedAmount;
						const newDue = p.grandTotal - newPaid;
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
				const newBalance = supplier.outstandingBalance - input.amount;
				await internalSupplierService.updateSupplierBalance(supplier.id, newBalance);
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
