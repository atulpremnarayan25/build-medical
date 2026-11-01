import { describe, it, expect } from 'vitest';
import { POST as pushSync } from '../../routes/api/sync/push/+server.js';
import { GET as pullSync } from '../../routes/api/sync/pull/+server.js';
import { POST as cancelSale } from '../../routes/api/sales/[id]/cancel/+server.js';
import { POST as cancelPurchase } from '../../routes/api/purchases/[id]/cancel/+server.js';
import { POST as adjustBatch } from '../../routes/api/products/[id]/batches/[batchId]/adjust/+server.js';
import { POST as createBatch } from '../../routes/api/batches/+server.js';
import { PATCH as updateBatch } from '../../routes/api/batches/[id]/+server.js';
import { POST as createPayment } from '../../routes/api/payments/+server.js';

describe('Security Remediation & Role Boundary Checks', () => {
	const billerUser = {
		id: '00000000-0000-0000-0000-000000000001',
		username: 'biller',
		role: 'biller',
		storeId: '11111111-1111-1111-1111-111111111111',
		active: true
	};

	const adminUser = {
		id: '00000000-0000-0000-0000-000000000002',
		username: 'admin',
		role: 'owner_admin',
		storeId: '11111111-1111-1111-1111-111111111111',
		active: true
	};

	it('vuln-0002: should reject sync push from biller with 403', async () => {
		const req = new Request('http://localhost/api/sync/push', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ items: [] })
		});
		const res = await pushSync({ request: req, locals: { user: billerUser } } as any);
		expect(res.status).toBe(403);
	});

	it('vuln-0003: should reject sync pull from biller with 403', async () => {
		const url = new URL('http://localhost/api/sync/pull?clientId=cloud');
		const res = await pullSync({ url, locals: { user: billerUser } } as any);
		expect(res.status).toBe(403);
	});

	it('vuln-0001: should reject sales cancellation from biller with 403', async () => {
		const res = await cancelSale({
			params: { id: '00000000-0000-0000-0000-000000000000' },
			locals: { user: billerUser }
		} as any);
		expect(res.status).toBe(403);
	});

	it('should reject purchase cancellation from biller with 403', async () => {
		const res = await cancelPurchase({
			params: { id: '00000000-0000-0000-0000-000000000000' },
			locals: { user: billerUser }
		} as any);
		expect(res.status).toBe(403);
	});

	it('should reject batch stock adjustment from biller with 403', async () => {
		const req = new Request('http://localhost/api/products/1/batches/1/adjust', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ delta: 5, reason: 'test' })
		});
		const res = await adjustBatch({
			params: { id: '1', batchId: '1' },
			request: req,
			locals: { user: billerUser }
		} as any);
		expect(res.status).toBe(403);
	});

	it('should reject batch creation from biller with 403', async () => {
		const req = new Request('http://localhost/api/batches', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ batchNo: 'B1' })
		});
		const res = await createBatch({
			request: req,
			locals: { user: billerUser }
		} as any);
		expect(res.status).toBe(403);
	});

	it('should reject batch update from biller with 403', async () => {
		const req = new Request('http://localhost/api/batches/1', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ batchNo: 'B2' })
		});
		const res = await updateBatch({
			params: { id: '1' },
			request: req,
			locals: { user: billerUser }
		} as any);
		expect(res.status).toBe(403);
	});

	it('should reject supplier payout payment creation from biller with 403', async () => {
		const req = new Request('http://localhost/api/payments', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ type: 'made', amount: 100 })
		});
		const res = await createPayment({
			request: req,
			locals: { user: billerUser }
		} as any);
		expect(res.status).toBe(403);
	});
});
