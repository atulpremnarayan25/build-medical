import { db } from '../src/lib/server/db/index.js';
import { productsTable } from '../src/lib/server/db/schema.js';
import { count } from 'drizzle-orm';
import { execSync } from 'child_process';
import path from 'path';

async function main() {
	try {
		console.log('🔍 Checking database connection and seed status...');
		const [result] = await db.select({ total: count() }).from(productsTable);
		const productCount = Number(result?.total || 0);

		console.log(`📊 Found ${productCount} existing products in database.`);
		if (productCount === 0) {
			console.log('🌱 Database is empty. Seeding essential pharmaceutical dataset...');
			const seedScript = path.resolve('scripts/seed.ts');
			execSync(`npx tsx "${seedScript}"`, { stdio: 'inherit' });
			console.log('✅ Initial seed completed successfully.');
		} else {
			console.log('✅ Database already contains data. Skipping seed.');
		}
		process.exit(0);
	} catch (err: any) {
		console.error('❌ Database connection or seed check failed:', err.message);
		process.exit(1);
	}
}

main();
