import { json } from '@sveltejs/kit';
import { paymentService } from '$lib/server/servicesLocator.js';

export async function GET({ url }) {
	const partyId = url.searchParams.get('partyId');
	if (partyId) {
		const payments = await paymentService.getPaymentsByParty(partyId);
		return json(payments);
	}

	const payments = await paymentService.getPayments();
	return json(payments);
}

export async function POST({ request, locals }) {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const data = await request.json();

	// Restrict supplier payouts to owner_admin
	if (data.type === 'made' && locals.user.role !== 'owner_admin') {
		return new Response(
			JSON.stringify({ error: 'Forbidden: Admin role required for supplier payments' }),
			{ status: 403, headers: { 'Content-Type': 'application/json' } }
		);
	}

	data.createdBy = locals.user.id;

	const payment = await paymentService.createPayment(data);
	return json(payment);
}
