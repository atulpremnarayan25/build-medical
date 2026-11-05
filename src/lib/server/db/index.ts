import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

/**
 * PostgreSQL connection (Store Server / Cloud share this schema — spec §0).
 *
 * Connection pooling is tuned for high concurrency, preventing connection exhaustion
 * while keeping latency minimal with idle connection recycling.
 */
const connectionString = process.env.DATABASE_URL || 'postgresql://mederp@localhost:5432/mederp';

const client = postgres(connectionString, {
	max: Number(process.env.DB_POOL_MAX) || (process.env.NODE_ENV === 'production' ? 20 : 10),
	idle_timeout: Number(process.env.DB_IDLE_TIMEOUT) || 20,
	connect_timeout: Number(process.env.DB_CONNECT_TIMEOUT) || 10,
	max_lifetime: 60 * 30, // 30 minutes connection recycling to prevent stale pool connections
	onnotice: () => {} // Silence notice noise
});

export const db = drizzle(client, { schema });
