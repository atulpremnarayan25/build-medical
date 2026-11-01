import { productService } from '$lib/server/servicesLocator';
import { jsonResponse, errorResponse } from '$lib/server/apiUtils';
import type { RequestEvent } from './$types';

export async function GET({ url, locals }: RequestEvent) {
	try {
		if (!locals.user) {
			return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
		}

		const q = url.searchParams.get('q') || url.searchParams.get('search');
		const category = url.searchParams.get('category');
		// const barcode = url.searchParams.get('barcode');

		let products = await productService.getProducts();

		if (q) {
			products = await productService.searchProducts(q);
		}

		if (category) {
			products = products.filter((p) => p.category === category);
		}

		return jsonResponse(products);
	} catch (err: any) {
		return errorResponse('INTERNAL_ERROR', err.message, 500);
	}
}

export async function POST({ request, locals }: RequestEvent) {
	try {
		if (!locals.user) {
			return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
		}

		if (locals.user.role !== 'owner_admin') {
			return errorResponse('FORBIDDEN', 'Only owner_admin can create products', 403);
		}

		const input = await request.json();
		if (!input?.name || typeof input.name !== 'string' || !input.name.trim()) {
			return errorResponse('VALIDATION_ERROR', 'Product name is required', 400);
		}
		if (locals.user.storeId) {
			input.storeId = locals.user.storeId;
		}
		const newProduct = await productService.createProduct(input);
		return jsonResponse(newProduct, 201);
	} catch (err: any) {
		return errorResponse('BAD_REQUEST', err.message, 400);
	}
}
