import { createBackup } from '../src/lib/server/backup/engine.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
	console.log('======================================================================');
	console.log('  📦 MedStock ERP — Automated Database Backup Engine');
	console.log('======================================================================');
	console.log('⏳ Generating gzip-compressed PostgreSQL database snapshot...');

	const startTime = Date.now();
	try {
		const result = await createBackup();
		const duration = ((Date.now() - startTime) / 1000).toFixed(2);

		console.log('✅ Database dump completed successfully!');
		console.log(`📁 Backup File:     ${result.backup.filename}`);
		console.log(`📍 Full Path:       ${result.backup.path}`);
		console.log(`⚖️  Compressed Size: ${result.backup.sizeFormatted} (${result.backup.sizeBytes.toLocaleString()} bytes)`);
		console.log(`⏱️  Duration:        ${duration}s`);
		console.log(`🗄️  Total Retained:  ${result.totalRemaining} (Rolling 30-day retention)`);

		if (result.purgedFiles.length > 0) {
			console.log(`🧹 Purged ${result.purgedFiles.length} older backups:`);
			for (const p of result.purgedFiles) {
				console.log(`   - ${p}`);
			}
		}

		console.log('======================================================================');
		process.exit(0);
	} catch (err: any) {
		console.error('\n❌ Backup failed with error:', err.message);
		console.log('======================================================================');
		process.exit(1);
	}
}

main();
