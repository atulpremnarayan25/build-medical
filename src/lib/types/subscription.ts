export type SubscriptionStatus = 'active' | 'expired' | 'trialing' | 'pending';

export type SubscriptionPlanId = 'monthly' | 'yearly' | 'lifetime';

export interface SubscriptionPlan {
	id: SubscriptionPlanId;
	name: string;
	price: number; // in INR
	billingCycle: 'Monthly' | 'Annual' | 'One-time';
	features: string[];
	isPopular?: boolean;
}

export interface SubscriptionDetails {
	status: SubscriptionStatus;
	planId: SubscriptionPlanId;
	planName: string;
	expiresAt: string; // ISO date string
	amountPaid: number;
	lastPaymentDate?: string;
	paymentMethod?: 'UPI' | 'Card' | 'Net Banking';
	transactionRef?: string;
	wholesalerName?: string;
	gstin?: string;
}
