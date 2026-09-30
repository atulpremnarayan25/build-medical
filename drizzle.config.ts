import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './migrations-pg',
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DATABASE_URL || 'postgresql://mederp:mederp@localhost:5432/mederp'
	},
	verbose: true,
	strict: true
});
