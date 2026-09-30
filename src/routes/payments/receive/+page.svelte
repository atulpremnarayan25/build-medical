<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { PageHeader, LoadingState, Button } from '$lib/components/common/index.js';
	import CustomerSearch from '$lib/components/billing/CustomerSearch.svelte';
	import type { Customer, Sale, CreatePaymentInput, PaymentMethod } from '$lib/types/index.js';
	import { customerService, saleService, paymentService } from '$lib/services/index.js';
	import { addToast } from '$lib/stores/toastStore.svelte.js';
	import { formatCurrency, numberToWordsRupees } from '$lib/utils/formatters.js';
	import { ArrowDownLeft, UserCheck, Calendar, CreditCard, FileText } from '@lucide/svelte';

	let saleId = $state($page.url.searchParams.get('saleId') || '');
	let customerIdParam = $state($page.url.searchParams.get('customerId') || '');
	let sale = $state<Sale | null>(null);

	let selectedCustomer = $state<Customer | null>(null);
	let amount = $state(0);
	let date = $state(new Date().toISOString().split('T')[0]);
	let paymentMethod = $state<PaymentMethod>('cash');
	let reference = $state('');
	let notes = $state('');

	let loading = $state(!!saleId || !!customerIdParam);
	let isSaving = $state(false);

	let lockedCustomer = $derived(!!saleId && !!selectedCustomer);

	onMount(async () => {
		try {
			if (saleId) {
				sale = await saleService.getSale(saleId);
				if (sale) {
					amount = sale.dueAmount;
					selectedCustomer = await customerService.getCustomer(sale.customerId);
				}
			} else if (customerIdParam) {
				selectedCustomer = await customerService.getCustomer(customerIdParam);
				if (selectedCustomer) {
					amount = selectedCustomer.outstandingBalance > 0 ? selectedCustomer.outstandingBalance : 0;
				}
			}
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	});

	async function handleSave() {
		if (!selectedCustomer) {
			addToast('error', 'Select a customer');
			return;
		}

		if (amount <= 0) {
			addToast('error', 'Amount must be greater than ₹0.00');
			return;
		}

		isSaving = true;

		try {
			const payload: CreatePaymentInput = {
				type: 'received',
				partyId: selectedCustomer.id,
				partyType: 'customer',
				invoiceId: sale?.id,
				invoiceNumber: sale?.invoiceNumber,
				amount,
				paymentMethod,
				reference,
				date,
				notes,
				createdBy: 'user-001'
			};

			await paymentService.createPayment(payload);
			addToast('success', `Receipt voucher of ${formatCurrency(amount)} recorded successfully`);

			goto('/payments');
		} catch (e) {
			console.error(e);
			addToast('error', e instanceof Error ? e.message : 'Failed to save receipt voucher');
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="mx-auto max-w-2xl space-y-4">
	<PageHeader
		title="Receipt Voucher (Customer Inflow)"
		subtitle="Record incoming payment against sales invoice or customer ledger"
		backHref="/payments"
	>
		{#snippet actions()}
			<div class="flex gap-2">
				<Button variant="secondary" size="sm" onclick={() => goto('/payments')}>Cancel</Button>
				<Button variant="primary" size="sm" disabled={isSaving || !selectedCustomer || amount <= 0} onclick={handleSave}>
					<ArrowDownLeft size={14} class="mr-1" />
					<span>{isSaving ? 'Recording...' : 'Record Receipt Voucher'}</span>
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	{#if loading}
		<LoadingState message="Loading voucher context..." />
	{:else}
		<!-- Context Notification Banner -->
		{#if sale}
			<div class="flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-text-primary">
				<FileText size={16} class="text-primary shrink-0" />
				<div>
					<span>Specific Sales Invoice Settlement:</span>
					<strong class="font-mono text-primary ml-1">{sale.invoiceNumber}</strong>
					<span class="text-text-muted ml-2">(Pending Invoice Due: <strong class="font-mono tabular-nums text-danger">{formatCurrency(sale.dueAmount)}</strong>)</span>
				</div>
			</div>
		{:else}
			<div class="flex items-center gap-2.5 rounded-xl border border-border bg-surface-alt/50 p-3 text-xs text-text-secondary">
				<UserCheck size={16} class="text-text-muted shrink-0" />
				<span>Payment will be credited to customer account ledger and settled against oldest unpaid invoices.</span>
			</div>
		{/if}

		<div class="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-2xs">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<!-- Customer Selection & Ledger Status -->
				<div class="md:col-span-2 space-y-2">
					<span class="block text-xs font-bold uppercase tracking-wider text-text-muted">
						Customer Account *
					</span>
					{#if lockedCustomer && selectedCustomer}
						<div class="flex items-center justify-between rounded-md border border-border bg-surface-alt px-3 py-2 text-xs font-semibold text-text-primary">
							<span>{selectedCustomer.name}</span>
							<span class="font-mono text-[11px] text-text-muted">{selectedCustomer.code || ''}</span>
						</div>
					{:else}
						<CustomerSearch onSelect={(c) => {
							selectedCustomer = c;
							if (c && amount === 0 && c.outstandingBalance > 0) {
								amount = c.outstandingBalance;
							}
						}} bind:selectedCustomer />
					{/if}

					{#if selectedCustomer}
						<div class="flex items-center justify-between rounded-md bg-surface-alt/70 px-3 py-1.5 text-xs">
							<span class="text-text-muted">Current Ledger Balance Due:</span>
							<span class="font-mono font-bold tabular-nums {selectedCustomer.outstandingBalance > 0 ? 'text-danger' : 'text-text-primary'}">
								{formatCurrency(selectedCustomer.outstandingBalance)}
							</span>
						</div>
					{/if}
				</div>

				<!-- Amount -->
				<div>
					<label for="amount" class="mb-1 block text-xs font-medium text-text-secondary">
						Amount Received (₹) *
					</label>
					<div class="relative">
						<span class="absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-bold text-text-muted">₹</span>
						<input
							id="amount"
							type="number"
							step="0.01"
							min="0"
							bind:value={amount}
							class="w-full rounded-md border border-border bg-surface py-1.5 pr-3 pl-7 font-mono text-sm font-bold text-success tabular-nums focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
						/>
					</div>
				</div>

				<!-- Payment Date -->
				<div>
					<label for="date" class="mb-1 block text-xs font-medium text-text-secondary">
						Receipt Date *
					</label>
					<input
						id="date"
						type="date"
						bind:value={date}
						class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs text-text-primary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
					/>
				</div>

				<!-- Amount in Words Preview -->
				{#if amount > 0}
					<div class="md:col-span-2 rounded-md bg-surface-alt/50 px-3 py-2 text-[11px] border border-border/60">
						<span class="font-semibold text-text-muted uppercase tracking-wider text-[10px]">Amount in Words: </span>
						<span class="font-medium text-text-primary italic">{numberToWordsRupees(amount)}</span>
					</div>
				{/if}

				<!-- Payment Method -->
				<div>
					<label for="method" class="mb-1 block text-xs font-medium text-text-secondary">
						Receipt Mode / Bank Account *
					</label>
					<select
						id="method"
						bind:value={paymentMethod}
						class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
					>
						<option value="cash">Cash in Hand</option>
						<option value="upi">UPI / QR Code</option>
						<option value="bank">Bank Transfer / NEFT / IMPS</option>
						<option value="cheque">Cheque / Demand Draft</option>
					</select>
				</div>

				<!-- Reference No -->
				<div>
					<label for="ref" class="mb-1 block text-xs font-medium text-text-secondary">
						Txn / UTR / Cheque Ref No.
					</label>
					<input
						id="ref"
						type="text"
						bind:value={reference}
						placeholder="e.g. UPI Ref / Cheque No."
						class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
					/>
				</div>

				<!-- Notes / Particulars -->
				<div class="md:col-span-2">
					<label for="notes" class="mb-1 block text-xs font-medium text-text-secondary">
						Narration / Particulars
					</label>
					<textarea
						id="notes"
						rows="2"
						bind:value={notes}
						placeholder="Add audit notes or receipt particulars..."
						class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
					></textarea>
				</div>
			</div>
		</div>
	{/if}
</div>
