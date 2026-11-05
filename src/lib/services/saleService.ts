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

		async getPaginatedSales(opts: {
			page?: number;
			limit?: number;
			customerId?: string;
			status?: string;
			search?: string;
			storeId?: string;
		}) {
			if (repo.getPaginated) {
				return repo.getPaginated(opts);
			}
			const all = opts.customerId
				? await repo.getByCustomerId(opts.customerId)
				: await repo.getAll();
			let filtered = all;
			if (opts.status) {
				filtered = filtered.filter((s) => s.status === opts.status);
			}
			if (opts.search) {
				const q = opts.search.toLowerCase();
				filtered = filtered.filter(
					(s) =>
						s.invoiceNumber.toLowerCase().includes(q) ||
						(s.customerName && s.customerName.toLowerCase().includes(q))
				);
			}
			const page = Math.max(1, opts.page || 1);
			const limit = Math.max(1, Math.min(100, opts.limit || 50));
			const total = filtered.length;
			const totalPages = Math.ceil(total / limit) || 1;
			const items = filtered.slice((page - 1) * limit, page * limit);
			return { items, total, page, limit, totalPages };
		},

		async getDashboardSummary(storeId?: string): Promise<{
			todaySalesCount: number;
			todaySalesTotal: number;
			todayItemsSold: number;
			totalReceivables: number;
		}> {
			if (repo.getDashboardSummary) {
				return repo.getDashboardSummary(storeId);
			}
			const today = new Date().toISOString().split('T')[0];
			const allSales = await repo.getAll();
			const activeSales = allSales.filter((s) => s.status !== 'cancelled');
			const todaySales = activeSales.filter((s) => s.date.startsWith(today));

			const todayItemsSold = todaySales.reduce((total, sale) => {
				return total + sale.items.reduce((sum, item) => sum + item.quantity, 0);
			}, 0);

			const totalReceivables = activeSales.reduce((sum, s) => sum + s.dueAmount, 0);

			return {
				todaySalesCount: todaySales.length,
				todaySalesTotal: todaySales.reduce((sum, s) => sum + s.grandTotal, 0),
				todayItemsSold,
				totalReceivables
			};
		}
	};
}
