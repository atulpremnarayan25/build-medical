import { describe, it, expect } from 'vitest';
import { GET as getSalesList } from '../../routes/api/sales/+server.js';
import { GET as getPurchasesList } from '../../routes/api/purchases/+server.js';
import { GET as getProductsList } from '../../routes/api/products/+server.js';
import { GET as getGlobalSearch } from '../../routes/api/search/+server.js';

describe('Phase 2: Performance, Pagination & Global Search Palette', () => {
	const authLocals = {
		user: {
			id: '00000000-0000-0000-0000-000000000001',
			username: 'admin',
			role: 'owner_admin'
		}
	};

	it('should return paginated envelope for /api/sales when page/limit requested', async () => {
		const url = new URL('http://localhost/api/sales?page=1&limit=2');
		const res = await getSalesList({ url, locals: authLocals } as any);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.error).toBeNull();
		expect(body.data).toBeDefined();
		expect(body.data.page).toBe(1);
		expect(body.data.limit).toBe(2);
		expect(typeof body.data.total).toBe('number');
		expect(typeof body.data.totalPages).toBe('number');
		expect(Array.isArray(body.data.items)).toBe(true);
		expect(body.data.items.length).toBeLessThanOrEqual(2);
	});

	it('should return raw array for /api/sales when page/limit not provided (backward compatibility)', async () => {
		const url = new URL('http://localhost/api/sales');
		const res = await getSalesList({ url, locals: authLocals } as any);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(Array.isArray(body)).toBe(true);
	});

	it('should return paginated envelope for /api/purchases when page/limit requested', async () => {
		const url = new URL('http://localhost/api/purchases?page=1&limit=2');
		const res = await getPurchasesList({ url, locals: authLocals } as any);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.error).toBeNull();
		expect(body.data).toBeDefined();
		expect(body.data.page).toBe(1);
		expect(body.data.limit).toBe(2);
		expect(typeof body.data.total).toBe('number');
		expect(typeof body.data.totalPages).toBe('number');
		expect(Array.isArray(body.data.items)).toBe(true);
		expect(body.data.items.length).toBeLessThanOrEqual(2);
	});

	it('should return raw array for /api/purchases when page/limit not provided (backward compatibility)', async () => {
		const url = new URL('http://localhost/api/purchases');
		const res = await getPurchasesList({ url, locals: authLocals } as any);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(Array.isArray(body)).toBe(true);
	});

	it('should return paginated envelope for /api/products when page/limit requested', async () => {
		const url = new URL('http://localhost/api/products?page=1&limit=2');
		const res = await getProductsList({ url, locals: authLocals } as any);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.error).toBeNull();
		expect(body.data).toBeDefined();
		expect(body.data.page).toBe(1);
		expect(body.data.limit).toBe(2);
		expect(typeof body.data.total).toBe('number');
		expect(typeof body.data.totalPages).toBe('number');
		expect(Array.isArray(body.data.items)).toBe(true);
		expect(body.data.items.length).toBeLessThanOrEqual(2);
	});

	it('should return data array for /api/products when page/limit not provided (backward compatibility)', async () => {
		const url = new URL('http://localhost/api/products');
		const res = await getProductsList({ url, locals: authLocals } as any);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.error).toBeNull();
		expect(Array.isArray(body.data)).toBe(true);
	});

	it('should enforce authentication on /api/search', async () => {
		const url = new URL('http://localhost/api/search?q=med');
		const res = await getGlobalSearch({ url, locals: { user: null } } as any);
		expect(res.status).toBe(401);
	});

	it('should return empty result groups when search query is less than 2 characters', async () => {
		const url = new URL('http://localhost/api/search?q=a');
		const res = await getGlobalSearch({ url, locals: authLocals } as any);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.error).toBeNull();
		expect(body.data.items).toEqual([]);
		expect(body.data.groups.products).toEqual([]);
	});

	it('should perform fast indexed search and return structured items with max 5 per entity', async () => {
		const url = new URL('http://localhost/api/search?q=a');
		// Use query 'Alprazolam' or common letter 'a' with >= 2 chars
		const queryUrl = new URL('http://localhost/api/search?q=al');
		const res = await getGlobalSearch({ url: queryUrl, locals: authLocals } as any);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.error).toBeNull();
		expect(Array.isArray(body.data.items)).toBe(true);
		expect(body.data.groups.products.length).toBeLessThanOrEqual(5);
		expect(body.data.groups.customers.length).toBeLessThanOrEqual(5);
		expect(body.data.groups.suppliers.length).toBeLessThanOrEqual(5);
		expect(body.data.groups.sales.length).toBeLessThanOrEqual(5);
		expect(body.data.groups.purchases.length).toBeLessThanOrEqual(5);

		// If any item was found, verify structure
		if (body.data.items.length > 0) {
			const item = body.data.items[0];
			expect(item.type).toBeDefined();
			expect(item.id).toBeDefined();
			expect(item.title).toBeDefined();
			expect(item.href).toBeDefined();
		}
	});
});
