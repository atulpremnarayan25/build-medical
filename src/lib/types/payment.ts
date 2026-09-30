import type { PaymentMethod } from './sale.js';

export type PaymentType = 'received' | 'made';

export interface Payment {
	id: string;
	type: PaymentType;
	partyId: string;
	partyName: string;
	partyType: 'customer' | 'supplier';
	invoiceId?: string;
	invoiceNumber?: string;
	amount: number;
	paymentMethod: PaymentMethod;
	reference?: string;
	date: string;
	notes?: string;
	createdBy: string;
	createdAt: string;
}

export type CreatePaymentInput = Omit<Payment, 'id' | 'partyName' | 'createdAt'>;
