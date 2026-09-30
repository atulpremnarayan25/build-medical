import { productService, inventoryService } from '$lib/server/servicesLocator';
import { jsonResponse, errorResponse } from '$lib/server/apiUtils';
import type { RequestEvent } from './$types';

export async function GET({ params }: RequestEvent) {
	try {
		const { id } = params;
		const product = await productService.getProduct(id);

		if (!product) {
			return errorResponse('NOT_FOUND', 'Product not found', 404);
		}

		const batches = await inventoryService.getBatchesByProduct(id);

		// Currently, product type in types/product.ts doesn't have product_units
		// We'll append batches (as "batches summary") to make it conform smoothly to instructions.
		return jsonResponse({
			...product,
			product_units: [], // Placeholder since it's not present in types but spec requires it
			batches
		});
	} catch (err: any) {
		return errorResponse('INTERNAL_ERROR', err.message, 500);
	}
}

export async function PATCH({ params, request }: RequestEvent) {
	try {
		const { id } = params;
		const input = await request.json();
		const product = await productService.getProduct(id);

		if (!product) {
			return errorResponse('NOT_FOUND', 'Product not found', 404);
		}

		const updatedProduct = await productService.updateProduct(id, input);
		return jsonResponse(updatedProduct);
	} catch (err: any) {
		return errorResponse('BAD_REQUEST', err.message, 400);
	}
}
