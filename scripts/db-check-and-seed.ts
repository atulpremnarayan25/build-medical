import { db } from '../src/lib/server/db/index.js';
import { productsTable, usersTable } from '../src/lib/server/db/schema.js';
import { count } from 'drizzle-orm';

async function main() {
	try {
		console.log('🔍 Checking database connection and store status...');
		const [prodResult] = await db.select({ total: count() }).from(productsTable);
		const productCount = Number(prodResult?.total || 0);

		const [userResult] = await db.select({ total: count() }).from(usersTable);
		const userCount = Number(userResult?.total || 0);

		console.log(`📊 Found ${productCount} existing products, ${userCount} registered users.`);

		if (userCount === 0) {
			console.log('⚠️  No store users found.');
			console.log('👉 First-run setup: Visit /register to create the initial Store Owner account.');
		} else {
			console.log('✅ Store database is initialized and ready.');
		}
		process.exit(0);
	} catch (err: any) {
		console.error('❌ Database connection or store check failed:', err.message);
		process.exit(1);
	}
}

main();
