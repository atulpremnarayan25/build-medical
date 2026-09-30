import { describe, it, expect, beforeEach } from 'vitest';
import { subscriptionService, SUBSCRIPTION_PLANS } from './subscriptionService.js';

describe('SubscriptionService', () => {
	beforeEach(() => {
		subscriptionService.resetToActive();
	});

	it('should return default subscription plans', () => {
		const plans = subscriptionService.getPlans();
		expect(plans).toHaveLength(3);
		expect(plans[0].id).toBe('monthly');
		expect(plans[1].id).toBe('yearly');
		expect(plans[2].id).toBe('lifetime');
	});

	it('should check active subscription state', () => {
		const sub = subscriptionService.getSubscription();
		expect(sub.status).toBe('active');
		expect(subscriptionService.isSubscriptionActive()).toBe(true);
	});

	it('should activate a new plan upon payment', () => {
		const updated = subscriptionService.activateSubscription('monthly', 'UPI', {
			wholesalerName: 'Test Wholesaler',
			gstin: '27ABCDE1234F1Z5'
		});
		expect(updated.status).toBe('active');
		expect(updated.planId).toBe('monthly');
		expect(updated.paymentMethod).toBe('UPI');
		expect(updated.wholesalerName).toBe('Test Wholesaler');
		expect(subscriptionService.isSubscriptionActive()).toBe(true);
	});

	it('should handle expired subscription state', () => {
		subscriptionService.setExpiredForTesting();
		expect(subscriptionService.isSubscriptionActive()).toBe(false);
		const sub = subscriptionService.getSubscription();
		expect(sub.status).toBe('expired');
	});
});
