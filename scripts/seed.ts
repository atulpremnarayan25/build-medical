import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { db } from '../src/lib/server/db/index.js';
import {
	storesTable,
	usersTable,
	productsTable,
	productUnitsTable,
	batchesTable,
	batchStockEventsTable,
	suppliersTable,
	customersTable,
	invoiceSequencesTable
} from '../src/lib/server/db/schema.js';

const masterPasswordHash = bcrypt.hashSync('admin123', 10);

function isoDate(offsetDays: number): string {
	const d = new Date();
	d.setDate(d.getDate() + offsetDays);
	return d.toISOString().split('T')[0];
}

interface ProductSeed {
	name: string;
	category: string;
	manufacturer: string;
	hsn: string;
	gst: string;
	kind: 'tablet' | 'bottle' | 'tube' | 'sachet';
	packMrp: number; // printed MRP of a strip/bottle/tube
	drugSchedule?: string;
}

// ~45 products, varied GST rates and pack styles, priced like a real stockist's shelf.
const PRODUCTS: ProductSeed[] = [
	{
		name: 'Paracetamol 500mg',
		category: 'Analgesic',
		manufacturer: 'Cipla',
		hsn: '30049099',
		gst: '12',
		kind: 'tablet',
		packMrp: 30.5
	},
	{
		name: 'Dolo 650mg',
		category: 'Analgesic',
		manufacturer: 'Micro Labs',
		hsn: '30049099',
		gst: '12',
		kind: 'tablet',
		packMrp: 33.4
	},
	{
		name: 'Azithromycin 500mg',
		category: 'Antibiotic',
		manufacturer: 'Cipla',
		hsn: '30042099',
		gst: '12',
		kind: 'tablet',
		packMrp: 119
	},
	{
		name: 'Amoxicillin 250mg',
		category: 'Antibiotic',
		manufacturer: 'Sun Pharma',
		hsn: '30042099',
		gst: '12',
		kind: 'tablet',
		packMrp: 95
	},
	{
		name: 'Augmentin 625mg',
		category: 'Antibiotic',
		manufacturer: 'GSK',
		hsn: '30042099',
		gst: '12',
		kind: 'tablet',
		packMrp: 248
	},
	{
		name: 'Cefixime 200mg',
		category: 'Antibiotic',
		manufacturer: 'Lupin',
		hsn: '30042099',
		gst: '12',
		kind: 'tablet',
		packMrp: 156
	},
	{
		name: 'Doxycycline 100mg',
		category: 'Antibiotic',
		manufacturer: 'Abbott',
		hsn: '30042099',
		gst: '12',
		kind: 'tablet',
		packMrp: 125
	},
	{
		name: 'Pantoprazole 40mg',
		category: 'Gastro',
		manufacturer: 'Alkem',
		hsn: '30049099',
		gst: '12',
		kind: 'tablet',
		packMrp: 148
	},
	{
		name: 'Omeprazole 20mg',
		category: 'Gastro',
		manufacturer: 'Cipla',
		hsn: '30049099',
		gst: '12',
		kind: 'tablet',
		packMrp: 96
	},
	{
		name: 'Rabeprazole 20mg',
		category: 'Gastro',
		manufacturer: "Dr Reddy's",
		hsn: '30049099',
		gst: '12',
		kind: 'tablet',
		packMrp: 135
	},
	{
		name: 'Metformin 500mg',
		category: 'Antidiabetic',
		manufacturer: 'USV',
		hsn: '30049099',
		gst: '12',
		kind: 'tablet',
		packMrp: 42
	},
	{
		name: 'Glimepiride 2mg',
		category: 'Antidiabetic',
		manufacturer: 'Torrent',
		hsn: '30049099',
		gst: '12',
		kind: 'tablet',
		packMrp: 88
	},
	{
		name: 'Voglibose 0.3mg',
		category: 'Antidiabetic',
		manufacturer: 'Cadila',
		hsn: '30049099',
		gst: '12',
		kind: 'tablet',
		packMrp: 148
	},
	{
		name: 'Amlodipine 5mg',
		category: 'Cardiovascular',
		manufacturer: 'Mankind',
		hsn: '30049099',
		gst: '12',
		kind: 'tablet',
		packMrp: 55
	},
	{
		name: 'Atorvastatin 10mg',
		category: 'Cardiovascular',
		manufacturer: 'Zydus',
		hsn: '30049099',
		gst: '12',
		kind: 'tablet',
		packMrp: 135
	},
	{
		name: 'Losartan 50mg',
		category: 'Cardiovascular',
		manufacturer: 'Torrent',
		hsn: '30049099',
		gst: '12',
		kind: 'tablet',
		packMrp: 72
	},
	{
		name: 'Telmisartan 40mg',
		category: 'Cardiovascular',
		manufacturer: 'Glenmark',
		hsn: '30049099',
		gst: '12',
		kind: 'tablet',
		packMrp: 112
	},
	{
		name: 'Clopidogrel 75mg',
		category: 'Cardiovascular',
		manufacturer: 'Sun Pharma',
		hsn: '30049099',
		gst: '12',
		kind: 'tablet',
		packMrp: 105
	},
	{
		name: 'Metoprolol 50mg',
		category: 'Cardiovascular',
		manufacturer: 'NTL',
		hsn: '30049099',
		gst: '12',
		kind: 'tablet',
		packMrp: 98
	},
	{
		name: 'Aspirin 75mg',
		category: 'Cardiovascular',
		manufacturer: 'USV',
		hsn: '30049099',
		gst: '12',
		kind: 'tablet',
		packMrp: 35
	},
	{
		name: 'Cetirizine 10mg',
		category: 'Antihistamine',
		manufacturer: "Dr Reddy's",
		hsn: '30049013',
		gst: '12',
		kind: 'tablet',
		packMrp: 35
	},
	{
		name: 'Montelukast 10mg',
		category: 'Respiratory',
		manufacturer: 'Sun Pharma',
		hsn: '30049099',
		gst: '12',
		kind: 'tablet',
		packMrp: 165
	},
	{
		name: 'Prednisolone 10mg',
		category: 'Corticosteroid',
		manufacturer: 'Zydus',
		hsn: '30049099',
		gst: '12',
		kind: 'tablet',
		packMrp: 62
	},
	{
		name: 'Alprazolam 0.25mg',
		category: 'Anxiolytic',
		manufacturer: 'Torrent',
		hsn: '30049099',
		gst: '12',
		kind: 'tablet',
		packMrp: 42,
		drugSchedule: 'H1'
	},
	{
		name: 'Tramadol 50mg',
		category: 'Analgesic',
		manufacturer: 'Intas',
		hsn: '30049099',
		gst: '12',
		kind: 'tablet',
		packMrp: 78,
		drugSchedule: 'H1'
	},
	{
		name: 'Ibuprofen 400mg',
		category: 'Analgesic',
		manufacturer: 'Abbott',
		hsn: '30049099',
		gst: '12',
		kind: 'tablet',
		packMrp: 38
	},
	{
		name: 'Diclofenac Gel 30g',
		category: 'Analgesic',
		manufacturer: 'Novartis',
		hsn: '30049099',
		gst: '12',
		kind: 'tube',
		packMrp: 110
	},
	{
		name: 'Betadine Ointment 20g',
		category: 'Antiseptic',
		manufacturer: 'Win-Medicare',
		hsn: '30049099',
		gst: '12',
		kind: 'tube',
		packMrp: 92
	},
	{
		name: 'Cough Syrup 100ml',
		category: 'Respiratory',
		manufacturer: 'Mankind',
		hsn: '30049099',
		gst: '12',
		kind: 'bottle',
		packMrp: 92
	},
	{
		name: 'Cetirizine Syrup 60ml',
		category: 'Antihistamine',
		manufacturer: 'Cipla',
		hsn: '30049013',
		gst: '12',
		kind: 'bottle',
		packMrp: 58
	},
	{
		name: 'ORS Sachets (Pack of 5)',
		category: 'Electrolyte',
		manufacturer: 'FDC',
		hsn: '30049099',
		gst: '5',
		kind: 'sachet',
		packMrp: 22.5
	},
	{
		name: 'Electral Powder 21.8g',
		category: 'Electrolyte',
		manufacturer: 'FDC',
		hsn: '30049099',
		gst: '5',
		kind: 'sachet',
		packMrp: 21
	},
	{
		name: 'Insulin Glargine 100IU/ml',
		category: 'Antidiabetic',
		manufacturer: 'Sanofi',
		hsn: '30043100',
		gst: '5',
		kind: 'bottle',
		packMrp: 480
	},
	{
		name: 'Vitamin C 1000mg',
		category: 'Supplement',
		manufacturer: 'Limcee',
		hsn: '30049099',
		gst: '12',
		kind: 'tablet',
		packMrp: 52
	},
	{
		name: 'Multivitamin Tablets',
		category: 'Supplement',
		manufacturer: 'Abbott',
		hsn: '30049099',
		gst: '12',
		kind: 'tablet',
		packMrp: 165
	},
	{
		name: 'Iron + Folic Acid',
		category: 'Supplement',
		manufacturer: 'Emcure',
		hsn: '30049099',
		gst: '12',
		kind: 'tablet',
		packMrp: 85
	},
	{
		name: 'Calcium + Vitamin D3',
		category: 'Supplement',
		manufacturer: 'Torrent',
		hsn: '30049099',
		gst: '12',
		kind: 'tablet',
		packMrp: 192
	},
	{
		name: 'Levothyroxine 50mcg',
		category: 'Hormone',
		manufacturer: 'Abbott',
		hsn: '30049099',
		gst: '12',
		kind: 'tablet',
		packMrp: 125
	},
	{
		name: 'Fluconazole 150mg',
		category: 'Antifungal',
		manufacturer: 'Cipla',
		hsn: '30042099',
		gst: '12',
		kind: 'tablet',
		packMrp: 115
	},
	{
		name: 'Clindamycin 300mg',
		category: 'Antibiotic',
		manufacturer: 'Cipla',
		hsn: '30042099',
		gst: '12',
		kind: 'tablet',
		packMrp: 210
	},
	{
		name: 'Ondansetron 4mg',
		category: 'Antiemetic',
		manufacturer: 'Sun Pharma',
		hsn: '30049099',
		gst: '12',
		kind: 'tablet',
		packMrp: 48
	},
	{
		name: 'Domperidone 10mg',
		category: 'Gastro',
		manufacturer: 'Torrent',
		hsn: '30049099',
		gst: '12',
		kind: 'tablet',
		packMrp: 52
	},
	{
		name: 'Ciprofloxacin Eye Drops 5ml',
		category: 'Opthalmic',
		manufacturer: 'Cipla',
		hsn: '30042099',
		gst: '12',
		kind: 'bottle',
		packMrp: 68
	},
	{
		name: 'Glucose D Powder 200g',
		category: 'Electrolyte',
		manufacturer: 'BDH',
		hsn: '17049010',
		gst: '0',
		kind: 'bottle',
		packMrp: 85
	},
	{
		name: 'Rosuvastatin 10mg',
		category: 'Cardiovascular',
		manufacturer: "Dr Reddy's",
		hsn: '30049099',
		gst: '12',
		kind: 'tablet',
		packMrp: 195
	}
];

function money(n: number): string {
	return n.toFixed(2);
}

async function seedDb() {
	console.log('Clearing database...');
	await db.execute(sql`
        TRUNCATE TABLE batch_stock_events, invoice_sequences, return_items, returns, payments, sale_items, sales, purchase_items, purchases, batches, product_units, products, customers, suppliers, sessions, users, stores CASCADE;
    `);

	console.log('Seeding database...');

	// 1. Store
	const storeId = uuidv4();
	await db.insert(storesTable).values({
		id: storeId,
		name: 'Main Medical Store',
		address: '123 Health Ave, Medical District',
		phone: '9876543210',
		email: 'contact@mainmedical.com',
		gstin: '29ABCDE1234F1Z5',
		drugLicenseNo: 'DL-MAIN-001',
		drugLicenseNo2: 'DL-MAIN-002',
		invoicePrefix: 'INV',
		invoiceTerms: '1. Goods once sold will not be taken back.\n2. Consult doctor before using scheduled drugs.'
	});

	// 2. Users — admin, a biller for role testing, plus agent QA accounts
	await db.insert(usersTable).values([
		{
			storeId,
			name: 'System Admin',
			username: 'admin',
			passwordHash: masterPasswordHash,
			role: 'owner_admin'
		},
		{
			storeId,
			name: 'Counter Biller',
			username: 'biller',
			passwordHash: bcrypt.hashSync('biller123', 10),
			role: 'biller'
		},
		{
			storeId,
			name: 'QA Verify',
			username: 'qaverify',
			passwordHash: bcrypt.hashSync('Verify123!', 10),
			role: 'owner_admin'
		},
		{
			storeId,
			name: 'Atul Test',
			username: 'atul_admin',
			passwordHash: bcrypt.hashSync('mederp123', 10),
			role: 'owner_admin'
		}
	]);

	// 3. Suppliers
	const supplierIds: string[] = [];
	for (let i = 1; i <= 4; i++) {
		const sId = uuidv4();
		supplierIds.push(sId);
		await db.insert(suppliersTable).values({
			id: sId,
			storeId,
			name: `MedSupply Distributor ${i}`,
			contactPhone: `987654321${i}`,
			address: `Wholesale Market Block ${i}, City`,
			gstin: `29ABCDE1234F${i}Z${i}`
		});
	}

	// 4. Customers — one wholesale khata with credit limit, rest retail
	await db.insert(customersTable).values([
		{
			storeId,
			name: 'City Hospital Pharmacy',
			contactPhone: '9800000001',
			address: 'Station Road, City',
			gstin: '29AACCC1234H1ZK',
			customerType: 'wholesale',
			creditLimit: '50000.00'
		},
		{ storeId, name: 'Walk-in Regulars', contactPhone: '9800000002', customerType: 'retail' },
		{
			storeId,
			name: 'Ramesh Kumar',
			contactPhone: '9800000003',
			address: 'Gandhi Nagar',
			customerType: 'retail'
		},
		{
			storeId,
			name: 'Sunita Devi',
			contactPhone: '9800000004',
			customerType: 'retail',
			creditLimit: '2000.00'
		}
	]);

	// 5. Products + units + batches with FEFO-relevant edge cases
	for (let i = 0; i < PRODUCTS.length; i++) {
		const seed = PRODUCTS[i];
		const pId = uuidv4();
		await db.insert(productsTable).values({
			id: pId,
			storeId,
			name: seed.name,
			category: seed.category,
			manufacturer: seed.manufacturer,
			hsnCode: seed.hsn,
			gstRate: money(Number(seed.gst)),
			baseUnit:
				seed.kind === 'tablet'
					? 'Tablet'
					: seed.kind === 'bottle'
						? 'Bottle'
						: seed.kind === 'tube'
							? 'Tube'
							: 'Sachet',
			barcode: i % 3 === 0 ? `89${String(890000000000 + i * 7919).slice(0, 11)}` : null,
			reorderThreshold: money(i % 4 === 0 ? 50 : 20),
			drugSchedule: seed.drugSchedule || (seed.category === 'Antibiotic' ? 'H' : 'none')
		});

		if (seed.kind === 'tablet') {
			const looseRate = Math.round((seed.packMrp / 10) * 100) / 100;
			const looseWholesale = Math.round(((seed.packMrp * 0.85) / 10) * 100) / 100;
			await db.insert(productUnitsTable).values([
				{
					productId: pId,
					unitName: 'Tablet',
					conversionToBase: '1',
					retailPrice: money(looseRate),
					wholesalePrice: money(looseWholesale),
					isBaseUnit: true
				},
				{
					productId: pId,
					unitName: 'Strip',
					conversionToBase: '10',
					retailPrice: money(seed.packMrp),
					wholesalePrice: money(Math.round(seed.packMrp * 0.85 * 100) / 100),
					isBaseUnit: false
				}
			]);
		} else {
			await db.insert(productUnitsTable).values({
				productId: pId,
				unitName: seed.kind === 'bottle' ? 'Bottle' : seed.kind === 'tube' ? 'Tube' : 'Sachet',
				conversionToBase: '1',
				retailPrice: money(seed.packMrp),
				wholesalePrice: money(Math.round(seed.packMrp * 0.85 * 100) / 100),
				isBaseUnit: true
			});
		}

		// Batch plan: two healthy batches for everyone, then edge cases spread
		// across the catalog so inventory screens have expired / near-expiry /
		// low-stock / out-of-stock examples to render.
		interface BatchPlan {
			expiryOffsetDays: number;
			qty: number;
		}
		const plans: BatchPlan[] = [
			{ expiryOffsetDays: 400 + ((i * 53) % 300), qty: 300 + ((i * 97) % 250) },
			{ expiryOffsetDays: 150 + ((i * 31) % 200), qty: 200 + ((i * 61) % 180) }
		];
		if (i % 6 === 0) plans.unshift({ expiryOffsetDays: -90, qty: 80 }); // expired stock
		if (i % 5 === 0) plans.push({ expiryOffsetDays: 35, qty: 120 }); // near-expiry
		if (i === 7) plans.push({ expiryOffsetDays: 500, qty: 0 }); // out-of-stock
		if (i === 11 || i === 23) plans.push({ expiryOffsetDays: 600, qty: 6 }); // low-stock

		for (let j = 0; j < plans.length; j++) {
			const plan = plans[j];
			const batchId = uuidv4();
			const qty = plan.qty;
			await db.insert(batchesTable).values({
				id: batchId,
				productId: pId,
				batchNo: `B${String(i + 1).padStart(2, '0')}-${j + 1}${plan.expiryOffsetDays < 0 ? 'E' : ''}`,
				expiryDate: isoDate(plan.expiryOffsetDays),
				mrp: money(seed.packMrp),
				purchasePrice: money(Math.round(seed.packMrp * 0.62 * 100) / 100),
				quantityReceived: String(qty),
				quantityRemaining: String(qty),
				supplierId: supplierIds[j % supplierIds.length]
			});

			if (qty > 0) {
				await db.insert(batchStockEventsTable).values({
					batchId,
					delta: String(qty),
					eventType: 'purchase',
					reason: 'Opening stock',
					createdBy: null,
					originNode: 'store_server'
				});
			}
		}
	}

	// 6. Invoice numbering block for this node
	await db.insert(invoiceSequencesTable).values({
		storeId,
		nodeId: 'store_server',
		rangeStart: 1,
		rangeEnd: 1000000,
		nextValue: 1
	});

	console.log(
		`Database seeding complete: ${PRODUCTS.length} products, users admin/biller/qaverify/atul_admin.`
	);
	process.exit(0);
}

seedDb().catch((err) => {
	console.error('Seeding failed:', err);
	process.exit(1);
});
