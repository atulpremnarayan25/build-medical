import { describe, it, expect, beforeAll } from 'vitest';
import { db } from './db/index.js';
import {
	storesTable,
	usersTable,
	productsTable,
	productUnitsTable,
	batchesTable,
	batchStockEventsTable,
	salesTable,
	saleItemsTable,
	customersTable
} from './db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { POST as postSale } from '../../routes/api/sales/+server.js';
import { POST as postCustomer } from '../../routes/api/customers/+server.js';

describe('Phase 2 POS: Keyboard-First Billing & Inventory Deduction', () => {
	let storeId: string;
	let adminUser: any;
	let doloProduct: any;
	let doloBatch: any;

	beforeAll(async () => {
		// Ensure store and admin exist
		const stores = await db.select().from(storesTable).limit(1);
		if (stores.length === 0) {
			const [s] = await db
				.insert(storesTable)
				.values({
					name: 'MedStock Central Pharmacy',
					address: 'Main Market Road',
					gstin: '09AABBC1234D1Z5',
					drugLicenseNo: 'DL-20B-1234',
					drugLicenseNo2: 'DL-21B-1234',
					phone: '9876543210',
					invoicePrefix: 'INV'
				})
				.returning();
			storeId = s.id;
		} else {
			storeId = stores[0].id;
		}

		const admins = await db
			.select()
			.from(usersTable)
			.where(eq(usersTable.username, 'admin'))
			.limit(1);
		adminUser = admins[0];

		// Ensure product "Dolo 650" exists
		const existingProducts = await db
			.select()
			.from(productsTable)
			.where(and(eq(productsTable.storeId, storeId), eq(productsTable.name, 'Dolo 650')))
			.limit(1);

		if (existingProducts.length > 0) {
			doloProduct = existingProducts[0];
		} else {
			const [prod] = await db
				.insert(productsTable)
				.values({
					storeId,
					name: 'Dolo 650',
					genericName: 'Paracetamol 650mg',
					category: 'Antipyretic',
					manufacturer: 'Micro Labs Ltd',
					mrp: '30.00',
					sellingRate: '25.00',
					purchaseRate: '18.00',
					gstRate: '12.00',
					baseUnit: 'Strip',
					packSize: 15,
					drugSchedule: 'none'
				})
				.returning();
			doloProduct = prod;
		}

		// Ensure product has a base unit in productUnitsTable
		const existingUnits = await db
			.select()
			.from(productUnitsTable)
			.where(and(eq(productUnitsTable.productId, doloProduct.id), eq(productUnitsTable.isBaseUnit, true)))
			.limit(1);

		if (existingUnits.length === 0) {
			await db.insert(productUnitsTable).values({
				productId: doloProduct.id,
				unitName: 'Strip',
				conversionToBase: '1',
				retailPrice: '25.00',
				wholesalePrice: '20.00',
				isBaseUnit: true
			});
		}

		// Ensure an active batch exists with 100 units
		const existingBatches = await db
			.select()
			.from(batchesTable)
			.where(eq(batchesTable.productId, doloProduct.id))
			.limit(1);

		if (existingBatches.length > 0) {
			doloBatch = existingBatches[0];
			// Reset quantity to 100 for clean testing
			await db
				.update(batchesTable)
				.set({ quantityRemaining: '100' })
				.where(eq(batchesTable.id, doloBatch.id));
			doloBatch.quantityRemaining = '100';
		} else {
			const futureDate = new Date();
			futureDate.setFullYear(futureDate.getFullYear() + 2);
			const [batch] = await db
				.insert(batchesTable)
				.values({
					productId: doloProduct.id,
					batchNo: 'DL-2026-X1',
					expiryDate: futureDate.toISOString().split('T')[0],
					quantityReceived: '100',
					quantityRemaining: '100',
					mrp: '30.00',
					purchasePrice: '18.00'
				})
				.returning();
			doloBatch = batch;
		}
	});

	it('should support on-the-fly customer creation with 10-digit mobile number', async () => {
		const mobile = '9876500001';
		await db.delete(customersTable).where(eq(customersTable.contactPhone, mobile));

		const mockEvent: any = {
			locals: { user: adminUser },
			request: {
				json: async () => ({
					name: 'Anil Kumar',
					phone: mobile,
					creditLimit: 5000,
					active: true
				})
			}
		};

		const res = await postCustomer(mockEvent);
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.data.name).toBe('Anil Kumar');
		expect(body.data.phone).toBe(mobile);
		expect(body.data.creditLimit).toBe(5000);

		// Verify directly in DB
		const dbCust = await db.query.customersTable.findFirst({
			where: eq(customersTable.contactPhone, mobile)
		});
		expect(dbCust).toBeDefined();
		expect(dbCust?.name).toBe('Anil Kumar');
	});

	it('should finalize sale of 2 units of Dolo 650, deduct inventory by 2, and record stock event delta -2', async () => {
		// Read initial stock
		const [initialBatch] = await db
			.select()
			.from(batchesTable)
			.where(eq(batchesTable.id, doloBatch.id));
		const initialQty = Number(initialBatch.quantityRemaining);
		expect(initialQty).toBeGreaterThanOrEqual(2);

		const salePayload = {
			saleType: 'retail',
			customerId: null,
			items: [
				{
					productId: doloProduct.id,
					batchId: doloBatch.id,
					quantity: 2,
					rate: 25.0,
					discount: 0
				}
			],
			amountPaidAtSaleRupees: 100, // Tendered cash 100
			paymentMethod: 'cash'
		};

		const mockEvent: any = {
			locals: { user: adminUser },
			request: {
				json: async () => salePayload
			}
		};

		const res = await postSale(mockEvent);
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.data.invoiceNumber).toBeDefined();
		expect(body.data.items.length).toBe(1);
		expect(body.data.items[0].quantitySoldUnits).toBe(2);

		const saleId = body.data.id;

		// 1. Verify inventory in batchesTable decreased by exactly 2
		const [updatedBatch] = await db
			.select()
			.from(batchesTable)
			.where(eq(batchesTable.id, doloBatch.id));
		const updatedQty = Number(updatedBatch.quantityRemaining);
		expect(updatedQty).toBe(initialQty - 2);

		// 2. Verify negative delta -2 in batch_stock_events table
		const stockEvents = await db
			.select()
			.from(batchStockEventsTable)
			.where(
				and(
					eq(batchStockEventsTable.batchId, doloBatch.id),
					eq(batchStockEventsTable.referenceId, saleId)
				)
			)
			.orderBy(desc(batchStockEventsTable.createdAt))
			.limit(1);

		expect(stockEvents.length).toBe(1);
		expect(Number(stockEvents[0].delta)).toBe(-2);
		expect(stockEvents[0].eventType).toBe('sale');

		// 3. Verify salesTable record
		const [saleRow] = await db
			.select()
			.from(salesTable)
			.where(eq(salesTable.id, saleId));
		expect(saleRow).toBeDefined();
		expect(saleRow.paymentStatus).toBe('paid');
		expect(Number(saleRow.amountPaidAtSale)).toBeGreaterThan(0);

		// 4. Verify saleItemsTable record
		const [saleItemRow] = await db
			.select()
			.from(saleItemsTable)
			.where(eq(saleItemsTable.saleId, saleId));
		expect(saleItemRow).toBeDefined();
		expect(Number(saleItemRow.quantity)).toBe(2);
	});
});
