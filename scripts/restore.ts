import { restoreBackup, listBackups } from '../src/lib/server/backup/engine.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function main() {
	console.log('======================================================================');
	console.log('  🔄 MedStock ERP — Automated Database Restore Engine');
	console.log('======================================================================');

	const argPath = process.argv[2];
	let targetPath = argPath ? path.resolve(argPath) : undefined;

	if (!targetPath) {
		const backups = listBackups();
		if (backups.length === 0) {
			console.error('❌ Error: No backups found in ./backups directory to restore.');
			process.exit(1);
		}
		targetPath = backups[0].path;
		console.log(`ℹ️  No backup specified. Using latest snapshot: ${backups[0].filename}`);
	} else {
		console.log(`ℹ️  Restoring specified backup: ${path.basename(targetPath)}`);
	}

	console.log('⏳ Decompressing and restoring database snapshot into PostgreSQL...');
	const startTime = Date.now();

	try {
		const result = await restoreBackup(targetPath);
		const duration = ((Date.now() - startTime) / 1000).toFixed(2);

		console.log(`✅ ${result.message}`);
		console.log(`⏱️  Duration: ${duration}s`);
		console.log('======================================================================');
		process.exit(0);
	} catch (err: any) {
		console.error('\n❌ Database restore failed:', err.message);
		console.log('======================================================================');
		process.exit(1);
	}
}

main();
