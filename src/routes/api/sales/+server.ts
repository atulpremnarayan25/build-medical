import { json } from '@sveltejs/kit';
import { salesService } from '$lib/server/servicesLocator.js';
import {
	finalizeSale,
	BillingError,
	type SaleInput,
	type EngineLineInput
} from '$lib/server/billing/engine.js';
import { errorResponse, jsonResponse } from '$lib/server/apiUtils.js';
import type { RequestEvent } from './$types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET({ url }: RequestEvent) {
	const customerId = url.searchParams.get('customerId');
	if (customerId) {
		const sales = await salesService.getSalesByCustomer(customerId);
		return json(sales);
	}

	const sales = await salesService.getSales();
	return json(sales);
}

function todayIso(): string {
	const d = new Date();
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Legacy payloads reference the transitional SQLite catalog (prod-XXX ids,
 * client-computed totals). They keep flowing through the legacy service until
 * task-16 rewires the billing UI onto the PostgreSQL catalog. DELETE this
 * branch together with legacySqlite.ts in task-16.
 */
function isLegacyPayload(items: Record<string, unknown>[]): boolean {
	return items.some((i) => typeof i.productId === 'string' && !UUID_RE.test(i.productId));
}

async function finalizeLegacy(body: Record<string, unknown>, userId: string) {
	const data = { ...body, createdBy: userId };
	return json(await salesService.createSale(data as never));
}

/**
 * POST /api/sales — spec §4: finalize the bill. Server-authoritative FEFO,
 * GST and invoice numbering; transactional stock deduction via batch_stock_events.
 *
 * Accepts the spec-shaped body ({ saleType, interState?, items: [{productId,
 * unitId?, quantity, rate?, discount?}], amountPaidAtSaleRupees? }) and also
 * maps the current frontend shape (items[].batchId pins the batch, rate /
 * discount per line) until task-16 rewires the UI.
 */
export async function POST(event: RequestEvent) {
	if (!event.locals.user) {
		return errorResponse('UNAUTHORIZED', 'Login required', 401);
	}

	let body: Record<string, unknown>;
	try {
		body = await event.request.json();
	} catch {
		return errorResponse('BAD_REQUEST', 'Body must be JSON', 400);
	}

	const rawItems = (Array.isArray(body.items) ? body.items : []) as Record<string, unknown>[];
	if (rawItems.length === 0) {
		return errorResponse('BAD_REQUEST', 'Sale has no items', 400);
	}
	if (isLegacyPayload(rawItems)) {
		return finalizeLegacy(body, event.locals.user.id);
	}

	// Legacy UI uses customerId='walk-in' for anonymous sales; spec wants null.
	const rawCustomer = body.customerId ? String(body.customerId) : null;
	const customerId = rawCustomer === 'walk-in' ? null : rawCustomer;
	const items: EngineLineInput[] = rawItems.map((item) => ({
		productId: String(item.productId ?? ''),
		unitId: item.unitId ? String(item.unitId) : undefined,
		quantity: Number(item.quantity ?? 0),
		pinnedBatchId: item.batchId ? String(item.batchId) : undefined,
		rateRupees:
			item.rate !== undefined
				? Number(item.rate)
				: item.sellingRate !== undefined
					? Number(item.sellingRate)
					: undefined,
		discountRupees: item.discount !== undefined ? Number(item.discount) : undefined
	}));

	if (items.some((i) => !i.productId)) {
		return errorResponse('BAD_REQUEST', 'Every line needs a productId', 400);
	}

	const paid =
		body.amountPaidAtSaleRupees !== undefined
			? Number(body.amountPaidAtSaleRupees)
			: body.paidAmount !== undefined
				? Number(body.paidAmount)
				: undefined;

	const input: SaleInput = {
		saleType: body.saleType === 'wholesale' ? 'wholesale' : 'retail',
		customerId,
		patientName: typeof body.patientName === 'string' ? body.patientName : undefined,
		prescriberName: typeof body.prescriberName === 'string' ? body.prescriberName : undefined,
		prescriberRegNo: typeof body.prescriberRegNo === 'string' ? body.prescriberRegNo : undefined,
		interState: body.interState === true,
		items,
		amountPaidAtSaleRupees: paid,
		notes: typeof body.notes === 'string' ? body.notes : undefined
	};

	// FR-INV-005: expired-stock override is owner/admin only.
	const allowExpiredOverride =
		body.includeExpiredBatches === true && event.locals.user.role === 'owner_admin';

	try {
		const invoice = await finalizeSale(input, {
			today: todayIso(),
			userId: event.locals.user.id,
			allowExpiredOverride
		});
		return jsonResponse(invoice, 201);
	} catch (err) {
		if (err instanceof BillingError) return errorResponse(err.code, err.message, err.status);
		return errorResponse('INTERNAL_ERROR', 'Failed to record sale', 500);
	}
}
