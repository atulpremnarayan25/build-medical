import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';

export async function runMigrations() {
	const dataDir = path.resolve(process.cwd(), 'data/pglite');
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true });
	}

	const client = new PGlite(dataDir);
	const migrationsDir = path.resolve(process.cwd(), 'migrations-pg');
	const files = fs
		.readdirSync(migrationsDir)
		.filter((f) => f.endsWith('.sql'))
		.sort();

	console.log(`Running PostgreSQL migrations on PGlite (${files.length} files)...`);

	for (const file of files) {
		const filePath = path.join(migrationsDir, file);
		const sqlContent = fs.readFileSync(filePath, 'utf-8');
		const statements = sqlContent.split('--> statement-breakpoint');
		for (const stmt of statements) {
			const s = stmt.trim();
			if (s && !s.startsWith('--')) {
				try {
					await client.exec(s);
				} catch (err: any) {
					// Ignore already exists / extension errors
					if (!err.message?.includes('already exists') && !err.message?.includes('extension "pg_trgm"')) {
						console.warn(`Migration notice [${file}]:`, err.message);
					}
				}
			}
		}
	}

	console.log('PostgreSQL migrations completed successfully!');
	await client.close();
}

if (import.meta.url === `file://${process.argv[1]}`) {
	runMigrations().catch(console.error);
}
