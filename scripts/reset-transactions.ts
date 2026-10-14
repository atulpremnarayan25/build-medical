import { db } from '../src/lib/server/db/index.js';
import { sql } from 'drizzle-orm';

async function resetTransactions() {
	console.log('🔄 Starting reset of all sales and purchases...');

	await db.transaction(async (tx) => {
		// 1. Delete return items and returns
		const resReturnItems = await tx.execute(sql`DELETE FROM return_items`);
		const resReturns = await tx.execute(sql`DELETE FROM returns`);
		console.log('✓ Cleared returns & return items');

		// 2. Delete customer / supplier transaction payments
		const resPayments = await tx.execute(sql`DELETE FROM payments`);
		console.log('✓ Cleared transaction payments');

		// 3. Delete sale items and sales
		const resSaleItems = await tx.execute(sql`DELETE FROM sale_items`);
		const resSales = await tx.execute(sql`DELETE FROM sales`);
		console.log('✓ Cleared sales & sale items');

		// 4. Delete purchase items
		const resPurchaseItems = await tx.execute(sql`DELETE FROM purchase_items`);
		console.log('✓ Cleared purchase items');

		// 5. Delete stock events for batches created by purchases
		await tx.execute(sql`
			DELETE FROM batch_stock_events
			WHERE batch_id IN (SELECT id FROM batches WHERE purchase_id IS NOT NULL)
		`);

		// 6. Delete remaining sales/returns transaction stock events (keep opening stock and baseline inventory)
		await tx.execute(sql`
			DELETE FROM batch_stock_events
			WHERE event_type IN ('sale', 'purchase', 'sales_return', 'purchase_return')
			  AND reason NOT LIKE 'Opening stock%'
		`);
		console.log('✓ Cleared non-opening stock events');

		// 7. Delete batches created by purchases
		await tx.execute(sql`
			DELETE FROM batches WHERE purchase_id IS NOT NULL
		`);
		console.log('✓ Cleared purchase-inwarded batches');

		// 8. Delete purchases
		const resPurchases = await tx.execute(sql`DELETE FROM purchases`);
		console.log('✓ Cleared purchases');

		// 9. Recalculate and restore quantity_remaining for all remaining opening stock batches
		await tx.execute(sql`
			UPDATE batches b
			SET quantity_remaining = COALESCE(
				(SELECT SUM(delta::numeric) FROM batch_stock_events bse WHERE bse.batch_id = b.id),
				b.quantity_received
			)
		`);
		console.log('✓ Restored opening stock quantities across catalog');

		// 10. Clean up transaction entries from sync outbox
		await tx.execute(sql`
			DELETE FROM sync_outbox
			WHERE table_name IN ('sales', 'sale_items', 'purchases', 'purchase_items', 'returns', 'return_items', 'payments')
		`);
		console.log('✓ Cleaned sync outbox transaction queue');

		// 11. Reset invoice sequence counters to 1
		await tx.execute(sql`
			UPDATE invoice_sequences
			SET next_value = 1
		`);
		console.log('✓ Reset invoice number sequences to 1');
	});

	// Final verification counts
	const [sales] = await db.execute(sql`SELECT count(*) FROM sales`);
	const [purchases] = await db.execute(sql`SELECT count(*) FROM purchases`);
	const [returns] = await db.execute(sql`SELECT count(*) FROM returns`);
	const [payments] = await db.execute(sql`SELECT count(*) FROM payments`);
	const [batches] = await db.execute(sql`SELECT count(*) FROM batches`);
	const [products] = await db.execute(sql`SELECT count(*) FROM products`);
	const [suppliers] = await db.execute(sql`SELECT count(*) FROM suppliers`);
	const [customers] = await db.execute(sql`SELECT count(*) FROM customers`);

	console.log('\n📊 Database Status After Reset:');
	console.log(`- Sales: ${sales.count}`);
	console.log(`- Purchases: ${purchases.count}`);
	console.log(`- Returns: ${returns.count}`);
	console.log(`- Payments: ${payments.count}`);
	console.log(`- Active Catalog Batches: ${batches.count}`);
	console.log(`- Preserved Products: ${products.count}`);
	console.log(`- Preserved Suppliers: ${suppliers.count}`);
	console.log(`- Preserved Customers: ${customers.count}`);
	console.log('\n✅ Sales and purchases have been completely reset.');
}

resetTransactions()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error('❌ Failed to reset transactions:', err);
		process.exit(1);
	});
