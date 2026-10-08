import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import { json } from '@sveltejs/kit';

function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds: number): string {
	const days = Math.floor(seconds / 86400);
	const hrs = Math.floor((seconds % 86400) / 3600);
	const mins = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);
	if (days > 0) return `${days}d ${hrs}h ${mins}m ${secs}s`;
	if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
	if (mins > 0) return `${mins}m ${secs}s`;
	return `${secs}s`;
}

export const GET: RequestHandler = async () => {
	const startTime = performance.now();
	let dbHealthy = false;
	let dbLatencyMs = -1;
	let dbError: string | null = null;

	try {
		const dbPingStart = performance.now();
		await db.execute(sql`SELECT 1`);
		dbLatencyMs = Math.round((performance.now() - dbPingStart) * 100) / 100;
		dbHealthy = true;
	} catch (err: any) {
		dbHealthy = false;
		dbError = err.message || 'Database connection error';
	}

	// Storage metrics via fs.statfsSync
	let storageInfo: any = null;
	try {
		const stats = fs.statfsSync('.');
		const totalBytes = stats.bsize * stats.blocks;
		const freeBytes = stats.bsize * stats.bavail;
		const usedBytes = totalBytes - freeBytes;
		const usedPercent = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;

		storageInfo = {
			totalBytes,
			freeBytes,
			usedBytes,
			usedPercent,
			totalFormatted: formatBytes(totalBytes),
			freeFormatted: formatBytes(freeBytes),
			usedFormatted: formatBytes(usedBytes)
		};
	} catch (e: any) {
		storageInfo = { error: 'Failed to inspect filesystem stats' };
	}

	const uptimeSeconds = Math.floor(process.uptime());
	const status = dbHealthy ? 'healthy' : 'degraded';
	const statusCode = dbHealthy ? 200 : 503;

	return json(
		{
			status,
			timestamp: new Date().toISOString(),
			uptime: {
				seconds: uptimeSeconds,
				formatted: formatUptime(uptimeSeconds)
			},
			database: {
				status: dbHealthy ? 'connected' : 'disconnected',
				latencyMs: dbLatencyMs,
				error: dbError
			},
			storage: storageInfo,
			offlineOperation: {
				zeroInternetReady: true,
				localDatabaseAuthoritative: true,
				mode: 'standalone-lan-appliance'
			},
			process: {
				pid: process.pid,
				nodeVersion: process.version,
				memoryUsage: process.memoryUsage()
			}
		},
		{ status: statusCode }
	);
};
