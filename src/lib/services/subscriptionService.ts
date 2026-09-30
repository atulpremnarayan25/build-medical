import type {
	SubscriptionDetails,
	SubscriptionPlan,
	SubscriptionPlanId,
	SubscriptionStatus
} from '$lib/types/subscription.js';

const SUBSCRIPTION_STORAGE_KEY = 'medstock_subscription';

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
	{
		id: 'monthly',
		name: 'Monthly Stockist Plan',
		price: 1999,
		billingCycle: 'Monthly',
		features: [
			'Full Wholesale Billing & Invoicing',
			'Inventory & Batch Management (FEFO)',
			'Customer & Supplier Ledgers',
			'Schedule H1 Drug Register',
			'GST Reports & Tax Summaries',
			'Standard Keyboard-First Billing'
		]
	},
	{
		id: 'yearly',
		name: 'Annual Stockist Plan',
		price: 18999,
		billingCycle: 'Annual',
		isPopular: true,
		features: [
			'All Monthly Features Included',
			'Save over ₹5,000 annually',
			'Priority Keyboard Shortcuts & Fast POS Mode',
			'Multi-Device Sync Support',
			'Automated Stock Expiry & Low-Stock Alerts',
			'Dedicated 24/7 Wholesale Support'
		]
	},
	{
		id: 'lifetime',
		name: 'Enterprise Wholesale Pass',
		price: 49999,
		billingCycle: 'One-time',
		features: [
			'Lifetime Unlimited Access',
			'Zero Monthly or Annual Renewal Fees',
			'Custom Bill Printing Templates & Logos',
			'Unlimited Transactions & Multi-Store Ready',
			'VIP Support & Free Future Upgrades'
		]
	}
];

const DEFAULT_ACTIVE_SUBSCRIPTION: SubscriptionDetails = {
	status: 'active',
	planId: 'yearly',
	planName: 'Annual Stockist Plan',
	expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
	amountPaid: 18999,
	lastPaymentDate: new Date().toISOString(),
	paymentMethod: 'UPI',
	transactionRef: 'TXN-INIT-99882',
	wholesalerName: 'MedStock Wholesale Pharma',
	gstin: '27AAAAA0000A1Z5'
};

const DEFAULT_EXPIRED_SUBSCRIPTION: SubscriptionDetails = {
	status: 'expired',
	planId: 'monthly',
	planName: 'Monthly Stockist Plan',
	expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
	amountPaid: 1999,
	lastPaymentDate: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
	paymentMethod: 'UPI',
	transactionRef: 'TXN-EXP-00123',
	wholesalerName: 'MedStock Wholesale Pharma',
	gstin: '27AAAAA0000A1Z5'
};

export class SubscriptionService {
	private memorySub: SubscriptionDetails | null = null;

	private getStored(): SubscriptionDetails | null {
		if (typeof window === 'undefined') return this.memorySub;
		try {
			const item = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
			if (item) {
				return JSON.parse(item);
			}
		} catch (e) {
			console.error('Failed to parse subscription from localStorage:', e);
		}
		return this.memorySub;
	}

	private saveStored(details: SubscriptionDetails): void {
		this.memorySub = details;
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(details));
		} catch (e) {
			console.error('Failed to save subscription to localStorage:', e);
		}
	}

	public getPlans(): SubscriptionPlan[] {
		return SUBSCRIPTION_PLANS;
	}

	public getSubscription(): SubscriptionDetails {
		const stored = this.getStored();
		if (stored) {
			// Check if expired dynamically based on date
			const expiresAt = new Date(stored.expiresAt).getTime();
			if (expiresAt < Date.now() && stored.status === 'active') {
				stored.status = 'expired';
				this.saveStored(stored);
			}
			return stored;
		}

		// Initial state: default to active (or expired if initialized as expired demo)
		return DEFAULT_ACTIVE_SUBSCRIPTION;
	}

	public isSubscriptionActive(): boolean {
		const sub = this.getSubscription();
		return sub.status === 'active' || sub.status === 'trialing';
	}

	public activateSubscription(
		planId: SubscriptionPlanId,
		paymentMethod: 'UPI' | 'Card' | 'Net Banking',
		info?: { wholesalerName?: string; gstin?: string }
	): SubscriptionDetails {
		const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId) || SUBSCRIPTION_PLANS[0];
		let durationDays = 30;
		if (plan.id === 'yearly') durationDays = 365;
		if (plan.id === 'lifetime') durationDays = 365 * 50; // 50 years

		const now = new Date();
		const expires = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
		const txnRef = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;

		const newDetails: SubscriptionDetails = {
			status: 'active',
			planId: plan.id,
			planName: plan.name,
			expiresAt: expires.toISOString(),
			amountPaid: plan.price,
			lastPaymentDate: now.toISOString(),
			paymentMethod,
			transactionRef: txnRef,
			wholesalerName: info?.wholesalerName || 'MedStock Wholesaler',
			gstin: info?.gstin || '27AAAAA0000A1Z5'
		};

		this.saveStored(newDetails);
		return newDetails;
	}

	public setExpiredForTesting(): SubscriptionDetails {
		this.saveStored(DEFAULT_EXPIRED_SUBSCRIPTION);
		return DEFAULT_EXPIRED_SUBSCRIPTION;
	}

	public resetToActive(): SubscriptionDetails {
		this.saveStored(DEFAULT_ACTIVE_SUBSCRIPTION);
		return DEFAULT_ACTIVE_SUBSCRIPTION;
	}
}

export const subscriptionService = new SubscriptionService();
