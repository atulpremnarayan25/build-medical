import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

/**
 * PostgreSQL connection (Store Server / Cloud share this schema — spec §0).
 *
 * DATABASE_URL must be set in production. The localhost fallback exists so
 * `npm run dev` works out of the box against a local instance created with:
 *   createuser -s mederp && createdb -O mederp mederp
 * Migrations: npx drizzle-kit migrate (see migrations-pg/).
 */
const connectionString = process.env.DATABASE_URL || 'postgresql://mederp@localhost:5432/mederp';

const client = postgres(connectionString, {
	// SvelteKit dev server needs this to avoid holding connections across HMR reloads
	max: 10,
	idle_timeout: 20,
	connect_timeout: 10
});

export const db = drizzle(client, { schema });
