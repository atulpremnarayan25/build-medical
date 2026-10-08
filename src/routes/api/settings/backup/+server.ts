import type { RequestHandler } from './$types.js';
import { jsonResponse, errorResponse } from '$lib/server/apiUtils.js';
import { createBackup, listBackups } from '$lib/server/backup/engine.js';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const backups = listBackups();
		return jsonResponse({ backups });
	} catch (err: any) {
		console.error('Failed to list backups:', err);
		return errorResponse('BACKUP_LIST_ERROR', err.message || 'Failed to list backups', 500);
	}
};

export const POST: RequestHandler = async ({ locals }) => {
	try {
		const result = await createBackup();
		return jsonResponse(result);
	} catch (err: any) {
		console.error('Failed to create backup:', err);
		return errorResponse('BACKUP_CREATE_ERROR', err.message || 'Failed to create database backup', 500);
	}
};
