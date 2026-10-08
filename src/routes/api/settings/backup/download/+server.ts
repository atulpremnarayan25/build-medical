import type { RequestHandler } from './$types.js';
import { errorResponse } from '$lib/server/apiUtils.js';
import { listBackups } from '$lib/server/backup/engine.js';
import fs from 'fs';
import path from 'path';

export const GET: RequestHandler = async ({ url, locals }) => {
	const requestedFilename = url.searchParams.get('file');

	const backups = listBackups();
	let targetBackup = backups[0]; // Default to latest

	if (requestedFilename) {
		const safeName = path.basename(requestedFilename);
		const found = backups.find((b) => b.filename === safeName);
		if (!found) {
			return errorResponse('BACKUP_NOT_FOUND', 'Requested backup file does not exist', 404);
		}
		targetBackup = found;
	}

	if (!targetBackup || !fs.existsSync(targetBackup.path)) {
		return errorResponse('BACKUP_NOT_FOUND', 'No backup files available for download', 404);
	}

	const stats = fs.statSync(targetBackup.path);
	const nodeStream = fs.createReadStream(targetBackup.path);
	const webStream = new ReadableStream({
		start(controller) {
			nodeStream.on('data', (chunk) => controller.enqueue(chunk));
			nodeStream.on('end', () => controller.close());
			nodeStream.on('error', (err) => controller.error(err));
		}
	});

	return new Response(webStream, {
		status: 200,
		headers: {
			'Content-Type': 'application/gzip',
			'Content-Disposition': `attachment; filename="${targetBackup.filename}"`,
			'Content-Length': stats.size.toString(),
			'Cache-Control': 'no-cache'
		}
	});
};
