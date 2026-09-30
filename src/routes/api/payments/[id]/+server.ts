import { json, error } from '@sveltejs/kit';
import { paymentService } from '$lib/server/servicesLocator.js';

export async function GET({ params }) {
	const payment = await paymentService.getPayment(params.id);
	if (!payment) throw error(404, 'Payment not found');
	return json(payment);
}
