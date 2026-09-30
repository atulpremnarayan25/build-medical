<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { PageHeader, LoadingState, Button } from '$lib/components/common/index.js';
	import SupplierSearch from '$lib/components/purchasing/SupplierSearch.svelte';
	import type { Supplier, Purchase, CreatePaymentInput, PaymentMethod } from '$lib/types/index.js';
	import { supplierService, purchaseService, paymentService } from '$lib/services/index.js';
	import { addToast } from '$lib/stores/toastStore.svelte.js';
	import { formatCurrency, numberToWordsRupees } from '$lib/utils/formatters.js';
	import { ArrowUpRight, Building2, Calendar, CreditCard, FileText } from '@lucide/svelte';

	let purchaseId = $state($page.url.searchParams.get('purchaseId') || '');
	let supplierIdParam = $state($page.url.searchParams.get('supplierId') || '');
	let purchase = $state<Purchase | null>(null);

	let selectedSupplier = $state<Supplier | null>(null);
	let amount = $state(0);
	let date = $state(new Date().toISOString().split('T')[0]);
	let paymentMethod = $state<PaymentMethod>('bank');
	let reference = $state('');
	let notes = $state('');

	let loading = $state(!!purchaseId || !!supplierIdParam);
	let isSaving = $state(false);

	let lockedSupplier = $derived(!!purchaseId && !!selectedSupplier);

	onMount(async () => {
		try {
			if (purchaseId) {
				purchase = await purchaseService.getPurchase(purchaseId);
				if (purchase) {
					amount = purchase.dueAmount;
					selectedSupplier = await supplierService.getSupplier(purchase.supplierId);
				}
			} else if (supplierIdParam) {
				selectedSupplier = await supplierService.getSupplier(supplierIdParam);
				if (selectedSupplier) {
					amount = selectedSupplier.outstandingBalance > 0 ? selectedSupplier.outstandingBalance : 0;
				}
			}
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	});

	async function handleSave() {
		if (!selectedSupplier) {
			addToast('error', 'Select a supplier');
			return;
		}

		if (amount <= 0) {
			addToast('error', 'Amount must be greater than ₹0.00');
			return;
		}

		isSaving = true;

		try {
			const payload: CreatePaymentInput = {
				type: 'made',
				partyId: selectedSupplier.id,
				partyType: 'supplier',
				invoiceId: purchase?.id,
				invoiceNumber: purchase?.invoiceNumber,
				amount,
				paymentMethod,
				reference,
				date,
				notes,
				createdBy: 'user-001'
			};

			await paymentService.createPayment(payload);
			addToast('success', `Payment voucher of ${formatCurrency(amount)} recorded successfully`);

			goto('/payments');
		} catch (e) {
			console.error(e);
			addToast('error', e instanceof Error ? e.message : 'Failed to save payment voucher');
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="mx-auto max-w-2xl space-y-4">
	<PageHeader
		title="Payment Voucher (Supplier Disbursement)"
		subtitle="Record outflow voucher against purchase invoice or on-account advance"
		backHref="/payments"
	>
		{#snippet actions()}
			<div class="flex gap-2">
				<Button variant="secondary" size="sm" onclick={() => goto('/payments')}>Cancel</Button>
				<Button variant="primary" size="sm" disabled={isSaving || !selectedSupplier || amount <= 0} onclick={handleSave}>
					<ArrowUpRight size={14} class="mr-1" />
					<span>{isSaving ? 'Recording...' : 'Record Payment Voucher'}</span>
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	{#if loading}
		<LoadingState message="Loading voucher context..." />
	{:else}
		<!-- Context Notification Banner -->
		{#if purchase}
			<div class="flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-text-primary">
				<FileText size={16} class="text-primary shrink-0" />
				<div>
					<span>Specific Invoice Settlement:</span>
					<strong class="font-mono text-primary ml-1">{purchase.invoiceNumber}</strong>
					<span class="text-text-muted ml-2">(Pending Invoice Due: <strong class="font-mono tabular-nums text-danger">{formatCurrency(purchase.dueAmount)}</strong>)</span>
				</div>
			</div>
		{:else}
			<div class="flex items-center gap-2.5 rounded-xl border border-border bg-surface-alt/50 p-3 text-xs text-text-secondary">
				<Building2 size={16} class="text-text-muted shrink-0" />
				<span>Payment will be credited against the supplier account ledger and settled against outstanding bills.</span>
			</div>
		{/if}

		<div class="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-2xs">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<!-- Supplier Selection & Ledger Status -->
				<div class="md:col-span-2 space-y-2">
					<span class="block text-xs font-bold uppercase tracking-wider text-text-muted">
						Supplier Account *
					</span>
					{#if lockedSupplier && selectedSupplier}
						<div class="flex items-center justify-between rounded-md border border-border bg-surface-alt px-3 py-2 text-xs font-semibold text-text-primary">
							<span>{selectedSupplier.name}</span>
							<span class="font-mono text-[11px] text-text-muted">{selectedSupplier.code || ''}</span>
						</div>
					{:else}
						<SupplierSearch onSelect={(s) => {
							selectedSupplier = s;
							if (s && amount === 0 && s.outstandingBalance > 0) {
								amount = s.outstandingBalance;
							}
						}} bind:selectedSupplier />
					{/if}

					{#if selectedSupplier}
						<div class="flex items-center justify-between rounded-md bg-surface-alt/70 px-3 py-1.5 text-xs">
							<span class="text-text-muted">Current Ledger Balance Payable:</span>
							<span class="font-mono font-bold tabular-nums {selectedSupplier.outstandingBalance > 0 ? 'text-danger' : 'text-text-primary'}">
								{formatCurrency(selectedSupplier.outstandingBalance)}
							</span>
						</div>
					{/if}
				</div>

				<!-- Amount -->
				<div>
					<label for="amount" class="mb-1 block text-xs font-medium text-text-secondary">
						Disbursement Amount (₹) *
					</label>
					<div class="relative">
						<span class="absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-bold text-text-muted">₹</span>
						<input
							id="amount"
							type="number"
							step="0.01"
							min="0"
							bind:value={amount}
							class="w-full rounded-md border border-border bg-surface py-1.5 pr-3 pl-7 font-mono text-sm font-bold text-danger tabular-nums focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
						/>
					</div>
				</div>

				<!-- Payment Date -->
				<div>
					<label for="date" class="mb-1 block text-xs font-medium text-text-secondary">
						Voucher Date *
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
						Payment Mode / Account *
					</label>
					<select
						id="method"
						bind:value={paymentMethod}
						class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
					>
						<option value="bank">Bank Transfer / RTGS / NEFT</option>
						<option value="upi">UPI / QR Code</option>
						<option value="cheque">Cheque / Demand Draft</option>
						<option value="cash">Cash in Hand</option>
					</select>
				</div>

				<!-- Reference No -->
				<div>
					<label for="ref" class="mb-1 block text-xs font-medium text-text-secondary">
						Txn / UTR / Cheque No.
					</label>
					<input
						id="ref"
						type="text"
						bind:value={reference}
						placeholder="e.g. UTR12849182 / CHQ-00129"
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
						placeholder="Add audit notes or remarks for this voucher..."
						class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
					></textarea>
				</div>
			</div>
		</div>
	{/if}
</div>
