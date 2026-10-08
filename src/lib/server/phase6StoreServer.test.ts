import { describe, it, expect, beforeAll } from 'vitest';
import { db } from './db/index.js';
import {
	storesTable,
	usersTable,
	productsTable,
	productUnitsTable,
	batchesTable,
	customersTable
} from './db/schema.js';
import { eq } from 'drizzle-orm';
import { GET as getHealth } from '../../routes/api/health/+server.js';
import { GET as getNetworkTopologyApi } from '../../routes/api/settings/network/+server.js';
import { POST as postSale } from '../../routes/api/sales/+server.js';
import { createBackup, restoreBackup, listBackups } from './backup/engine.js';
import fs from 'fs';

describe('Phase 6: Standalone Store Server, Local LAN Pairing & Automated Backup Engine', () => {
	let storeId: string;
	let adminUser: any;
	let paracetamolProduct: any;
	let paracetamolUnit: any;
	let paracetamolBatch: any;
	let testCustomer: any;

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

		// 3. Resolve or create test product & batch for offline transaction verification
		const products = await db
			.select()
			.from(productsTable)
			.where(eq(productsTable.storeId, storeId))
			.limit(1);

		if (products.length > 0) {
			paracetamolProduct = products[0];
		} else {
			const [p] = await db
				.insert(productsTable)
				.values({
					storeId,
					name: 'Paracetamol 650mg Tablets',
					category: 'Analgesic',
					manufacturer: 'Micro Labs Ltd',
					genericName: 'Paracetamol',
					hsnCode: '30049099',
					gstRate: '12.00',
					baseUnit: 'Strip'
				})
				.returning();
			paracetamolProduct = p;
		}

		// Units
		const units = await db
			.select()
			.from(productUnitsTable)
			.where(eq(productUnitsTable.productId, paracetamolProduct.id))
			.limit(1);

		if (units.length > 0) {
			paracetamolUnit = units[0];
		} else {
			const [u] = await db
				.insert(productUnitsTable)
				.values({
					productId: paracetamolProduct.id,
					unitName: 'Strip',
					conversionToBase: '1',
					retailPrice: '30.00',
					wholesalePrice: '22.00',
					isBaseUnit: true
				})
				.returning();
			paracetamolUnit = u;
		}

		// Batches
		const batches = await db
			.select()
			.from(batchesTable)
			.where(eq(batchesTable.productId, paracetamolProduct.id))
			.limit(1);

		if (batches.length > 0) {
			paracetamolBatch = batches[0];
			if (Number(paracetamolBatch.quantityRemaining) < 20) {
				const [updated] = await db
					.update(batchesTable)
					.set({ quantityRemaining: '100' })
					.where(eq(batchesTable.id, paracetamolBatch.id))
					.returning();
				paracetamolBatch = updated;
			}
		} else {
			const [b] = await db
				.insert(batchesTable)
				.values({
					productId: paracetamolProduct.id,
					batchNo: 'PCM-PH6-001',
					expiryDate: '2027-12-31',
					mrp: '30.00',
					purchasePrice: '18.50',
					quantityReceived: '100',
					quantityRemaining: '100'
				})
				.returning();
			paracetamolBatch = b;
		}

		// Customers
		const customers = await db.select().from(customersTable).limit(1);
		if (customers.length > 0) {
			testCustomer = customers[0];
		} else {
			const [c] = await db
				.insert(customersTable)
				.values({
					storeId,
					name: 'Ramesh Patel',
					contactPhone: '9988776655',
					customerType: 'retail'
				})
				.returning();
			testCustomer = c;
		}
	});

	it('should verify GET /api/health reports system uptime, database latency, and storage space (Task 4)', async () => {
		const res = await getHealth({} as any);
		expect(res.status).toBe(200);

		const data = await res.json();
		expect(data.status).toBe('healthy');
		expect(data.timestamp).toBeDefined();

		// System Uptime
		expect(data.uptime).toBeDefined();
		expect(data.uptime.seconds).toBeGreaterThanOrEqual(0);
		expect(data.uptime.formatted).toBeDefined();

		// Database Latency
		expect(data.database).toBeDefined();
		expect(data.database.status).toBe('connected');
		expect(data.database.latencyMs).toBeGreaterThanOrEqual(0);

		// Storage space
		expect(data.storage).toBeDefined();
		expect(data.storage.totalBytes).toBeGreaterThan(0);
		expect(data.storage.freeBytes).toBeGreaterThan(0);
		expect(data.storage.usedPercent).toBeGreaterThanOrEqual(0);
		expect(data.storage.usedPercent).toBeLessThanOrEqual(100);

		// Zero-Internet readiness
		expect(data.offlineOperation).toBeDefined();
		expect(data.offlineOperation.zeroInternetReady).toBe(true);
		expect(data.offlineOperation.mode).toBe('standalone-lan-appliance');
	});

	it('should verify Local LAN Pairing helper generates pairing URL and SVG QR code (Task 2)', async () => {
		const req = new Request('http://localhost:3000/api/settings/network');
		const res = await getNetworkTopologyApi({
			url: new URL('http://localhost:3000/api/settings/network'),
			locals: { user: adminUser }
		} as any);

		expect(res.status).toBe(200);
		const data = await res.json();
		const topology = data.data;

		expect(topology.serverStatus).toBe('healthy');
		expect(topology.primaryIp).toBeDefined();
		expect(topology.port).toBe(3000);
		expect(topology.pairingUrl).toContain(`:${topology.port}`);
		expect(topology.qrCodeSvg).toContain('<svg');
		expect(topology.connectedDevicesCount).toBeGreaterThanOrEqual(1);
	});

	it('should generate a timestamped, gzip-compressed PostgreSQL database dump in ./backups (Task 3)', async () => {
		const backupResult = await createBackup();
		expect(backupResult.success).toBe(true);
		expect(backupResult.backup.filename).toMatch(/^medstock_backup_\d{4}-\d{2}-\d{2}_\d{4}\.sql\.gz$/);
		expect(backupResult.backup.sizeBytes).toBeGreaterThan(1000); // Substantial SQL dump
		expect(fs.existsSync(backupResult.backup.path)).toBe(true);

		// Verify listed backups include this snapshot
		const allBackups = listBackups();
		expect(allBackups.length).toBeGreaterThanOrEqual(1);
		expect(allBackups[0].filename).toBe(backupResult.backup.filename);
	});

	it('should restore a .sql.gz database dump without errors (Task 3)', async () => {
		const backups = listBackups();
		expect(backups.length).toBeGreaterThan(0);

		const restoreResult = await restoreBackup(backups[0].path);
		expect(restoreResult.success).toBe(true);
		expect(restoreResult.restoredFile).toBe(backups[0].filename);

		// Verify database is completely healthy and responsive post-restore
		const res = await getHealth({} as any);
		expect(res.status).toBe(200);
		const healthData = await res.json();
		expect(healthData.database.status).toBe('connected');
	});

	it('should execute a complete transaction cycle in zero-internet offline mode (Task 4)', async () => {
		// Calculate total product stock across all batches before sale
		const batchesBefore = await db
			.select()
			.from(batchesTable)
			.where(eq(batchesTable.productId, paracetamolProduct.id));
		const totalStockBefore = batchesBefore.reduce(
			(sum, b) => sum + Number(b.quantityRemaining),
			0
		);

		const saleQuantity = 2;

		const saleRequest = new Request('http://localhost/api/sales', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				saleType: 'retail',
				customerId: testCustomer.id,
				patientName: 'Offline Counter Customer',
				items: [
					{
						productId: paracetamolProduct.id,
						unitId: paracetamolUnit.id,
						quantity: saleQuantity
					}
				],
				paymentMethod: 'cash'
			})
		});

		const res = await postSale({
			request: saleRequest,
			locals: { user: adminUser }
		} as any);

		expect(res.status).toBe(201);
		const saleData = await res.json();
		expect(saleData.data.invoiceNumber).toBeDefined();
		expect(saleData.data.grandTotalRupees).toBeGreaterThan(0);

		// Verify local stock deduction via FEFO
		const batchesAfter = await db
			.select()
			.from(batchesTable)
			.where(eq(batchesTable.productId, paracetamolProduct.id));
		const totalStockAfter = batchesAfter.reduce(
			(sum, b) => sum + Number(b.quantityRemaining),
			0
		);

		expect(totalStockAfter).toBe(totalStockBefore - saleQuantity);
	});
});
