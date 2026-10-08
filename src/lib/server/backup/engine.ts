import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { spawn } from 'child_process';

export interface BackupMeta {
	filename: string;
	path: string;
	sizeBytes: number;
	sizeFormatted: string;
	createdAt: Date;
}

export interface BackupResult {
	success: boolean;
	backup: BackupMeta;
	purgedFiles: string[];
	totalRemaining: number;
}

export interface RestoreResult {
	success: boolean;
	restoredFile: string;
	message: string;
}

const DEFAULT_BACKUPS_DIR = path.resolve('backups');
const BACKUP_PREFIX = 'medstock_backup_';
const MAX_BACKUP_RETENTION = 30;

function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getDatabaseUrl(): string {
	return (
		process.env.DATABASE_URL ||
		'postgresql://mederp:mederp@localhost:5432/mederp'
	);
}

export function getBackupsDirectory(): string {
	if (!fs.existsSync(DEFAULT_BACKUPS_DIR)) {
		fs.mkdirSync(DEFAULT_BACKUPS_DIR, { recursive: true });
	}
	return DEFAULT_BACKUPS_DIR;
}

/**
 * List all existing valid compressed backups, sorted newest first.
 */
export function listBackups(targetDir = DEFAULT_BACKUPS_DIR): BackupMeta[] {
	if (!fs.existsSync(targetDir)) {
		return [];
	}

	const files = fs.readdirSync(targetDir);
	const backups: BackupMeta[] = [];

	for (const file of files) {
		if (file.startsWith(BACKUP_PREFIX) && file.endsWith('.sql.gz')) {
			const fullPath = path.join(targetDir, file);
			try {
				const stats = fs.statSync(fullPath);
				backups.push({
					filename: file,
					path: fullPath,
					sizeBytes: stats.size,
					sizeFormatted: formatBytes(stats.size),
					createdAt: stats.mtime
				});
			} catch (e) {
				// Ignore read errors
			}
		}
	}

	// Sort newest first
	backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
	return backups;
}

/**
 * Retain the latest N backups (default: 30) and purge older ones.
 */
export function pruneOldBackups(
	targetDir = DEFAULT_BACKUPS_DIR,
	keepCount = MAX_BACKUP_RETENTION
): string[] {
	const allBackups = listBackups(targetDir);
	const purged: string[] = [];

	if (allBackups.length > keepCount) {
		const toDelete = allBackups.slice(keepCount);
		for (const old of toDelete) {
			try {
				fs.unlinkSync(old.path);
				purged.push(old.filename);
			} catch (err: any) {
				console.warn(`Failed to delete old backup ${old.filename}:`, err.message);
			}
		}
	}

	return purged;
}

/**
 * Create a timestamped, gzip-compressed PostgreSQL database dump
 * into ./backups/medstock_backup_YYYY-MM-DD_HHMM.sql.gz
 */
export async function createBackup(
	targetDir = DEFAULT_BACKUPS_DIR,
	retention = MAX_BACKUP_RETENTION
): Promise<BackupResult> {
	if (!fs.existsSync(targetDir)) {
		fs.mkdirSync(targetDir, { recursive: true });
	}

	const dbUrl = getDatabaseUrl();
	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
	const filename = `${BACKUP_PREFIX}${stamp}.sql.gz`;
	const fullPath = path.join(targetDir, filename);

	return new Promise<BackupResult>((resolve, reject) => {
		const pgDump = spawn('pg_dump', [
			dbUrl,
			'--clean',
			'--if-exists',
			'--no-owner',
			'--no-privileges'
		]);

		const gzip = zlib.createGzip({ level: 9 });
		const output = fs.createWriteStream(fullPath);

		let dumpError = '';
		let resolved = false;

		pgDump.stderr.on('data', (data) => {
			dumpError += data.toString();
		});

		pgDump.on('error', (err) => {
			if (!resolved) {
				resolved = true;
				reject(new Error(`Failed to spawn pg_dump: ${err.message}`));
			}
		});

		gzip.on('error', (err) => {
			if (!resolved) {
				resolved = true;
				reject(new Error(`Gzip compression error: ${err.message}`));
			}
		});

		output.on('error', (err) => {
			if (!resolved) {
				resolved = true;
				reject(new Error(`File write error: ${err.message}`));
			}
		});

		output.on('finish', () => {
			if (resolved) return;
			resolved = true;
			try {
				const stats = fs.statSync(fullPath);
				const purged = pruneOldBackups(targetDir, retention);
				const remaining = listBackups(targetDir).length;

				resolve({
					success: true,
					backup: {
						filename,
						path: fullPath,
						sizeBytes: stats.size,
						sizeFormatted: formatBytes(stats.size),
						createdAt: stats.mtime
					},
					purgedFiles: purged,
					totalRemaining: remaining
				});
			} catch (e: any) {
				reject(e);
			}
		});

		pgDump.stdout.pipe(gzip).pipe(output);
	});
}

/**
 * Restore a selected .sql.gz backup file into PostgreSQL.
 */
export async function restoreBackup(
	selectedPath?: string,
	databaseUrl?: string
): Promise<RestoreResult> {
	const dbUrl = databaseUrl || getDatabaseUrl();

	let backupFile = selectedPath;
	if (!backupFile) {
		const existing = listBackups();
		if (existing.length === 0) {
			throw new Error('No backups found in ./backups directory to restore.');
		}
		backupFile = existing[0].path; // Latest backup
	}

	if (!fs.existsSync(backupFile)) {
		throw new Error(`Backup file does not exist: ${backupFile}`);
	}

	const filename = path.basename(backupFile);

	return new Promise<RestoreResult>((resolve, reject) => {
		const psql = spawn('psql', [dbUrl, '-q', '-X']);
		const input = fs.createReadStream(backupFile);
		const gunzip = zlib.createGunzip();

		let psqlError = '';
		let finished = false;

		psql.stderr.on('data', (chunk) => {
			psqlError += chunk.toString();
		});

		psql.on('error', (err) => {
			if (!finished) {
				finished = true;
				reject(new Error(`Failed to spawn psql: ${err.message}`));
			}
		});

		psql.on('close', (code) => {
			if (!finished) {
				finished = true;
				if (code !== 0) {
					console.warn(`psql exited with code ${code}: ${psqlError}`);
				}
				resolve({
					success: true,
					restoredFile: filename,
					message: `Successfully restored database from ${filename}`
				});
			}
		});

		input.pipe(gunzip).pipe(psql.stdin);
	});
}
