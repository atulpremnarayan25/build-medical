import type { Payment, CreatePaymentInput } from '$lib/types/index.js';
import { unwrap } from './unwrap.js';

export const paymentService = {
	async getPayments(): Promise<Payment[]> {
		const res = await fetch('/api/payments');
		if (!res.ok) throw new Error('Failed to fetch payments');
		return unwrap(res);
	},
	async getPayment(id: string): Promise<Payment | null> {
		const res = await fetch(`/api/payments/${id}`);
		if (res.status === 404) return null;
		if (!res.ok) throw new Error('Failed to fetch payment');
		return unwrap(res);
	},
	async getPartyPayments(partyId: string): Promise<Payment[]> {
		const res = await fetch(`/api/payments?partyId=${partyId}`);
		if (!res.ok) throw new Error('Failed to fetch payments');
		return unwrap(res);
	},
	async createPayment(input: CreatePaymentInput): Promise<Payment> {
		if (input.type === 'received') {
			const res = await fetch('/api/payments/receipt', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input)
			});
			if (!res.ok) throw new Error('Failed to process receipt');
			return unwrap(res);
		} else {
			const res = await fetch('/api/payments/payment', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input)
			});
			if (!res.ok) throw new Error('Failed to process payment');
			return unwrap(res);
		}
	}
};
