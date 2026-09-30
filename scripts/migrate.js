import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import path from 'path';

const sqlite = new Database('local_dev.db');
const db = drizzle(sqlite);

console.log('Running migrations...');
migrate(db, { migrationsFolder: path.resolve('migrations') });
console.log('Migrations complete!');
sqlite.close();
