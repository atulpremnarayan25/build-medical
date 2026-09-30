<script lang="ts">
	import { onMount } from 'svelte';
	import { PageHeader, Button, Badge, Modal } from '$lib/components/common/index.js';
	import { subscriptionService, SUBSCRIPTION_PLANS } from '$lib/services/subscriptionService.js';
	import type { SubscriptionPlan, SubscriptionPlanId } from '$lib/types/subscription.js';
	import {
		getSubscription,
		isSubscriptionActive,
		setSubscription,
		refreshSubscription
	} from '$lib/stores/appStore.svelte.js';
	import { addToast } from '$lib/stores/toastStore.svelte.js';
	import {
		CheckCircle2,
		ShieldCheck,
		AlertTriangle,
		CreditCard,
		QrCode,
		Building2,
		Sparkles,
		Clock,
		Receipt
	} from '@lucide/svelte';

	let subscription = $derived(getSubscription());
	let active = $derived(isSubscriptionActive());

	let selectedPlan = $state<SubscriptionPlan>(SUBSCRIPTION_PLANS[1]); // default to annual
	let isPaymentModalOpen = $state(false);

	// Checkout form fields
	let wholesalerName = $state('MedStock Wholesale Pharma');
	let gstin = $state('27AAAAA0000A1Z5');
	let paymentMethod = $state<'UPI' | 'Card' | 'Net Banking'>('UPI');
	let upiId = $state('wholesaler@upi');
	let cardNumber = $state('4532 •••• •••• 8821');
	let selectedBank = $state('HDFC Bank');
	let isProcessingPayment = $state(false);

	onMount(() => {
		refreshSubscription();
	});

	function handleOpenCheckout(plan: SubscriptionPlan) {
		selectedPlan = plan;
		isPaymentModalOpen = true;
	}

	async function handleProcessPayment() {
		if (!wholesalerName.trim()) {
			addToast('error', 'Please enter Wholesaler Business Name');
			return;
		}

		isProcessingPayment = true;

		// Simulate payment gateway API latency
		setTimeout(() => {
			const updated = subscriptionService.activateSubscription(selectedPlan.id, paymentMethod, {
				wholesalerName,
				gstin
			});
			setSubscription(updated);
			isProcessingPayment = false;
			isPaymentModalOpen = false;
			addToast(
				'success',
				`Payment of ₹${selectedPlan.price.toLocaleString('en-IN')} successful! Subscription active.`
			);
		}, 1200);
	}

	function handleSimulateExpired() {
		const expired = subscriptionService.setExpiredForTesting();
		setSubscription(expired);
		addToast('info', 'Subscription set to EXPIRED for testing.');
	}

	function handleQuickActivate() {
		const updated = subscriptionService.resetToActive();
		setSubscription(updated);
		addToast('success', 'Subscription activated!');
	}

	function formatDate(iso: string) {
		try {
			return new Date(iso).toLocaleDateString('en-IN', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		} catch {
			return iso;
		}
	}
</script>

<svelte:head>
	<title>Wholesale Subscription & Billing Gate | MedStock ERP</title>
</svelte:head>

<div class="space-y-6 pb-12">
	<PageHeader
		title="Wholesale ERP Subscription"
		subtitle="Manage your membership, payment status, and stockist license"
	>
		{#snippet actions()}
			<div class="flex gap-2">
				{#if active}
					<Button variant="secondary" size="sm" onclick={handleSimulateExpired}>
						Simulate Expired State
					</Button>
				{:else}
					<Button variant="primary" size="sm" onclick={handleQuickActivate}>
						Quick Activate (Demo)
					</Button>
				{/if}
			</div>
		{/snippet}
	</PageHeader>

	<!-- Status Card Banner -->
	{#if active}
		<div
			class="rounded-xl border border-success-light bg-success-light/40 p-6 shadow-2xs"
		>
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex items-start gap-4">
					<div class="rounded-full bg-success-light p-3 text-success">
						<ShieldCheck size={32} />
					</div>
					<div>
						<div class="flex items-center gap-2">
							<h2 class="text-lg font-bold text-text-primary">
								Subscription Active & Verified
							</h2>
							<Badge variant="success">PAID</Badge>
						</div>
						<p class="mt-1 text-sm text-text-secondary">
							Your wholesaler license for <span class="font-semibold text-text-primary"
								>{subscription.wholesalerName || 'MedStock Wholesale'}</span
							> is active. All inventory, billing, & LEDGER features unlocked.
						</p>
						<div class="mt-3 flex flex-wrap gap-4 text-xs text-text-muted">
							<span><strong class="text-text-secondary">Plan:</strong> {subscription.planName}</span>
							<span><strong class="text-text-secondary">Expires:</strong> {formatDate(subscription.expiresAt)}</span>
							<span><strong class="text-text-secondary">Txn ID:</strong> {subscription.transactionRef || 'N/A'}</span>
						</div>
					</div>
				</div>
				<div class="shrink-0">
					<Button variant="primary" onclick={() => handleOpenCheckout(SUBSCRIPTION_PLANS[1])}>
						Extend Subscription
					</Button>
				</div>
			</div>
		</div>
	{:else}
		<div
			class="rounded-xl border border-danger-light bg-danger-light/40 p-6 shadow-2xs"
		>
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex items-start gap-4">
					<div class="rounded-full bg-danger-light p-3 text-danger">
						<AlertTriangle size={32} />
					</div>
					<div>
						<div class="flex items-center gap-2">
							<h2 class="text-lg font-bold text-text-primary">
								Payment Required — Subscription Expired
							</h2>
							<Badge variant="danger">EXPIRED</Badge>
						</div>
						<p class="mt-1 text-sm text-text-secondary">
							Your MedStock ERP subscription is inactive. To create sales invoices, enter purchases,
							or manage stock, please select a plan and complete payment.
						</p>
					</div>
				</div>
				<div class="shrink-0">
					<Button variant="primary" onclick={() => handleOpenCheckout(SUBSCRIPTION_PLANS[1])}>
						Pay & Unlock Now
					</Button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Pricing Plans Grid -->
	<div class="space-y-4">
		<div class="text-center sm:text-left">
			<h2 class="text-xl font-bold text-text-primary">
				Select Your Wholesale ERP Plan
			</h2>
			<p class="text-xs text-text-muted">
				Choose the billing plan that fits your pharmaceutical wholesale stockist operations.
			</p>
		</div>

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			{#each SUBSCRIPTION_PLANS as plan}
				{@const isCurrentPlan = subscription.planId === plan.id && active}
				<div
					class="relative flex flex-col justify-between rounded-xl border p-6 shadow-2xs transition-all duration-200
					{plan.isPopular
						? 'border-accent bg-surface ring-2 ring-accent/20'
						: 'border-border bg-surface'}"
				>
					{#if plan.isPopular}
						<div
							class="absolute -top-3 right-6 flex items-center gap-1 rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-white shadow-2xs"
						>
							<Sparkles size={12} /> Most Popular
						</div>
					{/if}

					<div>
						<div class="flex items-center justify-between">
							<h3 class="text-lg font-bold text-text-primary">{plan.name}</h3>
							<span
								class="rounded border border-border bg-surface-secondary px-2 py-0.5 text-xs font-medium text-text-secondary"
							>
								{plan.billingCycle}
							</span>
						</div>

						<div class="mt-4 flex items-baseline gap-1">
							<span class="font-mono text-3xl font-extrabold text-text-primary tabular-nums">
								₹{plan.price.toLocaleString('en-IN')}
							</span>
							<span class="text-xs text-text-muted">
								{plan.billingCycle === 'One-time'
									? ' / lifetime'
									: ` / ${plan.billingCycle.toLowerCase()}`}
							</span>
						</div>

						<ul
							class="mt-6 space-y-3 border-t border-border-subtle pt-6 text-xs text-text-secondary"
						>
							{#each plan.features as feature}
								<li class="flex items-start gap-2.5">
									<CheckCircle2 size={16} class="mt-0.5 shrink-0 text-accent" />
									<span>{feature}</span>
								</li>
							{/each}
						</ul>
					</div>

					<div class="mt-8 pt-4">
						{#if isCurrentPlan}
							<Button variant="secondary" disabled class="w-full justify-center">
								Current Active Plan
							</Button>
						{:else}
							<Button
								variant={plan.isPopular ? 'primary' : 'secondary'}
								class="w-full justify-center"
								onclick={() => handleOpenCheckout(plan)}
							>
								{active ? 'Switch to this Plan' : 'Pay & Activate'}
							</Button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Payment Security Info Footer -->
	<div class="rounded-xl border border-border bg-surface p-6 shadow-2xs">
		<div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
			<div class="flex items-start gap-3">
				<div class="rounded-lg bg-accent-light p-2 text-accent">
					<Building2 size={20} />
				</div>
				<div>
					<h4 class="text-xs font-bold text-text-primary">
						Wholesale Compliant
					</h4>
					<p class="mt-0.5 text-xs text-text-muted">
						Includes GST tax invoice receipts for business expense deductions.
					</p>
				</div>
			</div>
			<div class="flex items-start gap-3">
				<div class="rounded-lg bg-success-light p-2 text-success">
					<ShieldCheck size={20} />
				</div>
				<div>
					<h4 class="text-xs font-bold text-text-primary">Instant Activation</h4>
					<p class="mt-0.5 text-xs text-text-muted">
						Immediate access to POS billing, stock registers, and ledgers post payment.
					</p>
				</div>
			</div>
			<div class="flex items-start gap-3">
				<div class="rounded-lg bg-info-light p-2 text-info">
					<Receipt size={20} />
				</div>
				<div>
					<h4 class="text-xs font-bold text-text-primary">Secure Billing</h4>
					<p class="mt-0.5 text-xs text-text-muted">
						Supports UPI, Net Banking, and Bank Cards with instant confirmation.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Checkout / Payment Modal -->
<Modal
	open={isPaymentModalOpen}
	onclose={() => (isPaymentModalOpen = false)}
	title="Complete Subscription Payment"
>
	<div class="space-y-4">
		<!-- Summary -->
		<div
			class="rounded-lg border border-accent-light/50 bg-accent-light/30 p-4"
		>
			<div class="flex justify-between text-sm">
				<span class="font-bold text-text-primary">{selectedPlan.name}</span>
				<span class="font-mono font-bold text-accent tabular-nums"
					>₹{selectedPlan.price.toLocaleString('en-IN')}</span
				>
			</div>
			<p class="mt-1 text-xs text-text-secondary">
				Validity: {selectedPlan.billingCycle}
			</p>
		</div>

		<!-- Wholesaler Details Form -->
		<div class="space-y-3">
			<h4 class="text-[11px] font-bold tracking-wider text-text-muted uppercase">
				Wholesaler Details
			</h4>
			<div>
				<label
					for="wholesaler-name-input"
					class="mb-1 block text-xs font-medium text-text-secondary"
				>
					Business / Stockist Name *
				</label>
				<input
					id="wholesaler-name-input"
					type="text"
					bind:value={wholesalerName}
					placeholder="e.g. Acme Pharma Stockist Pvt Ltd"
					class="w-full rounded-lg border border-border bg-surface p-2 text-xs font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
				/>
			</div>
			<div>
				<label
					for="gstin-input"
					class="mb-1 block text-xs font-medium text-text-secondary"
				>
					GSTIN Number (Optional)
				</label>
				<input
					id="gstin-input"
					type="text"
					bind:value={gstin}
					placeholder="27AAAAA0000A1Z5"
					class="w-full rounded-lg border border-border bg-surface p-2 text-xs font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
				/>
			</div>
		</div>

		<!-- Payment Method Selector -->
		<div class="space-y-3 pt-2">
			<h4 class="text-[11px] font-bold tracking-wider text-text-muted uppercase">
				Payment Gateway Selection
			</h4>

			<div class="grid grid-cols-3 gap-2">
				<button
					type="button"
					onclick={() => (paymentMethod = 'UPI')}
					class="flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium transition-colors
					{paymentMethod === 'UPI'
						? 'border-accent bg-accent-light/40 text-accent font-bold'
						: 'border-border bg-surface text-text-secondary hover:bg-surface-hover'}"
				>
					<QrCode size={20} />
					<span>UPI / QR</span>
				</button>
				<button
					type="button"
					onclick={() => (paymentMethod = 'Card')}
					class="flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium transition-colors
					{paymentMethod === 'Card'
						? 'border-accent bg-accent-light/40 text-accent font-bold'
						: 'border-border bg-surface text-text-secondary hover:bg-surface-hover'}"
				>
					<CreditCard size={20} />
					<span>Debit/Credit</span>
				</button>
				<button
					type="button"
					onclick={() => (paymentMethod = 'Net Banking')}
					class="flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium transition-colors
					{paymentMethod === 'Net Banking'
						? 'border-accent bg-accent-light/40 text-accent font-bold'
						: 'border-border bg-surface text-text-secondary hover:bg-surface-hover'}"
				>
					<Building2 size={20} />
					<span>Net Banking</span>
				</button>
			</div>

			{#if paymentMethod === 'UPI'}
				<div
					class="rounded-lg border border-border bg-surface-secondary p-3 text-center"
				>
					<label
						for="upi-vpa-input"
						class="mb-1 block text-xs font-semibold text-text-primary"
						>Scan QR Code or enter VPA ID</label
					>
					<div
						class="my-2 inline-flex h-28 w-28 items-center justify-center rounded-lg border border-border bg-surface p-2 font-mono text-xs text-text-muted shadow-2xs"
					>
						[ UPI QR CODE ]
					</div>
					<input
						id="upi-vpa-input"
						type="text"
						bind:value={upiId}
						class="w-full rounded-lg border border-border bg-surface p-2 text-center font-mono text-xs text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
					/>
				</div>
			{:else if paymentMethod === 'Card'}
				<div
					class="space-y-2 rounded-lg border border-border bg-surface-secondary p-3 text-xs"
				>
					<div>
						<label for="card-num-input" class="block text-xs font-medium text-text-secondary"
							>Card Number</label
						>
						<input
							id="card-num-input"
							type="text"
							bind:value={cardNumber}
							class="w-full rounded-lg border border-border bg-surface p-2 font-mono text-xs text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
						/>
					</div>
					<div class="grid grid-cols-2 gap-2">
						<div>
							<label for="card-exp-input" class="block text-xs font-medium text-text-secondary"
								>Expiry (MM/YY)</label
							>
							<input
								id="card-exp-input"
								type="text"
								value="08/28"
								class="w-full rounded-lg border border-border bg-surface p-2 font-mono text-xs text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
							/>
						</div>
						<div>
							<label for="card-cvv-input" class="block text-xs font-medium text-text-secondary">CVV</label>
							<input
								id="card-cvv-input"
								type="password"
								value="•••"
								class="w-full rounded-lg border border-border bg-surface p-2 font-mono text-xs text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
							/>
						</div>
					</div>
				</div>
			{:else}
				<div
					class="rounded-lg border border-border bg-surface-secondary p-3 text-xs"
				>
					<label for="bank-select" class="block text-xs font-medium text-text-secondary">Select Bank</label
					>
					<select
						id="bank-select"
						bind:value={selectedBank}
						class="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-xs font-medium text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
					>
						<option value="HDFC Bank">HDFC Bank Wholesale Corporate</option>
						<option value="ICICI Bank">ICICI Bank Business Banking</option>
						<option value="State Bank of India">State Bank of India (SBI)</option>
						<option value="Axis Bank">Axis Bank Commercial</option>
					</select>
				</div>
			{/if}
		</div>
	</div>

	{#snippet footer()}
		<div class="flex justify-end gap-2">
			<Button variant="secondary" onclick={() => (isPaymentModalOpen = false)}>Cancel</Button>
			<Button variant="primary" disabled={isProcessingPayment} onclick={handleProcessPayment}>
				{isProcessingPayment
					? 'Processing Payment...'
					: `Pay ₹${selectedPlan.price.toLocaleString('en-IN')}`}
			</Button>
		</div>
	{/snippet}
</Modal>
