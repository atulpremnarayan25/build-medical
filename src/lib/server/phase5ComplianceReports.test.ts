import { describe, it, expect, beforeAll } from 'vitest';
import { db } from './db/index.js';
import {
	storesTable,
	usersTable,
	productsTable,
	productUnitsTable,
	batchesTable,
	batchStockEventsTable,
	customersTable,
	suppliersTable
} from './db/schema.js';
import { eq, and } from 'drizzle-orm';
import { POST as postSale } from '../../routes/api/sales/+server.js';
import { GET as getScheduleH1Report } from '../../routes/api/reports/schedule-h1/+server.js';
import { GET as getGstReport } from '../../routes/api/reports/gst/+server.js';
import { GET as getExpiryReport } from '../../routes/api/reports/expiry/+server.js';
import { POST as postReturn } from '../../routes/api/returns/+server.js';

describe('Phase 5: Statutory Compliance Reports (Schedule H1 Form 35, GSTR-1 & Expiry Risk)', () => {
	let storeId: string;
	let adminUser: any;
	let alprazolamProduct: any;
	let alprazolamBatch: any;
	let alprazolamUnit: any;
	let b2bCustomer: any;

	beforeAll(async () => {
		// 1. Resolve or create store
		const stores = await db.select().from(storesTable).limit(1);
		if (stores.length === 0) {
			const [s] = await db
				.insert(storesTable)
				.values({
					name: 'MedStock Central Pharmacy',
					address: '123 Healthcare Road, Medical Square',
					gstin: '29ABCDE1234F1Z5',
					drugLicenseNo: 'KA-B2-192847',
					drugLicenseNo2: 'KA-B2-192848',
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

		// 3. Ensure Alprazolam 0.25mg product exists with drugSchedule 'H1'
		const existingAlprazolam = await db
			.select()
			.from(productsTable)
			.where(
				and(
					eq(productsTable.storeId, storeId),
					eq(productsTable.name, 'Alprazolam 0.25mg')
				)
			)
			.limit(1);

		if (existingAlprazolam.length > 0) {
			alprazolamProduct = existingAlprazolam[0];
			if (alprazolamProduct.drugSchedule !== 'H1') {
				const [updated] = await db
					.update(productsTable)
					.set({ drugSchedule: 'H1' })
					.where(eq(productsTable.id, alprazolamProduct.id))
					.returning();
				alprazolamProduct = updated;
			}
		} else {
			const [p] = await db
				.insert(productsTable)
				.values({
					storeId,
					name: 'Alprazolam 0.25mg',
					category: 'Anxiolytic',
					manufacturer: 'Torrent Pharmaceuticals',
					genericName: 'Alprazolam',
					hsnCode: '30049099',
					gstRate: '12.00',
					baseUnit: 'Tablet',
					drugSchedule: 'H1'
				})
				.returning();
			alprazolamProduct = p;
		}

		// Ensure product unit exists
		const existingUnits = await db
			.select()
			.from(productUnitsTable)
			.where(eq(productUnitsTable.productId, alprazolamProduct.id))
			.limit(1);

		if (existingUnits.length > 0) {
			alprazolamUnit = existingUnits[0];
		} else {
			const [u] = await db
				.insert(productUnitsTable)
				.values({
					productId: alprazolamProduct.id,
					unitName: 'Tablet',
					conversionToBase: '1',
					retailPrice: '4.20',
					wholesalePrice: '3.50',
					isBaseUnit: true
				})
				.returning();
			alprazolamUnit = u;
		}

		// Ensure batch with remaining stock exists
		const existingBatches = await db
			.select()
			.from(batchesTable)
			.where(
				and(
					eq(batchesTable.productId, alprazolamProduct.id),
					eq(batchesTable.batchNo, 'ALP-H1-901')
				)
			)
			.limit(1);

		if (existingBatches.length > 0) {
			alprazolamBatch = existingBatches[0];
			if (Number(alprazolamBatch.quantityRemaining) < 50) {
				const [b] = await db
					.update(batchesTable)
					.set({ quantityRemaining: '100' })
					.where(eq(batchesTable.id, alprazolamBatch.id))
					.returning();
				alprazolamBatch = b;
			}
		} else {
			const [b] = await db
				.insert(batchesTable)
				.values({
					productId: alprazolamProduct.id,
					batchNo: 'ALP-H1-901',
					expiryDate: '2027-08-31',
					mrp: '42.00',
					purchasePrice: '26.04',
					quantityReceived: '200',
					quantityRemaining: '200'
				})
				.returning();
			alprazolamBatch = b;

			await db.insert(batchStockEventsTable).values({
				batchId: b.id,
				delta: '200',
				eventType: 'purchase',
				reason: 'Opening stock for H1 audit test',
				createdBy: adminUser.id
			});
		}

		// 4. Ensure B2B registered customer exists with unique phone number
		const existingCustomers = await db
			.select()
			.from(customersTable)
			.where(
				and(
					eq(customersTable.storeId, storeId),
					eq(customersTable.name, 'Apollo Hospital Clinic')
				)
			)
			.limit(1);

		if (existingCustomers.length > 0) {
			b2bCustomer = existingCustomers[0];
		} else {
			const [c] = await db
				.insert(customersTable)
				.values({
					storeId,
					name: 'Apollo Hospital Clinic',
					contactPhone: '9876599887',
					address: 'Plot 42, Health City, Bengaluru',
					gstin: '29AAACH7409R1ZX',
					customerType: 'wholesale'
				})
				.returning();
			b2bCustomer = c;
		}
	});

	it('should enforce Rule 65: reject sale of Schedule H1 medicine without prescribing doctor details', async () => {
		const reqWithoutDoctor = new Request('http://localhost/api/sales', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				saleType: 'retail',
				items: [
					{
						productId: alprazolamProduct.id,
						unitId: alprazolamUnit.id,
						quantity: 10
					}
				],
				paymentMethod: 'cash'
			})
		});

		const res = await postSale({
			request: reqWithoutDoctor,
			locals: { user: adminUser }
		} as any);

		expect(res.status).toBe(422);
		const err = await res.json();
		expect(err.error.code).toBe('SCHEDULE_H1_COMPLIANCE_REQUIRED');
		expect(err.error.message).toContain('Rule 65 compliance required');
	});

	it('should complete sale of "Alprazolam 0.25mg" (Schedule H1) with doctor details (Exit Criteria 1)', async () => {
		const validH1SaleRequest = new Request('http://localhost/api/sales', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				saleType: 'retail',
				patientName: 'Sunita Verma',
				prescriberName: 'Dr. A. K. Sharma',
				prescriberRegNo: 'MCI-48291',
				items: [
					{
						productId: alprazolamProduct.id,
						unitId: alprazolamUnit.id,
						quantity: 10
					}
				],
				paymentMethod: 'cash',
				notes: 'Form 35 compliance record'
			})
		});

		const res = await postSale({
			request: validH1SaleRequest,
			locals: { user: adminUser }
		} as any);

		expect(res.status).toBe(201);
		const saleData = await res.json();
		expect(saleData.data.invoiceNumber).toBeDefined();
		expect(saleData.data.grandTotalRupees).toBeGreaterThan(0);
	});

	it('should verify Schedule H1 Form 35 Statutory Register contains record with full statutory details (Exit Criteria 2)', async () => {
		const reportReq = new Request(
			'http://localhost/api/reports/schedule-h1?schedule=H1&search=Alprazolam'
		);
		const res = await getScheduleH1Report({
			request: reportReq,
			locals: { user: adminUser }
		} as any);

		expect(res.status).toBe(200);
		const data = await res.json();

		expect(data.store).toBeDefined();
		expect(data.store.drugLicenseNo).toBeDefined();
		expect(data.entries.length).toBeGreaterThan(0);

		// Find the Alprazolam entry for the sale completed with Dr. A. K. Sharma
		const alprazolamEntry = data.entries.find(
			(e: any) =>
				e.productName.includes('Alprazolam') &&
				e.prescriberRegNo === 'MCI-48291' &&
				e.patientDisplayName === 'Sunita Verma'
		);

		expect(alprazolamEntry).toBeDefined();
		// Verify all 10 mandatory Rule 65 statutory columns
		expect(alprazolamEntry.date).toBeDefined();
		expect(alprazolamEntry.patientDisplayName).toBe('Sunita Verma');
		expect(alprazolamEntry.prescriberName).toBe('Dr. A. K. Sharma');
		expect(alprazolamEntry.prescriberRegNo).toBe('MCI-48291');
		expect(alprazolamEntry.productName).toContain('Alprazolam');
		expect(alprazolamEntry.manufacturer).toBeDefined();
		expect(alprazolamEntry.batchNo).toBeDefined();
		expect(alprazolamEntry.expiryDate).toBeDefined();
		expect(alprazolamEntry.quantity).toBe(10);
		expect(alprazolamEntry.billerName).toBeDefined();

		// Verify summary statistics
		expect(data.summary.h1Count).toBeGreaterThanOrEqual(1);
		expect(data.summary.totalQuantity).toBeGreaterThanOrEqual(10);
	});

	it('should verify B2B and B2C sales tie out to the rupee against total sales in GSTR-1 (Exit Criteria 3)', async () => {
		// 1. Post a B2B sale with customer GSTIN
		const b2bSaleReq = new Request('http://localhost/api/sales', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				saleType: 'wholesale',
				customerId: b2bCustomer.id,
				patientName: 'Hospital Inpatient Dept',
				prescriberName: 'Dr. Ramesh Rao',
				prescriberRegNo: 'KMC-99182',
				items: [
					{
						productId: alprazolamProduct.id,
						unitId: alprazolamUnit.id,
						quantity: 20
					}
				],
				paymentMethod: 'credit'
			})
		});

		const b2bRes = await postSale({
			request: b2bSaleReq,
			locals: { user: adminUser }
		} as any);
		expect(b2bRes.status).toBe(201);

		// 2. Query GSTR-1 Report endpoint
		const gstReq = new Request('http://localhost/api/reports/gst');
		const gstRes = await getGstReport({
			request: gstReq,
			locals: { user: adminUser }
		} as any);

		expect(gstRes.status).toBe(200);
		const gstData = await gstRes.json();

		expect(gstData.totals).toBeDefined();
		expect(gstData.b2b).toBeDefined();
		expect(gstData.b2c).toBeDefined();

		// Verify strict rupee tie-out (B2B + B2C = Total Sales)
		const b2bTaxable = gstData.b2b.summary.taxableAmount;
		const b2cTaxable = gstData.b2c.summary.taxableAmount;
		const totalTaxable = gstData.totals.taxableAmount;
		expect(Number((b2bTaxable + b2cTaxable).toFixed(2))).toBe(Number(totalTaxable.toFixed(2)));

		const b2bGst = gstData.b2b.summary.gstAmount;
		const b2cGst = gstData.b2c.summary.gstAmount;
		const totalGst = gstData.totals.gstAmount;
		expect(Number((b2bGst + b2cGst).toFixed(2))).toBe(Number(totalGst.toFixed(2)));

		const b2bTotal = gstData.b2b.summary.totalAmount;
		const b2cTotal = gstData.b2c.summary.totalAmount;
		const totalGrand = gstData.totals.totalAmount;
		expect(Number((b2bTotal + b2cTotal).toFixed(2))).toBe(Number(totalGrand.toFixed(2)));

		const totalInvoices = gstData.totals.invoiceCount;
		expect(gstData.b2b.summary.invoiceCount + gstData.b2c.summary.invoiceCount).toBe(totalInvoices);

		// Verify Table 4 B2B items
		expect(gstData.b2b.invoices.length).toBeGreaterThan(0);
		const apolloB2BInv = gstData.b2b.invoices.find(
			(i: any) => i.customerGstin === b2bCustomer.gstin
		);
		expect(apolloB2BInv).toBeDefined();
		expect(apolloB2BInv.reverseCharge).toBe('N');
		expect(apolloB2BInv.invoiceType).toBe('Regular');

		// Verify Table 12 HSN Summary exists
		expect(gstData.hsnSummary).toBeDefined();
		expect(gstData.hsnSummary.length).toBeGreaterThan(0);
		const hsnItem = gstData.hsnSummary.find((h: any) => h.hsnCode === '30049099');
		expect(hsnItem).toBeDefined();
		expect(hsnItem.uqc).toBeDefined();
		expect(hsnItem.totalQuantity).toBeGreaterThan(0);
	});

	it('should verify Near-Expiry and Expired Stock report with risk windows and return debit notes', async () => {
		// 1. Create a near-expiry batch (< 60 days) with a supplier
		const [supplier] = await db
			.insert(suppliersTable)
			.values({
				storeId,
				name: 'Sun Pharma Distribution Agency',
				contactPhone: '9845012345',
				gstin: '29SUNPH1234F1Z9'
			})
			.returning();

		const nearExpiryDate = new Date();
		nearExpiryDate.setDate(nearExpiryDate.getDate() + 45); // 45 days away (60-day window)
		const expiryDateStr = nearExpiryDate.toISOString().split('T')[0];

		const [nearExpiryBatch] = await db
			.insert(batchesTable)
			.values({
				productId: alprazolamProduct.id,
				batchNo: 'EXP-RISK-45D',
				expiryDate: expiryDateStr,
				mrp: '42.00',
				purchasePrice: '25.00',
				quantityReceived: '50',
				quantityRemaining: '50',
				supplierId: supplier.id
			})
			.returning();

		// 2. Query Expiry Report
		const expiryReq = new Request('http://localhost/api/reports/expiry?window=all');
		const res = await getExpiryReport({
			request: expiryReq,
			locals: { user: adminUser }
		} as any);

		expect(res.status).toBe(200);
		const expiryData = await res.json();

		expect(expiryData.summary.totalBatchesAtRisk).toBeGreaterThan(0);
		expect(expiryData.summary.totalCostAtRisk).toBeGreaterThan(0);

		const batchInReport = expiryData.items.find((i: any) => i.id === nearExpiryBatch.id);
		expect(batchInReport).toBeDefined();
		expect(batchInReport.batchNo).toBe('EXP-RISK-45D');
		expect(batchInReport.remainingStock).toBe(50);
		expect(batchInReport.unitPurchaseCost).toBe(25);
		expect(batchInReport.totalValueAtRisk).toBe(1250); // 50 * 25
		expect(batchInReport.category).toBe('60_days');
		expect(batchInReport.supplierName).toBe('Sun Pharma Distribution Agency');

		// 3. Issue a Supplier Expiry Return Note (purchase return)
		const returnReq = new Request('http://localhost/api/returns', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				returnType: 'purchase_return',
				reason: 'Near-expiry stock return before 60-day cutoff',
				items: [
					{
						batchId: nearExpiryBatch.id,
						quantity: 50,
						lineAmount: 1250
					}
				]
			})
		});

		const returnRes = await postReturn({
			request: returnReq,
			locals: { user: adminUser }
		} as any);

		expect(returnRes.status).toBe(201);
		const returnData = await returnRes.json();
		expect(returnData.data.id).toBeDefined();
		expect(returnData.data.returnType).toBe('purchase_return');

		// Verify stock was reversed to 0
		const [updatedBatch] = await db
			.select()
			.from(batchesTable)
			.where(eq(batchesTable.id, nearExpiryBatch.id))
			.limit(1);

		expect(Number(updatedBatch.quantityRemaining)).toBe(0);
	});
});
