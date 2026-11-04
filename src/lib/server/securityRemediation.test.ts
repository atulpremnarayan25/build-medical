import { describe, it, expect } from 'vitest';
import { POST as pushSync } from '../../routes/api/sync/push/+server.js';
import { GET as pullSync } from '../../routes/api/sync/pull/+server.js';
import { POST as cancelSale } from '../../routes/api/sales/[id]/cancel/+server.js';
import { POST as cancelPurchase } from '../../routes/api/purchases/[id]/cancel/+server.js';
import { POST as adjustBatch } from '../../routes/api/products/[id]/batches/[batchId]/adjust/+server.js';
import { POST as createBatch } from '../../routes/api/batches/+server.js';
import { PATCH as updateBatch } from '../../routes/api/batches/[id]/+server.js';
import { POST as createPayment } from '../../routes/api/payments/+server.js';
import { POST as createSupplier } from '../../routes/api/suppliers/+server.js';
import { PATCH as updateSupplier } from '../../routes/api/suppliers/[id]/+server.js';
import { POST as createPurchase } from '../../routes/api/purchases/+server.js';
import { POST as createReturn } from '../../routes/api/returns/+server.js';
import { PATCH as updateCustomer } from '../../routes/api/customers/[id]/+server.js';
import { GET as getSale } from '../../routes/api/sales/[id]/+server.js';
import { GET as getPurchase } from '../../routes/api/purchases/[id]/+server.js';
import { GET as getPayment } from '../../routes/api/payments/[id]/+server.js';
import { GET as getCustomerLedger } from '../../routes/api/customers/[id]/ledger/+server.js';
import { GET as getSupplierLedger } from '../../routes/api/suppliers/[id]/ledger/+server.js';
import { GET as getNetworkTopology } from '../../routes/api/settings/network/+server.js';
import { GET as getProductBatches } from '../../routes/api/products/[id]/batches/+server.js';
import { GET as getLowStock } from '../../routes/api/inventory/low-stock/+server.js';
import { GET as getNearExpiry } from '../../routes/api/inventory/near-expiry/+server.js';
import { GET as getBatchesSummary } from '../../routes/api/batches/summary/+server.js';
import { GET as getSalesSummary } from '../../routes/api/sales/summary/+server.js';
import { GET as getPurchasesSummary } from '../../routes/api/purchases/summary/+server.js';
import { GET as getSalesHistory } from '../../routes/api/sales/history/+server.js';
import { GET as getPurchasesHistory } from '../../routes/api/purchases/history/+server.js';
import { GET as getSalesList } from '../../routes/api/sales/+server.js';
import { POST as quoteSale } from '../../routes/api/sales/quote/+server.js';
import { GET as getPurchasesList } from '../../routes/api/purchases/+server.js';
import { GET as getProductsList } from '../../routes/api/products/+server.js';
import { GET as getProduct } from '../../routes/api/products/[id]/+server.js';
import { GET as getCustomersList } from '../../routes/api/customers/+server.js';
import { GET as getCustomer } from '../../routes/api/customers/[id]/+server.js';
import { GET as getSuppliersList } from '../../routes/api/suppliers/+server.js';
import { GET as getSupplier } from '../../routes/api/suppliers/[id]/+server.js';
import { GET as getPaymentsList } from '../../routes/api/payments/+server.js';
import { GET as getBatchesList } from '../../routes/api/batches/+server.js';
import { GET as getBatch } from '../../routes/api/batches/[id]/+server.js';
import { GET as getAdjustments } from '../../routes/api/inventory/adjustments/+server.js';
import { GET as getPartyLedger } from '../../routes/api/ledger/[partyId]/+server.js';
import { handle } from '../../hooks.server.js';
import { createSaleService } from '../services/saleService.js';
import { createPurchaseService } from '../services/purchaseService.js';

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

	it('should reject supplier payout payment creation via partyType=supplier or type=out from biller with 403', async () => {
		const reqSupplier = new Request('http://localhost/api/payments', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ partyType: 'supplier', partyId: 'some-supplier-id', amount: 100 })
		});
		const resSupplier = await createPayment({
			request: reqSupplier,
			locals: { user: billerUser }
		} as any);
		expect(resSupplier.status).toBe(403);

		const reqOut = new Request('http://localhost/api/payments', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ type: 'out', amount: 100 })
		});
		const resOut = await createPayment({
			request: reqOut,
			locals: { user: billerUser }
		} as any);
		expect(resOut.status).toBe(403);
	});

	it('should reject supplier creation from biller with 403', async () => {
		const req = new Request('http://localhost/api/suppliers', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: 'Acme Pharma Dist' })
		});
		const res = await createSupplier({
			request: req,
			locals: { user: billerUser }
		} as any);
		expect(res.status).toBe(403);
	});

	it('should reject supplier modification from biller with 403', async () => {
		const req = new Request('http://localhost/api/suppliers/1', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: 'Acme Pharma Dist Renamed' })
		});
		const res = await updateSupplier({
			params: { id: '1' },
			request: req,
			locals: { user: billerUser }
		} as any);
		expect(res.status).toBe(403);
	});

	it('should reject inward purchase creation from biller with 403', async () => {
		const req = new Request('http://localhost/api/purchases', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ supplierId: 's1', invoiceNumber: 'INV-100', items: [] })
		});
		const res = await createPurchase({
			request: req,
			locals: { user: billerUser }
		} as any);
		expect(res.status).toBe(403);
	});

	it('should reject purchase return from biller with 403', async () => {
		const req = new Request('http://localhost/api/returns', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				returnType: 'purchase_return',
				originalPurchaseId: 'p1',
				reason: 'Damaged',
				items: []
			})
		});
		const res = await createReturn({
			request: req,
			locals: { user: billerUser }
		} as any);
		expect(res.status).toBe(403);
	});

	it('should reject credit limit modification from biller with 403', async () => {
		const req = new Request('http://localhost/api/customers/1', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ creditLimit: 50000 })
		});
		const res = await updateCustomer({
			params: { id: '1' },
			request: req,
			locals: { user: billerUser }
		} as any);
		expect(res.status).toBe(403);
	});

	it('should reject unauthenticated access to single resource and ledger endpoints with 401', async () => {
		const noAuthLocals = { user: null };
		expect((await getSale({ params: { id: '1' }, locals: noAuthLocals } as any)).status).toBe(401);
		expect((await getPurchase({ params: { id: '1' }, locals: noAuthLocals } as any)).status).toBe(401);
		expect((await getPayment({ params: { id: '1' }, locals: noAuthLocals } as any)).status).toBe(401);
		expect((await getCustomerLedger({ params: { id: '1' }, locals: noAuthLocals } as any)).status).toBe(401);
		expect((await getSupplierLedger({ params: { id: '1' }, locals: noAuthLocals } as any)).status).toBe(401);
	});

	it('should reject unauthenticated access to inventory and history endpoints with 401/403', async () => {
		const noAuthLocals = { user: null };
		const dummyUrl = new URL('http://localhost/api');

		expect((await getNetworkTopology({ url: dummyUrl, locals: noAuthLocals } as any)).status).toBe(403);
		expect((await getNetworkTopology({ url: dummyUrl, locals: { user: billerUser } } as any)).status).toBe(403);
		expect((await getProductBatches({ params: { id: '1' }, locals: noAuthLocals } as any)).status).toBe(401);
		expect((await getLowStock({ url: dummyUrl, locals: noAuthLocals } as any)).status).toBe(401);
		expect((await getNearExpiry({ url: dummyUrl, locals: noAuthLocals } as any)).status).toBe(401);
		expect((await getBatchesSummary({ url: dummyUrl, locals: noAuthLocals } as any)).status).toBe(401);
		expect((await getSalesSummary({ locals: noAuthLocals } as any)).status).toBe(401);
		expect((await getPurchasesSummary({ locals: noAuthLocals } as any)).status).toBe(401);
		expect((await getSalesHistory({ url: dummyUrl, locals: noAuthLocals } as any)).status).toBe(401);
		expect((await getPurchasesHistory({ url: dummyUrl, locals: noAuthLocals } as any)).status).toBe(401);
		expect((await getSalesList({ url: dummyUrl, locals: noAuthLocals } as any)).status).toBe(401);
		expect((await quoteSale({ request: new Request('http://localhost/api/sales/quote', { method: 'POST' }), locals: noAuthLocals } as any)).status).toBe(401);
		expect((await getPurchasesList({ url: dummyUrl, locals: noAuthLocals } as any)).status).toBe(401);
		expect((await getProductsList({ url: dummyUrl, locals: noAuthLocals } as any)).status).toBe(401);
		expect((await getProduct({ params: { id: '1' }, locals: noAuthLocals } as any)).status).toBe(401);
		expect((await getCustomersList({ url: dummyUrl, locals: noAuthLocals } as any)).status).toBe(401);
		expect((await getCustomer({ params: { id: '1' }, locals: noAuthLocals } as any)).status).toBe(401);
		expect((await getSuppliersList({ url: dummyUrl, locals: noAuthLocals } as any)).status).toBe(401);
		expect((await getSupplier({ params: { id: '1' }, locals: noAuthLocals } as any)).status).toBe(401);
		expect((await getPaymentsList({ url: dummyUrl, locals: noAuthLocals } as any)).status).toBe(401);
		expect((await getBatchesList({ url: dummyUrl, locals: noAuthLocals } as any)).status).toBe(401);
		expect((await getBatch({ params: { id: '1' }, locals: noAuthLocals } as any)).status).toBe(401);
		expect((await getAdjustments({ locals: noAuthLocals } as any)).status).toBe(401);
	});

	it('should exclude cancelled sales from getDashboardSummary', async () => {
		const today = new Date().toISOString().split('T')[0];
		const mockSaleRepo = {
			getAll: async () => [
				{
					id: 's1',
					date: `${today}T10:00:00.000Z`,
					grandTotal: 500,
					dueAmount: 200,
					status: 'completed',
					items: [{ quantity: 2 }]
				},
				{
					id: 's2',
					date: `${today}T11:00:00.000Z`,
					grandTotal: 1000,
					dueAmount: 500,
					status: 'cancelled',
					items: [{ quantity: 5 }]
				}
			]
		};
		const svc = createSaleService(mockSaleRepo as any);
		const summary = await svc.getDashboardSummary();
		expect(summary.todaySalesCount).toBe(1);
		expect(summary.todaySalesTotal).toBe(500);
		expect(summary.todayItemsSold).toBe(2);
		expect(summary.totalReceivables).toBe(200);
	});

	it('should exclude cancelled purchases from getDashboardSummary', async () => {
		const today = new Date().toISOString().split('T')[0];
		const mockPurchaseRepo = {
			getAll: async () => [
				{
					id: 'p1',
					invoiceDate: `${today}T10:00:00.000Z`,
					grandTotal: 800,
					dueAmount: 300,
					status: 'received',
					items: []
				},
				{
					id: 'p2',
					invoiceDate: `${today}T11:00:00.000Z`,
					grandTotal: 2000,
					dueAmount: 1000,
					status: 'cancelled',
					items: []
				}
			]
		};
		const svc = createPurchaseService(mockPurchaseRepo as any);
		const summary = await svc.getDashboardSummary();
		expect(summary.todayPurchasesCount).toBe(1);
		expect(summary.todayPurchasesTotal).toBe(800);
		expect(summary.totalPayables).toBe(300);
	});

	it('vuln-0003: should reject /api/reports access for biller with 403', async () => {
		const resGst = await handle({
			event: {
				url: new URL('http://localhost/api/reports/gst'),
				request: new Request('http://localhost/api/reports/gst'),
				locals: { user: billerUser }
			},
			resolve: async () => new Response(JSON.stringify({ ok: true }))
		} as any);
		expect(resGst.status).toBe(403);

		const resSales = await handle({
			event: {
				url: new URL('http://localhost/api/reports/sales'),
				request: new Request('http://localhost/api/reports/sales'),
				locals: { user: billerUser }
			},
			resolve: async () => new Response(JSON.stringify({ ok: true }))
		} as any);
		expect(resSales.status).toBe(403);
	});

	it('vuln-0001: should redirect biller away from /settings and /settings/network', async () => {
		const { load as loadSettings } = await import('../../routes/settings/+page.server.js');
		const { load as loadNetwork } = await import('../../routes/settings/network/+page.server.js');

		await expect(
			loadSettings({ locals: { user: billerUser } } as any)
		).rejects.toMatchObject({
			status: 302,
			location: '/dashboard'
		});

		await expect(
			loadNetwork({
				locals: { user: billerUser },
				url: new URL('http://localhost/settings/network')
			} as any)
		).rejects.toMatchObject({
			status: 302,
			location: '/dashboard'
		});
	});
});
