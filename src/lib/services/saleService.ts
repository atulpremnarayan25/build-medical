import type { SaleRepository } from '$lib/repositories/saleRepository.js';
import type { Sale, CreateSaleInput, PaymentStatus } from '$lib/types/index.js';
import type { createCustomerService } from './customerService.js';
import type { createBatchService } from './batchService.js';

export function createSaleService(
	repo: SaleRepository,
	internalCustomerService?: ReturnType<typeof createCustomerService>,
	internalBatchService?: ReturnType<typeof createBatchService>
) {
	return {
		async getSales(): Promise<Sale[]> {
			return repo.getAll();
		},

		async getSale(id: string): Promise<Sale | null> {
			return repo.getById(id);
		},

		async createSale(input: CreateSaleInput): Promise<Sale> {
			const sale = await repo.create(input);

			// Phase 2: Update customer outstanding balance
			if (internalCustomerService && input.customerId && input.customerId !== 'walk-in') {
				const customer = await internalCustomerService.getCustomer(input.customerId);
				if (customer && sale.dueAmount > 0) {
					await internalCustomerService.updateCustomerBalance(
						customer.id,
						(customer.outstandingBalance || 0) + sale.dueAmount
					);
				}
			}

			// Phase 2: Decrement batch stock quantity
			if (internalBatchService) {
				for (const item of input.items) {
					if (item.batchId) {
						const batch = await internalBatchService.getBatch(item.batchId);
						if (batch) {
							await internalBatchService.updateBatch(batch.id, {
								quantity: batch.quantity - item.quantity
							});
						}
					}
				}
			}

			return sale;
		},

		async updateSale(id: string, input: Partial<CreateSaleInput>): Promise<Sale> {
			return repo.update(id, input as unknown as Partial<Sale>);
		},

		async cancelSale(id: string): Promise<Sale> {
			return repo.updateStatus(id, 'cancelled');
		},

		async updateSalePaymentDetails(
			id: string,
			paidAmount: number,
			dueAmount: number,
			paymentStatus: PaymentStatus
		): Promise<Sale> {
			return repo.updatePaymentDetails(id, paidAmount, dueAmount, paymentStatus);
		},

		async getSalesByCustomer(customerId: string): Promise<Sale[]> {
			return repo.getByCustomerId(customerId);
		},

		async getSalesByDateRange(from: string, to: string): Promise<Sale[]> {
			return repo.getByDateRange(from, to);
		},

		async getDashboardSummary(): Promise<{
			todaySalesCount: number;
			todaySalesTotal: number;
			todayItemsSold: number;
			totalReceivables: number;
		}> {
			const today = new Date().toISOString().split('T')[0];
			const allSales = await repo.getAll();
			const todaySales = allSales.filter((s) => s.date.startsWith(today));

			const todayItemsSold = todaySales.reduce((total, sale) => {
				return total + sale.items.reduce((sum, item) => sum + item.quantity, 0);
			}, 0);

			const totalReceivables = allSales.reduce((sum, s) => sum + s.dueAmount, 0);

			return {
				todaySalesCount: todaySales.length,
				todaySalesTotal: todaySales.reduce((sum, s) => sum + s.grandTotal, 0),
				todayItemsSold,
				totalReceivables
			};
		}
	};
}
