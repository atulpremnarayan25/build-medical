import { describe, it, expect } from 'vitest';
import { createSaleService } from './saleService.js';
import type { SaleRepository } from '$lib/repositories/saleRepository.js';
import type { Sale, CreateSaleInput } from '$lib/types/index.js';

function makeSale(overrides: Partial<Sale> = {}): Sale {
	return {
		id: 'sale-1',
		invoiceNumber: 'INV-1',
		date: new Date().toISOString().split('T')[0],
		customerId: 'cust-1',
		customerName: 'Test Customer',
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

function makeInput(overrides: Partial<CreateSaleInput> = {}): CreateSaleInput {
	return {
		date: new Date().toISOString().split('T')[0],
		customerId: 'cust-1',
		customerName: 'Test Customer',
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

describe('SaleService', () => {
	it('should add due amount to customer outstanding balance on credit sale', async () => {
		let updatedBalance: number | null = null;
		const customerService = {
			getCustomer: async (id: string) => (id === 'cust-1' ? { id, outstandingBalance: 500 } : null),
			updateCustomerBalance: async (_id: string, newBalance: number) => {
				updatedBalance = newBalance;
			}
		};
		const repo = {
			create: async (input: CreateSaleInput) => makeSale({ dueAmount: input.grandTotal })
		} as unknown as SaleRepository;

		const service = createSaleService(repo, customerService as never);
		await service.createSale(makeInput({ grandTotal: 250 }));

		expect(updatedBalance).toBe(750);
	});

	it('should not touch customer balance for walk-in sales', async () => {
		let balanceUpdated = false;
		const customerService = {
			getCustomer: async () => ({ id: 'walk-in', outstandingBalance: 0 }),
			updateCustomerBalance: async () => {
				balanceUpdated = true;
			}
		};
		const repo = {
			create: async () => makeSale({ customerId: 'walk-in', dueAmount: 100 })
		} as unknown as SaleRepository;

		const service = createSaleService(repo, customerService as never);
		await service.createSale(makeInput({ customerId: 'walk-in' }));

		expect(balanceUpdated).toBe(false);
	});

	it('should not add to balance when sale is fully paid', async () => {
		let balanceUpdated = false;
		const customerService = {
			getCustomer: async () => ({ id: 'cust-1', outstandingBalance: 100 }),
			updateCustomerBalance: async () => {
				balanceUpdated = true;
			}
		};
		const repo = {
			create: async () => makeSale({ dueAmount: 0 })
		} as unknown as SaleRepository;

		const service = createSaleService(repo, customerService as never);
		await service.createSale(makeInput());

		expect(balanceUpdated).toBe(false);
	});

	it('should decrement batch stock for each item with a batchId', async () => {
		const quantities: Record<string, number> = {};
		const batchService = {
			getBatch: async (id: string) => (id === 'batch-1' ? { id: 'batch-1', quantity: 50 } : null),
			updateBatch: async (id: string, input: { quantity: number }) => {
				quantities[id] = input.quantity;
			}
		};
		const repo = {
			create: async () => makeSale()
		} as unknown as SaleRepository;

		const service = createSaleService(repo, undefined, batchService as never);
		await service.createSale(
			makeInput({
				items: [
					{
						productId: 'p-1',
						productName: 'Paracetamol',
						batchId: 'batch-1',
						batchNumber: 'B001',
						expiryDate: '2027-01-01',
						quantity: 12,
						mrp: 40,
						rate: 32,
						discount: 0,
						gstRate: 12
					}
				]
			})
		);

		expect(quantities['batch-1']).toBe(38);
	});

	it('should preserve Rule 65 statutory fields (patient, doctor, reg no) on sale input', async () => {
		let capturedInput: CreateSaleInput | undefined;
		const repo = {
			create: async (input: CreateSaleInput) => {
				capturedInput = input;
				return makeSale({
					patientName: input.patientName,
					prescriberName: input.prescriberName,
					prescriberRegNo: input.prescriberRegNo
				});
			}
		} as unknown as SaleRepository;

		const service = createSaleService(repo);
		const sale = await service.createSale(
			makeInput({
				patientName: 'Ramesh Kumar',
				prescriberName: 'Dr. S. Sharma',
				prescriberRegNo: 'MCI-99482-A'
			})
		);

		expect((capturedInput as CreateSaleInput | undefined)?.patientName).toBe('Ramesh Kumar');
		expect((capturedInput as CreateSaleInput | undefined)?.prescriberName).toBe('Dr. S. Sharma');
		expect((capturedInput as CreateSaleInput | undefined)?.prescriberRegNo).toBe('MCI-99482-A');
		expect(sale.patientName).toBe('Ramesh Kumar');
		expect(sale.prescriberName).toBe('Dr. S. Sharma');
		expect(sale.prescriberRegNo).toBe('MCI-99482-A');
	});
});
