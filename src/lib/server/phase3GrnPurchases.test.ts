import { describe, it, expect, beforeAll } from 'vitest';
import { db } from './db/index.js';
import {
	storesTable,
	usersTable,
	productsTable,
	batchesTable,
	batchStockEventsTable,
	suppliersTable,
	purchasesTable
} from './db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { purchaseService, supplierService } from './servicesLocator.js';
import { POST as postAdjustment } from '../../routes/api/inventory/adjustments/+server.js';
import { GET as getLedger } from '../../routes/api/reports/ledger/+server.js';

describe('Phase 3 GRN: Goods Inward, Multi-Unit Conversions, Payables Ledger & Adjustments', () => {
	let storeId: string;
	let adminUser: any;
	let testSupplier: any;
	let augmentinProduct: any;

	beforeAll(async () => {
		// 1. Resolve store
		const stores = await db.select().from(storesTable).limit(1);
		if (stores.length === 0) {
			const [s] = await db
				.insert(storesTable)
				.values({
					name: 'MedStock Central Pharmacy',
					address: 'Main Market Road',
					gstin: '09AABBC1234D1Z5',
					phone: '9876543210'
				})
				.returning();
			storeId = s.id;
		} else {
			storeId = stores[0].id;
		}

		// 2. Resolve admin user
		const admins = await db
			.select()
			.from(usersTable)
			.where(eq(usersTable.username, 'admin'))
			.limit(1);
		adminUser = admins[0];

		// 3. Create or resolve test supplier
		const existingSuppliers = await db
			.select()
			.from(suppliersTable)
			.where(eq(suppliersTable.name, 'GlaxoSmithKline Healthcare Distributors'))
			.limit(1);

		if (existingSuppliers.length > 0) {
			testSupplier = existingSuppliers[0];
		} else {
			const [created] = await db
				.insert(suppliersTable)
				.values({
					storeId,
					name: 'GlaxoSmithKline Healthcare Distributors',
					contactPhone: '9811223344',
					address: '42 Pharma Industrial Area, Baddi',
					gstin: '02AAACG1234F1Z8',
					outstandingBalance: '0'
				})
				.returning();
			testSupplier = created;
		}

		// 4. Create or resolve Augmentin 625mg product
		const existingProducts = await db
			.select()
			.from(productsTable)
			.where(eq(productsTable.name, 'Augmentin 625mg Duo Tablet'))
			.limit(1);

		if (existingProducts.length > 0) {
			augmentinProduct = existingProducts[0];
		} else {
			const [created] = await db
				.insert(productsTable)
				.values({
					storeId,
					name: 'Augmentin 625mg Duo Tablet',
					genericName: 'Amoxicillin 500mg + Clavulanic Acid 125mg',
					manufacturer: 'GlaxoSmithKline Pharmaceuticals Ltd',
					hsnCode: '30041010',
					category: 'Antibiotic',
					baseUnit: 'Strip',
					packSize: 10, // 1 Box = 10 Strips
					mrp: '201.71',
					purchaseRate: '100.00',
					sellingRate: '190.00',
					gstRate: '12.00',
					drugSchedule: 'Schedule H1'
				})
				.returning();
			augmentinProduct = created;
		}
	});

	it('inwards 10 Boxes of Augmentin 625mg (+1 Free Box) at ₹1,000 on credit with 110 retail strips added', async () => {
		const initialSupplierBalance = Number(
			(await db.select().from(suppliersTable).where(eq(suppliersTable.id, testSupplier.id)))[0]
				.outstandingBalance || 0
		);

		const batchNumber = `AUG-TEST-${Date.now().toString().slice(-6)}`;
		const invoiceRef = `SUP-INV-${Date.now().toString().slice(-6)}`;

		// Inward 10 Boxes + 1 Free Box (packSize 10 strips per box)
		// Total inward strips: (10 + 1) * 10 = 110 strips
		// Total purchase cost: 10 boxes * ₹100 = ₹1,000
		// Effective Landing Cost per retail strip: ₹1,000 / 110 = ₹9.09
		const purchase = await purchaseService.createPurchase({
			invoiceNumber: invoiceRef,
			invoiceDate: '2026-10-08',
			supplierId: testSupplier.id,
			supplierName: testSupplier.name,
			subtotal: 1000,
			discountTotal: 0,
			taxableTotal: 1000,
			gstTotal: 0,
			roundOff: 0,
			grandTotal: 1000,
			paidAmount: 0,
			dueAmount: 1000,
			paymentStatus: 'credit',
			paymentMethod: 'credit',
			status: 'confirmed',
			createdBy: adminUser.id,
			items: [
				{
					productId: augmentinProduct.id,
					productName: augmentinProduct.name,
					batchNumber,
					expiryDate: '2028-12-31',
					quantity: 10,
					freeQuantity: 1,
					packSize: 10,
					unit: 'Box',
					baseQuantity: 110,
					mrp: 201.71,
					purchaseRate: 100,
					effectiveRate: 9.09,
					discount: 0,
					gstRate: 0,
					totalAmount: 1000
				}
			]
		});

		expect(purchase).toBeDefined();
		expect(purchase.paymentStatus).toBe('credit');
		expect(purchase.dueAmount).toBe(1000);
		expect(purchase.paidAmount).toBe(0);

		// 1. Verify batchesTable in PostgreSQL
		const [batchRow] = await db
			.select()
			.from(batchesTable)
			.where(
				and(
					eq(batchesTable.productId, augmentinProduct.id),
					eq(batchesTable.batchNo, batchNumber)
				)
			);

		expect(batchRow).toBeDefined();
		expect(Number(batchRow.quantityRemaining)).toBe(110);
		expect(Number(batchRow.quantityReceived)).toBe(110);
		expect(Number(batchRow.purchasePrice)).toBe(9.09);

		// 2. Verify batch_stock_events in PostgreSQL: delta = +110, eventType = 'purchase'
		const [stockEvent] = await db
			.select()
			.from(batchStockEventsTable)
			.where(
				and(
					eq(batchStockEventsTable.batchId, batchRow.id),
					eq(batchStockEventsTable.eventType, 'purchase')
				)
			);

		expect(stockEvent).toBeDefined();
		expect(Number(stockEvent.delta)).toBe(110);
		expect(stockEvent.eventType).toBe('purchase');

		// 3. Verify suppliersTable outstandingBalance reflects ₹1,000 credit debt
		const [updatedSupplier] = await db
			.select()
			.from(suppliersTable)
			.where(eq(suppliersTable.id, testSupplier.id));

		expect(Number(updatedSupplier.outstandingBalance)).toBe(initialSupplierBalance + 1000);

		// 4. Verify supplier payable ledger
		const ledgerReq = new Request(
			`http://localhost/api/reports/ledger?type=payable&partyId=${testSupplier.id}`
		);
		const ledgerRes = await getLedger({
			request: ledgerReq,
			locals: { user: adminUser }
		} as any);

		expect(ledgerRes.status).toBe(200);
		const ledgerData = await ledgerRes.json();
		expect(ledgerData.closingBalance).toBeGreaterThanOrEqual(1000);
		const matchedTx = ledgerData.transactions.find((tx: any) => tx.ref === invoiceRef);
		expect(matchedTx).toBeDefined();
		expect(matchedTx.credit).toBe(1000);
	});

	it('records physical stock adjustments with mandatory reason and writes delta rows to batch_stock_events', async () => {
		// Create a test batch to adjust
		const batchNumber = `ADJ-TEST-${Date.now().toString().slice(-6)}`;
		const [batch] = await db
			.insert(batchesTable)
			.values({
				productId: augmentinProduct.id,
				batchNo: batchNumber,
				expiryDate: '2028-10-31',
				quantityReceived: '50',
				quantityRemaining: '50',
				purchasePrice: '9.09',
				mrp: '201.71',
				originNode: 'store_server'
			})
			.returning();

		// Case A: Attempt adjustment with missing reason -> rejected
		const invalidReq = new Request('http://localhost/api/inventory/adjustments', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				items: [
					{
						batchId: batch.id,
						delta: -5,
						reasonCode: '',
						notes: ''
					}
				]
			})
		});

		const invalidRes = await postAdjustment({
			request: invalidReq,
			locals: { user: adminUser }
		} as any);

		expect(invalidRes.status).toBe(500);

		// Case B: Valid adjustment with mandatory reason (e.g. broken ampoules / damaged strips)
		const validReq = new Request('http://localhost/api/inventory/adjustments', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				items: [
					{
						batchId: batch.id,
						delta: -5,
						reasonCode: 'Breakage / Leakage',
						notes: '5 damaged strips with broken blister foil during shelf audit'
					}
				]
			})
		});

		const validRes = await postAdjustment({
			request: validReq,
			locals: { user: adminUser }
		} as any);

		expect(validRes.status).toBe(201);

		// Verify batch stock updated in batchesTable
		const [adjustedBatch] = await db
			.select()
			.from(batchesTable)
			.where(eq(batchesTable.id, batch.id));
		expect(Number(adjustedBatch.quantityRemaining)).toBe(45);

		// Verify delta row in batch_stock_eventsTable
		const [adjEvent] = await db
			.select()
			.from(batchStockEventsTable)
			.where(
				and(
					eq(batchStockEventsTable.batchId, batch.id),
					eq(batchStockEventsTable.eventType, 'adjustment')
				)
			);

		expect(adjEvent).toBeDefined();
		expect(Number(adjEvent.delta)).toBe(-5);
		expect(adjEvent.reason).toContain('Breakage / Leakage');
	});
});
