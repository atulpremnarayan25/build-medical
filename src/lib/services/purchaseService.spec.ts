import { describe, it, expect } from 'vitest';
import { createPurchaseService } from './purchaseService.js';
import type { PurchaseRepository } from '$lib/repositories/purchaseRepository.js';
import type { Purchase, CreatePurchaseInput } from '$lib/types/index.js';

function makePurchase(overrides: Partial<Purchase> = {}): Purchase {
	return {
		id: 'pur-1',
		invoiceNumber: 'PINV-1',
		invoiceDate: new Date().toISOString().split('T')[0],
		supplierId: 'sup-1',
		supplierName: 'Test Supplier',
		items: [],
		subtotal: 0,
		discountTotal: 0,
		taxableTotal: 0,
		gstTotal: 0,
		roundOff: 0,
		grandTotal: 0,
		paidAmount: 0,
		dueAmount: 0,
		paymentMethod: 'cash',
		status: 'confirmed',
		paymentStatus: 'paid',
		createdBy: 'tester',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides
	};
}

function makeInput(overrides: Partial<CreatePurchaseInput> = {}): CreatePurchaseInput {
	return {
		invoiceNumber: 'PINV-1',
		invoiceDate: new Date().toISOString().split('T')[0],
		supplierId: 'sup-1',
		supplierName: 'Test Supplier',
		items: [],
		subtotal: 0,
		discountTotal: 0,
		taxableTotal: 0,
		gstTotal: 0,
		roundOff: 0,
		grandTotal: 0,
		paymentMethod: 'cash',
		status: 'confirmed',
		notes: undefined,
		createdBy: 'tester',
		...overrides
	};
}

describe('PurchaseService', () => {
	it('should create a new batch when product has no matching batch number', async () => {
		const createdBatches: Array<Record<string, unknown>> = [];
		const supplierService = {
			getSupplier: async () => null
		};
		const batchService = {
			getBatchesByProduct: async () => [],
			createBatch: async (input: Record<string, unknown>) => {
				createdBatches.push(input);
			}
		};
		const repo = {
			create: async () => makePurchase()
		} as unknown as PurchaseRepository;

		const service = createPurchaseService(repo, supplierService as never, batchService as never);
		await service.createPurchase(
			makeInput({
				supplierId: 'sup-9',
				items: [
					{
						productId: 'p-1',
						productName: 'Paracetamol',
						batchNumber: 'B100',
						expiryDate: '2027-06-01',
						quantity: 20,
						freeQuantity: 5,
						mrp: 50,
						purchaseRate: 40,
						discount: 0,
						gstRate: 12
					}
				]
			})
		);

		expect(createdBatches).toHaveLength(1);
		expect(createdBatches[0].quantity).toBe(25);
		expect(createdBatches[0].sellingRate).toBe(45);
		expect(createdBatches[0].supplierId).toBe('sup-9');
	});

	it('should increase existing batch quantity when same product and batch number exists', async () => {
		const updates: Record<string, Record<string, unknown>> = {};
		let created = 0;
		const supplierService = { getSupplier: async () => null };
		const batchService = {
			getBatchesByProduct: async () => [
				{ id: 'batch-1', batchNumber: 'B100', quantity: 30, purchaseRate: 38, mrp: 48 }
			],
			updateBatch: async (id: string, input: Record<string, unknown>) => {
				updates[id] = input;
			},
			createBatch: async () => {
				created += 1;
			}
		};
		const repo = {
			create: async () => makePurchase()
		} as unknown as PurchaseRepository;

		const service = createPurchaseService(repo, supplierService as never, batchService as never);
		await service.createPurchase(
			makeInput({
				items: [
					{
						productId: 'p-1',
						productName: 'Paracetamol',
						batchNumber: 'B100',
						expiryDate: '2027-06-01',
						quantity: 10,
						freeQuantity: 2,
						mrp: 50,
						purchaseRate: 40,
						discount: 0,
						gstRate: 12
					}
				]
			})
		);

		expect(created).toBe(0);
		expect(updates['batch-1'].quantity).toBe(42);
		expect(updates['batch-1'].purchaseRate).toBe(40);
		expect(updates['batch-1'].mrp).toBe(50);
	});

	it('should add due amount to supplier outstanding balance on credit purchase', async () => {
		let updatedBalance: number | null = null;
		const supplierService = {
			getSupplier: async (id: string) => (id === 'sup-1' ? { id, outstandingBalance: 1000 } : null),
			updateSupplierBalance: async (_id: string, newBalance: number) => {
				updatedBalance = newBalance;
			}
		};
		const repo = {
			create: async (input: CreatePurchaseInput) => makePurchase({ dueAmount: input.grandTotal })
		} as unknown as PurchaseRepository;

		const service = createPurchaseService(repo, supplierService as never);
		await service.createPurchase(makeInput({ grandTotal: 400 }));

		expect(updatedBalance).toBe(1400);
	});

	it('should not touch supplier balance when purchase is fully paid', async () => {
		let balanceUpdated = false;
		const supplierService = {
			getSupplier: async () => ({ id: 'sup-1', outstandingBalance: 500 }),
			updateSupplierBalance: async () => {
				balanceUpdated = true;
			}
		};
		const repo = {
			create: async () => makePurchase({ dueAmount: 0 })
		} as unknown as PurchaseRepository;

		const service = createPurchaseService(repo, supplierService as never);
		await service.createPurchase(makeInput());

		expect(balanceUpdated).toBe(false);
	});

	it('should cancel a purchase by updating its status', async () => {
		let savedStatus: string | null = null;
		const repo = {
			update: async (_id: string, input: Partial<Purchase>) => {
				savedStatus = input.status ?? null;
				return makePurchase(input);
			}
		} as unknown as PurchaseRepository;

		const service = createPurchaseService(repo);
		await service.cancelPurchase('pur-1');

		expect(savedStatus).toBe('cancelled');
	});
});
