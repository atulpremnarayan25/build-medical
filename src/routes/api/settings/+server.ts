import { db } from '$lib/server/db/index.js';
import { storesTable } from '$lib/server/db/schema.js';
import { jsonResponse, errorResponse } from '$lib/server/apiUtils.js';
import { eq } from 'drizzle-orm';
import type { RequestEvent } from './$types.js';

export async function GET({ locals }: RequestEvent) {
	try {
		if (!locals.user) {
			return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
		}

		let store = await db.query.storesTable.findFirst({
			where: eq(storesTable.id, locals.user.storeId)
		});

		if (!store) {
			store = await db.query.storesTable.findFirst();
		}

		if (!store) {
			return errorResponse('NOT_FOUND', 'Store not found', 404);
		}

		return jsonResponse(store);
	} catch (err: any) {
		return errorResponse('INTERNAL_ERROR', err.message, 500);
	}
}

export async function POST({ locals, request }: RequestEvent) {
	try {
		if (!locals.user) {
			return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
		}

		const body = await request.json();
		const storeId = locals.user.storeId;

		let store = await db.query.storesTable.findFirst({
			where: eq(storesTable.id, storeId)
		});

		if (!store) {
			store = await db.query.storesTable.findFirst();
		}

		const dl1 = body.drugLicenseNo !== undefined ? body.drugLicenseNo : body.drugLicense;
		const dl2 = body.drugLicenseNo2 !== undefined ? body.drugLicenseNo2 : body.drugLicense2;
		const prefix = body.invoicePrefix !== undefined ? body.invoicePrefix : body.prefix;
		const terms = body.invoiceTerms !== undefined ? body.invoiceTerms : body.terms;

		const updateData: Record<string, any> = {};
		if (body.name !== undefined) updateData.name = String(body.name).trim();
		if (body.address !== undefined) updateData.address = String(body.address).trim();
		if (body.phone !== undefined) updateData.phone = String(body.phone).trim();
		if (body.email !== undefined) updateData.email = String(body.email).trim();
		if (body.gstin !== undefined) updateData.gstin = String(body.gstin).trim();
		if (dl1 !== undefined) updateData.drugLicenseNo = String(dl1).trim();
		if (dl2 !== undefined) updateData.drugLicenseNo2 = String(dl2).trim();
		if (prefix !== undefined) updateData.invoicePrefix = String(prefix).trim();
		if (terms !== undefined) updateData.invoiceTerms = String(terms).trim();

		if (store) {
			const [updated] = await db
				.update(storesTable)
				.set(updateData)
				.where(eq(storesTable.id, store.id))
				.returning();
			return jsonResponse(updated);
		} else {
			const [created] = await db
				.insert(storesTable)
				.values({
					name: body.name ? String(body.name).trim() : 'Main Medical Store',
					...updateData
				})
				.returning();
			return jsonResponse(created, 201);
		}
	} catch (err: any) {
		return errorResponse('BAD_REQUEST', err.message, 400);
	}
}
