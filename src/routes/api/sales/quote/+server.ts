import {
	quoteSale,
	BillingError,
	type SaleInput,
	type EngineLineInput
} from '$lib/server/billing/engine.js';
import { errorResponse, jsonResponse } from '$lib/server/apiUtils.js';
import type { RequestEvent } from './$types';

function todayIso(): string {
	// Server-local date (the store's own clock is authoritative for expiry checks)
	const d = new Date();
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * POST /api/sales/quote — spec §4: FEFO allocation + pricing + GST breakdown,
 * nothing persisted. Body:
 * { saleType?, interState?, customerId?, items: [{ productId, unitId?, quantity,
 *   batchId?(pin), rate?(snapshot), discount? }] }
 */
export async function POST(event: RequestEvent) {
	let body: Record<string, unknown>;
	try {
		body = await event.request.json();
	} catch {
		return errorResponse('BAD_REQUEST', 'Body must be JSON', 400);
	}

	const rawItems = Array.isArray(body.items) ? body.items : [];
	const items: EngineLineInput[] = rawItems.map((raw) => {
		const item = raw as Record<string, unknown>;
		return {
			productId: String(item.productId ?? ''),
			unitId: item.unitId ? String(item.unitId) : undefined,
			quantity: Number(item.quantity ?? 0),
			pinnedBatchId: item.batchId ? String(item.batchId) : undefined,
			rateRupees: item.rate !== undefined ? Number(item.rate) : undefined,
			discountRupees: item.discount !== undefined ? Number(item.discount) : undefined
		};
	});

	if (items.length === 0 || items.some((i) => !i.productId)) {
		return errorResponse('BAD_REQUEST', 'Every line needs a productId', 400);
	}

	// Legacy UI uses customerId='walk-in' for anonymous sales; spec wants null.
	const rawCustomer = body.customerId ? String(body.customerId) : null;
	const customerId = rawCustomer === 'walk-in' ? null : rawCustomer;

	const input: SaleInput = {
		saleType: body.saleType === 'wholesale' ? 'wholesale' : 'retail',
		customerId,
		interState: body.interState === true,
		items
	};

	// FR-INV-005: drawing from expired batches needs an owner/admin override.
	const allowExpiredOverride =
		body.includeExpiredBatches === true && event.locals.user?.role === 'owner_admin';

	try {
		const quote = await quoteSale(input, todayIso(), allowExpiredOverride);
		return jsonResponse(quote);
	} catch (err) {
		if (err instanceof BillingError) return errorResponse(err.code, err.message, err.status);
		return errorResponse('INTERNAL_ERROR', 'Failed to build quote', 500);
	}
}
