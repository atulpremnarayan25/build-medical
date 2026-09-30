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
	const user = locals.user || { id: 'test-user' };
	const data = await request.json();
	data.createdBy = user.id;

	const payment = await paymentService.createPayment(data);
	return json(payment);
}
