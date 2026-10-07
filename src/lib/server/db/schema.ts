import { sql } from 'drizzle-orm';
import {
	pgTable,
	uuid,
	text,
	boolean,
	integer,
	bigint,
	numeric,
	date,
	timestamp,
	jsonb,
	index,
	uniqueIndex
} from 'drizzle-orm/pg-core';

/**
 * PostgreSQL schema — implements build-med-plans/06-Backend-Schema.md v1.0.
 *
 * Conventions (spec §0):
 * - UUID primary keys everywhere (two nodes create rows independently).
 * - Sync columns on every syncable business table: updated_at, origin_node,
 *   sync_version, is_deleted. Soft delete only — nothing is hard-deleted.
 * - Money/quantity columns are NUMERIC, never FLOAT.
 *
 * Interpretation notes (documented deviations, see hive memory):
 * - Tables the spec leaves ambiguous get created_at + sync columns anyway
 *   (products, product_units, batches, suppliers, customers, purchases,
 *   purchase_items, sales, sale_items, payments, returns, return_items).
 *   Post-Phase-5 schema changes migrate two live databases; adding these now
 *   is cheaper than a coordinated migration later.
 * - stores/users follow the spec literally (created_at only) for v1.
 * - sessions is NOT in the spec: node-local ephemeral auth state, never synced.
 */

/** Which node created/last touched a row. */
export const ORIGIN_NODES = ['store_server', 'cloud'] as const;

const syncColumns = {
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	originNode: text('origin_node').notNull().default('store_server'),
	syncVersion: integer('sync_version').notNull().default(1),
	isDeleted: boolean('is_deleted').notNull().default(false)
};

const createdAt = {
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
};

/** §1 stores — forward-compatibility; v1 assumes exactly one row. */
export const storesTable = pgTable('stores', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	address: text('address'),
	phone: text('phone'),
	email: text('email'),
	gstin: text('gstin'),
	drugLicenseNo: text('drug_license_no'),
	drugLicenseNo2: text('drug_license_no_2'),
	invoicePrefix: text('invoice_prefix').default('INV'),
	invoiceTerms: text('invoice_terms'),
	...createdAt
});

/** §2 users */
export const usersTable = pgTable(
	'users',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		storeId: uuid('store_id')
			.notNull()
			.references(() => storesTable.id),
		name: text('name').notNull(),
		username: text('username').notNull().unique(),
		passwordHash: text('password_hash').notNull(),
		role: text('role').notNull(), // 'owner_admin' | 'biller' (v1.1: 'manager')
		isActive: boolean('is_active').notNull().default(true),
		...createdAt
	},
	(t) => [uniqueIndex('users_username_uq').on(t.username)]
);

/**
 * Node-local session store — intentionally absent from the sync spec.
 * Sessions are ephemeral per-node auth state; replicating them would let a
 * session issued on one node authenticate on another after a partition.
 */
export const sessionsTable = pgTable(
	'sessions',
	{
		id: text('id').primaryKey(), // 32-byte random hex from the auth module
		userId: uuid('user_id')
			.notNull()
			.references(() => usersTable.id, { onDelete: 'cascade' }),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		...createdAt
	},
	(t) => [index('sessions_user_id_idx').on(t.userId)]
);

/** §3 products */
export const productsTable = pgTable(
	'products',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		storeId: uuid('store_id')
			.notNull()
			.references(() => storesTable.id),
		name: text('name').notNull(),
		category: text('category'),
		manufacturer: text('manufacturer'),
		hsnCode: text('hsn_code'),
		gstRate: numeric('gst_rate').notNull().default('0'), // percentage, e.g. 12.00
		baseUnit: text('base_unit').notNull().default('Unit'),
		barcode: text('barcode'),
		genericName: text('generic_name'),
		mrp: numeric('mrp').notNull().default('0'),
		sellingRate: numeric('selling_rate').notNull().default('0'),
		purchaseRate: numeric('purchase_rate').notNull().default('0'),
		packSize: integer('pack_size').notNull().default(1),
		drugSchedule: text('drug_schedule').notNull().default('none'),

		reorderThreshold: numeric('reorder_threshold'),
		isActive: boolean('is_active').notNull().default(true),
		...createdAt,
		...syncColumns
	},
	(t) => [
		index('products_name_trgm_idx').using('gin', sql`${t.name} gin_trgm_ops`),
		uniqueIndex('products_barcode_uq')
			.on(t.barcode)
			.where(sql`barcode IS NOT NULL`)
	]
);

/** §4 product_units — multi-unit conversion (Strip/Box/Tablet). */
export const productUnitsTable = pgTable(
	'product_units',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		productId: uuid('product_id')
			.notNull()
			.references(() => productsTable.id, { onDelete: 'cascade' }),
		unitName: text('unit_name').notNull(),
		conversionToBase: numeric('conversion_to_base').notNull(),
		wholesalePrice: numeric('wholesale_price').notNull().default('0'),
		retailPrice: numeric('retail_price').notNull().default('0'),
		isBaseUnit: boolean('is_base_unit').notNull().default(false),
		...createdAt,
		...syncColumns
	},
	(t) => [
		uniqueIndex('product_units_base_uq')
			.on(t.productId)
			.where(sql`is_base_unit`),
		index('product_units_product_idx').on(t.productId)
	]
);

/** §5 batches — quantity_remaining is a maintained cache of batch_stock_events. */
export const batchesTable = pgTable(
	'batches',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		productId: uuid('product_id')
			.notNull()
			.references(() => productsTable.id),
		batchNo: text('batch_no').notNull(),
		expiryDate: date('expiry_date', { mode: 'string' }).notNull(),
		mrp: numeric('mrp').notNull().default('0'),
		purchasePrice: numeric('purchase_price').notNull().default('0'),
		quantityReceived: numeric('quantity_received').notNull().default('0'),
		quantityRemaining: numeric('quantity_remaining').notNull().default('0'),
		supplierId: uuid('supplier_id').references(() => suppliersTable.id),
		purchaseId: uuid('purchase_id').references(() => purchasesTable.id),
		...createdAt,
		...syncColumns
	},
	(t) => [
		index('batches_product_expiry_idx').on(t.productId, t.expiryDate), // THE FEFO query
		index('batches_expiry_idx').on(t.expiryDate)
	]
);

/** §6 batch_stock_events — append-only source of truth for stock. */
export const batchStockEventsTable = pgTable(
	'batch_stock_events',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		batchId: uuid('batch_id')
			.notNull()
			.references(() => batchesTable.id),
		delta: numeric('delta').notNull(), // positive in, negative out
		eventType: text('event_type').notNull(), // purchase|sale|sales_return|purchase_return|adjustment
		referenceId: uuid('reference_id'), // polymorphic — no FK by design
		reason: text('reason'), // required when event_type = 'adjustment'
		createdBy: uuid('created_by').references(() => usersTable.id),
		originNode: text('origin_node').notNull().default('store_server'),
		...createdAt
	},
	(t) => [index('batch_stock_events_batch_created_idx').on(t.batchId, t.createdAt)]
);

/** §7 suppliers — payable balance is derived, never stored. */
export const suppliersTable = pgTable(
	'suppliers',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		storeId: uuid('store_id')
			.notNull()
			.references(() => storesTable.id),
		name: text('name').notNull(),
		contactPhone: text('contact_phone'),
		address: text('address'),
		gstin: text('gstin'),
		isActive: boolean('is_active').notNull().default(true),
		...createdAt,
		...syncColumns
	},
	(t) => [index('suppliers_store_name_idx').on(t.storeId, t.name)]
);

/** §8 customers — khata balance is derived, never stored. */
export const customersTable = pgTable(
	'customers',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		storeId: uuid('store_id')
			.notNull()
			.references(() => storesTable.id),
		name: text('name').notNull(),
		contactPhone: text('contact_phone'),
		address: text('address'),
		gstin: text('gstin'), // wholesale/B2B only
		customerType: text('customer_type').notNull().default('retail'), // wholesale|retail
		creditLimit: numeric('credit_limit'),
		isActive: boolean('is_active').notNull().default(true),
		...createdAt,
		...syncColumns
	},
	(t) => [index('customers_store_name_idx').on(t.storeId, t.name)]
);

/** §9 purchases + purchase_items */
export const purchasesTable = pgTable(
	'purchases',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		storeId: uuid('store_id')
			.notNull()
			.references(() => storesTable.id),
		supplierId: uuid('supplier_id')
			.notNull()
			.references(() => suppliersTable.id),
		supplierInvoiceRef: text('supplier_invoice_ref').notNull(),
		supplierInvoiceDate: date('supplier_invoice_date', { mode: 'string' }),
		totalAmount: numeric('total_amount').notNull().default('0'),
		createdBy: uuid('created_by').references(() => usersTable.id),
		...createdAt,
		...syncColumns
	},
	(t) => [
		index('purchases_supplier_idx').on(t.supplierId),
		index('purchases_created_idx').on(t.createdAt)
	]
);

export const purchaseItemsTable = pgTable(
	'purchase_items',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		purchaseId: uuid('purchase_id')
			.notNull()
			.references(() => purchasesTable.id, { onDelete: 'cascade' }),
		batchId: uuid('batch_id')
			.notNull()
			.references(() => batchesTable.id),
		quantity: numeric('quantity').notNull(),
		purchasePrice: numeric('purchase_price').notNull().default('0'),
		...createdAt,
		...syncColumns
	},
	(t) => [index('purchase_items_purchase_idx').on(t.purchaseId)]
);

/** §10 sales + sale_items */
export const salesTable = pgTable(
	'sales',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		storeId: uuid('store_id')
			.notNull()
			.references(() => storesTable.id),
		invoiceNumber: text('invoice_number').notNull().unique(),
		customerId: uuid('customer_id').references(() => customersTable.id), // nullable: anonymous walk-in
		patientName: text('patient_name'), // Rule 65 statutory patient details
		prescriberName: text('prescriber_name'), // Rule 65 prescribing doctor
		prescriberRegNo: text('prescriber_reg_no'), // Rule 65 doctor medical registration number
		notes: text('notes'),
		saleType: text('sale_type').notNull().default('retail'), // wholesale|retail
		subtotal: numeric('subtotal').notNull().default('0'),
		gstAmount: numeric('gst_amount').notNull().default('0'),
		totalAmount: numeric('total_amount').notNull().default('0'),
		amountPaidAtSale: numeric('amount_paid_at_sale').notNull().default('0'),
		paymentStatus: text('payment_status').notNull().default('paid'), // paid|partial|credit
		createdBy: uuid('created_by').references(() => usersTable.id),
		...createdAt,
		...syncColumns
	},
	(t) => [
		index('sales_customer_created_idx').on(t.customerId, t.createdAt), // khata ledger views
		index('sales_created_idx').on(t.createdAt)
	]
);

export const saleItemsTable = pgTable(
	'sale_items',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		saleId: uuid('sale_id')
			.notNull()
			.references(() => salesTable.id, { onDelete: 'cascade' }),
		productId: uuid('product_id')
			.notNull()
			.references(() => productsTable.id),
		batchId: uuid('batch_id')
			.notNull()
			.references(() => batchesTable.id),
		unitId: uuid('unit_id')
			.notNull()
			.references(() => productUnitsTable.id),
		quantity: numeric('quantity').notNull(), // in the sold unit
		rate: numeric('rate').notNull(), // price snapshot at sale time
		gstRate: numeric('gst_rate').notNull().default('0'), // snapshot
		lineTotal: numeric('line_total').notNull().default('0'),
		schemeApplied: text('scheme_applied'), // e.g. "10+1 free"
		...createdAt,
		...syncColumns
	},
	(t) => [index('sale_items_sale_idx').on(t.saleId)]
);

/** §11 payments — both directions in one table.
 * Spec omits sync columns here, but §0 mandates them on every syncable table;
 * offline khata/supplier payments must replicate or balances diverge. */
export const paymentsTable = pgTable(
	'payments',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		storeId: uuid('store_id')
			.notNull()
			.references(() => storesTable.id),
		direction: text('direction').notNull(), // customer_payment|supplier_payment
		customerId: uuid('customer_id').references(() => customersTable.id),
		supplierId: uuid('supplier_id').references(() => suppliersTable.id),
		amount: numeric('amount').notNull(),
		method: text('method').notNull().default('cash'), // cash|upi|bank_transfer|other
		relatedSaleId: uuid('related_sale_id').references(() => salesTable.id),
		notes: text('notes'),
		createdBy: uuid('created_by').references(() => usersTable.id),
		...createdAt,
		...syncColumns
	},
	(t) => [
		index('payments_customer_idx').on(t.customerId),
		index('payments_supplier_idx').on(t.supplierId),
		index('payments_created_idx').on(t.createdAt)
	]
);

/** §12 returns + return_items — same sync rationale as payments. */
export const returnsTable = pgTable('returns', {
	id: uuid('id').primaryKey().defaultRandom(),
	returnType: text('return_type').notNull(), // sales_return|purchase_return
	originalSaleId: uuid('original_sale_id').references(() => salesTable.id),
	originalPurchaseId: uuid('original_purchase_id').references(() => purchasesTable.id),
	reason: text('reason').notNull(),
	approvedBy: uuid('approved_by').references(() => usersTable.id),
	createdBy: uuid('created_by').references(() => usersTable.id),
	...createdAt,
	...syncColumns
});

export const returnItemsTable = pgTable(
	'return_items',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		returnId: uuid('return_id')
			.notNull()
			.references(() => returnsTable.id, { onDelete: 'cascade' }),
		batchId: uuid('batch_id')
			.notNull()
			.references(() => batchesTable.id),
		quantity: numeric('quantity').notNull(),
		lineAmount: numeric('line_amount').notNull().default('0'),
		...createdAt,
		...syncColumns
	},
	(t) => [index('return_items_return_idx').on(t.returnId)]
);

/** §13 invoice_sequences — per-node number ranges; no two nodes collide. */
export const invoiceSequencesTable = pgTable('invoice_sequences', {
	id: uuid('id').primaryKey().defaultRandom(),
	storeId: uuid('store_id')
		.notNull()
		.references(() => storesTable.id),
	nodeId: text('node_id').notNull(),
	rangeStart: bigint('range_start', { mode: 'number' }).notNull(),
	rangeEnd: bigint('range_end', { mode: 'number' }).notNull(),
	nextValue: bigint('next_value', { mode: 'number' }).notNull(),
	allocatedAt: timestamp('allocated_at', { withTimezone: true }).notNull().defaultNow()
});

/** §14 audit_log */
export const auditLogTable = pgTable(
	'audit_log',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		storeId: uuid('store_id')
			.notNull()
			.references(() => storesTable.id),
		entityType: text('entity_type').notNull(),
		entityId: uuid('entity_id').notNull(),
		action: text('action').notNull(), // create|update|delete|adjust|approve
		performedBy: uuid('performed_by').references(() => usersTable.id),
		beforeValue: jsonb('before_value'),
		afterValue: jsonb('after_value'),
		...createdAt
	},
	(t) => [
		index('audit_log_entity_idx').on(t.entityType, t.entityId),
		index('audit_log_created_idx').on(t.createdAt)
	]
);

/** §15 settings — key-value config scoped per store. */
export const settingsTable = pgTable(
	'settings',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		storeId: uuid('store_id')
			.notNull()
			.references(() => storesTable.id),
		key: text('key').notNull(),
		value: jsonb('value').notNull()
	},
	(t) => [uniqueIndex('settings_store_key_uq').on(t.storeId, t.key)]
);

/** §16 sync_outbox — every business write logs an entry in the same transaction. */
export const syncOutboxTable = pgTable(
	'sync_outbox',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		tableName: text('table_name').notNull(),
		rowId: uuid('row_id').notNull(),
		operation: text('operation').notNull(), // insert|update|delete
		payload: jsonb('payload').notNull(),
		targetNode: text('target_node').notNull(),
		sentAt: timestamp('sent_at', { withTimezone: true }), // null = still pending
		...createdAt
	},
	(t) => [
		index('sync_outbox_pending_idx')
			.on(t.targetNode, t.sentAt)
			.where(sql`sent_at IS NULL`)
	]
);

// Row types (for services/repositories building on this schema)
export type Store = typeof storesTable.$inferSelect;
export type User = typeof usersTable.$inferSelect;
export type Session = typeof sessionsTable.$inferSelect;
export type Product = typeof productsTable.$inferSelect;
export type ProductUnit = typeof productUnitsTable.$inferSelect;
export type Batch = typeof batchesTable.$inferSelect;
export type BatchStockEvent = typeof batchStockEventsTable.$inferSelect;
export type Supplier = typeof suppliersTable.$inferSelect;
export type Customer = typeof customersTable.$inferSelect;
export type Purchase = typeof purchasesTable.$inferSelect;
export type PurchaseItem = typeof purchaseItemsTable.$inferSelect;
export type Sale = typeof salesTable.$inferSelect;
export type SaleItem = typeof saleItemsTable.$inferSelect;
export type Payment = typeof paymentsTable.$inferSelect;
export type Return = typeof returnsTable.$inferSelect;
export type ReturnItem = typeof returnItemsTable.$inferSelect;
export type InvoiceSequence = typeof invoiceSequencesTable.$inferSelect;
export type AuditLogEntry = typeof auditLogTable.$inferSelect;
export type Setting = typeof settingsTable.$inferSelect;
export type SyncOutboxEntry = typeof syncOutboxTable.$inferSelect;
