import { json } from '@sveltejs/kit';
import { paymentService } from '$lib/server/servicesLocator.js';

export async function POST({ request, locals }) {
	if (!locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	if (locals.user.role !== 'owner_admin') {
		return new Response(
			JSON.stringify({ error: 'Forbidden: Admin role required for supplier payments' }),
			{ status: 403, headers: { 'Content-Type': 'application/json' } }
		);
	}

	const data = await request.json();
	// inject created by
	data.createdBy = locals.user.id;

	const payment = await paymentService.createPayment({ ...data, type: 'made' });
	return json(payment);
}
