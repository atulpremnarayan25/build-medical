import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import postgres from 'postgres';
import * as schema from './schema.js';
import fs from 'fs';
import path from 'path';

declare global {
	// eslint-disable-next-line no-var
	var __pglite_client__: PGlite | undefined;
	// eslint-disable-next-line no-var
	var __db_instance__: any;
}

/**
 * PostgreSQL connection (Store Server / Cloud share this schema — spec §0).
 *
 * Uses standalone PostgreSQL when DATABASE_URL is configured,
 * or embedded persistent PGlite for frictionless local development.
 */
if (!globalThis.__db_instance__) {
	const connectionString = process.env.DATABASE_URL;
	if (connectionString && !connectionString.includes('localhost:5432/mederp')) {
		const client = postgres(connectionString, {
			max: 10,
			idle_timeout: 20,
			connect_timeout: 10
		});
		globalThis.__db_instance__ = drizzlePg(client, { schema });
	} else {
		const dataDir = path.resolve(process.cwd(), 'data/pglite');
		if (!fs.existsSync(dataDir)) {
			fs.mkdirSync(dataDir, { recursive: true });
		}
		if (!globalThis.__pglite_client__) {
			globalThis.__pglite_client__ = new PGlite(dataDir);
		}
		globalThis.__db_instance__ = drizzlePglite(globalThis.__pglite_client__, { schema });
	}
}

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export const db = globalThis.__db_instance__ as PostgresJsDatabase<typeof schema>;

