import { productService } from '$lib/server/servicesLocator';
import { jsonResponse, errorResponse } from '$lib/server/apiUtils';
import type { RequestEvent } from './$types';

export async function GET({ url, locals }: RequestEvent) {
	try {
		if (!locals.user) {
			return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
		}

		const barcode = url.searchParams.get('barcode');
		const q = url.searchParams.get('q') || url.searchParams.get('search') || undefined;
		const category = url.searchParams.get('category') || undefined;
		const pageParam = url.searchParams.get('page');
		const limitParam = url.searchParams.get('limit');
		const storeId = locals.user.storeId || undefined;

		if (barcode) {
			const product = await productService.getProductByBarcode(barcode, storeId);
			if (!product) {
				return errorResponse('NOT_FOUND', 'Product not found with this barcode', 404);
			}
			return jsonResponse(product);
		}

		if (pageParam !== null || limitParam !== null) {
			const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
			const limit = Math.max(1, Math.min(100, parseInt(limitParam || '50', 10) || 50));
			const result = await productService.getPaginatedProducts({
				page,
				limit,
				search: q,
				category,
				storeId
			});
			return jsonResponse(result);
		}

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
