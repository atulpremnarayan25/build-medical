import { json } from '@sveltejs/kit';
import { paymentService } from '$lib/server/servicesLocator.js';

export async function POST({ request, locals }) {
	if (!locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const data = await request.json();
	// inject created by
	data.createdBy = locals.user.id;

	const payment = await paymentService.createPayment({ ...data, type: 'received' });
	return json(payment);
}
