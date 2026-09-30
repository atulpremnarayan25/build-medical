import type { PurchaseRepository } from '$lib/repositories/purchaseRepository.js';
import type { Purchase, CreatePurchaseInput, PaymentStatus } from '$lib/types/index.js';
import type { createSupplierService } from './supplierService.js';
import type { createBatchService } from './batchService.js';

export function createPurchaseService(
	repo: PurchaseRepository,
	internalSupplierService?: ReturnType<typeof createSupplierService>,
	internalBatchService?: ReturnType<typeof createBatchService>
) {
	return {
		async getPurchases(): Promise<Purchase[]> {
			return repo.getAll();
		},

		async getPurchase(id: string): Promise<Purchase | null> {
			return repo.getById(id);
		},

		async createPurchase(input: CreatePurchaseInput): Promise<Purchase> {
			const purchase = await repo.create(input);

			// Phase 2: Update supplier outstanding balance
			if (internalSupplierService && input.supplierId) {
				const supplier = await internalSupplierService.getSupplier(input.supplierId);
				if (supplier && purchase.dueAmount > 0) {
					await internalSupplierService.updateSupplierBalance(
						supplier.id,
						(supplier.outstandingBalance || 0) + purchase.dueAmount
					);
				}
			}

			// Orchestrate batch creation/update
			if (internalBatchService) {
				for (const item of input.items) {
					// Check if batch already exists for this product + batchNumber
					const existingBatches = await internalBatchService.getBatchesByProduct(item.productId);
					const existingBatch = existingBatches.find((b) => b.batchNumber === item.batchNumber);

					if (existingBatch) {
						// Increase quantity
						await internalBatchService.updateBatch(existingBatch.id, {
							quantity: existingBatch.quantity + item.quantity + (item.freeQuantity || 0),
							purchaseRate: item.purchaseRate,
							mrp: item.mrp
						});
					} else {
						// Create new batch
						await internalBatchService.createBatch({
							productId: item.productId,
							productName: item.productName,
							batchNumber: item.batchNumber,
							expiryDate: item.expiryDate,
							quantity: item.quantity + (item.freeQuantity || 0),
							mrp: item.mrp,
							purchaseRate: item.purchaseRate,
							sellingRate: item.mrp * 0.9, // Default logic: selling rate 10% below MRP if not specified
							supplierId: input.supplierId
						});
					}
				}
			}

			return purchase;
		},

		async updatePurchase(id: string, input: Partial<CreatePurchaseInput>): Promise<Purchase> {
			return repo.update(id, input as any);
		},

		async cancelPurchase(id: string): Promise<Purchase> {
			return repo.update(id, { status: 'cancelled' } as any);
		},

		async updatePurchasePaymentDetails(
			id: string,
			paidAmount: number,
			dueAmount: number,
			paymentStatus: PaymentStatus
		): Promise<Purchase> {
			return repo.updatePaymentDetails(id, paidAmount, dueAmount, paymentStatus);
		},

		async getPurchasesBySupplier(supplierId: string): Promise<Purchase[]> {
			return repo.getBySupplierId(supplierId);
		},

		async getPurchasesByDateRange(from: string, to: string): Promise<Purchase[]> {
			return repo.getByDateRange(from, to);
		},

		async getDashboardSummary(): Promise<{
			todayPurchasesCount: number;
			todayPurchasesTotal: number;
			totalPayables: number;
		}> {
			const today = new Date().toISOString().split('T')[0];
			const allPurchases = await repo.getAll();
			const todayPurchases = allPurchases.filter((p) => p.invoiceDate.startsWith(today));

			const totalPayables = allPurchases.reduce((sum, p) => sum + p.dueAmount, 0);

			return {
				todayPurchasesCount: todayPurchases.length,
				todayPurchasesTotal: todayPurchases.reduce((sum, p) => sum + p.grandTotal, 0),
				totalPayables
			};
		}
	};
}
