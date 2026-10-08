<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { PageHeader, LoadingState, Button } from '$lib/components/common/index.js';
	import SupplierSearch from '$lib/components/purchasing/SupplierSearch.svelte';
	import PrintableReceiptSlip, { type ReceiptSlipData, type StoreInfo } from '$lib/components/billing/PrintableReceiptSlip.svelte';
	import type { Supplier, Purchase, CreatePaymentInput, PaymentMethod } from '$lib/types/index.js';
	import { supplierService, purchaseService, paymentService } from '$lib/services/index.js';
	import { addToast } from '$lib/stores/toastStore.svelte.js';
	import { formatCurrency, numberToWordsRupees } from '$lib/utils/formatters.js';
	import { ArrowUpRight, Building2, Calendar, CreditCard, FileText, Printer, CheckCircle, RotateCcw, BookOpen } from '@lucide/svelte';

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
	let recordedSlip = $state<ReceiptSlipData | null>(null);

	let storeInfo = $state<StoreInfo>({
		name: 'MedStock Pharmacy',
		address: '123 Healthcare Road, Medical Square',
		phone: '+91 98765 43210',
		gstin: '29ABCDE1234F1Z5'
	});

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

			// Fetch store settings for voucher header
			try {
				const res = await fetch('/api/settings');
				if (res.ok) {
					const data = await res.json();
					if (data) {
						storeInfo = {
							name: data.name || storeInfo.name,
							address: data.address || storeInfo.address,
							phone: data.phone || storeInfo.phone,
							gstin: data.gstin || storeInfo.gstin
						};
					}
				}
			} catch (_) {}
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

			const payment = await paymentService.createPayment(payload);
			addToast('success', `Payment voucher of ${formatCurrency(amount)} recorded successfully`);

			const prevBal = selectedSupplier.outstandingBalance || 0;
			const newBal = Math.max(0, prevBal - amount);

			recordedSlip = {
				receiptNumber: `PAY-${new Date().getFullYear()}-${payment.id ? payment.id.slice(0, 8).toUpperCase() : Math.floor(100000 + Math.random() * 900000)}`,
				date,
				partyName: selectedSupplier.name,
				partyCode: selectedSupplier.code,
				partyPhone: selectedSupplier.phone,
				partyType: 'supplier',
				amount,
				paymentMethod: paymentMethod.toUpperCase(),
				reference,
				notes,
				previousBalance: prevBal,
				newBalance: newBal,
				invoiceNumber: purchase?.invoiceNumber
			};
		} catch (e) {
			console.error(e);
			addToast('error', e instanceof Error ? e.message : 'Failed to save payment voucher');
		} finally {
			isSaving = false;
		}
	}

	function handlePrintSlip() {
		window.print();
	}

	function handleReset() {
		recordedSlip = null;
		amount = 0;
		reference = '';
		notes = '';
		if (!lockedSupplier) {
			selectedSupplier = null;
		}
	}
</script>

<!-- Hidden Printable Voucher Component for window.print() -->
<PrintableReceiptSlip slip={recordedSlip} store={storeInfo} />

<div class="mx-auto max-w-2xl space-y-4 no-print">
	<PageHeader
		title="Payment Voucher (Supplier Disbursement)"
		subtitle="Record outflow voucher against purchase invoice or on-account advance"
		backHref="/payments"
	>
		{#snippet actions()}
			<div class="flex gap-2">
				{#if recordedSlip}
					<Button variant="secondary" size="sm" onclick={handleReset}>
						<RotateCcw size={14} class="mr-1" />
						<span>Record Another</span>
					</Button>
					<Button variant="primary" size="sm" onclick={handlePrintSlip}>
						<Printer size={14} class="mr-1" />
						<span>Print Voucher</span>
					</Button>
				{:else}
					<Button variant="secondary" size="sm" onclick={() => goto('/payments')}>Cancel</Button>
					<Button variant="primary" size="sm" disabled={isSaving || !selectedSupplier || amount <= 0} onclick={handleSave}>
						<ArrowUpRight size={14} class="mr-1" />
						<span>{isSaving ? 'Recording...' : 'Record Payment Voucher'}</span>
					</Button>
				{/if}
			</div>
		{/snippet}
	</PageHeader>

	{#if loading}
		<LoadingState message="Loading voucher context..." />
	{:else if recordedSlip}
		<!-- SUCCESS / DISBURSEMENT VOUCHER PREVIEW -->
		<div class="rounded-xl border border-success/30 bg-success/5 p-4 space-y-4">
			<div class="flex items-center justify-between border-b border-success/20 pb-3">
				<div class="flex items-center gap-2">
					<CheckCircle size={20} class="text-success shrink-0" />
					<div>
						<h3 class="text-sm font-bold text-text-primary">Disbursement Voucher Successfully Recorded</h3>
						<p class="text-xs text-text-muted">Applied to vendor ledger and settled against outstanding purchase bills (FIFO).</p>
					</div>
				</div>
				<Button variant="primary" size="sm" onclick={handlePrintSlip}>
					<Printer size={14} class="mr-1" />
					<span>Print Voucher</span>
				</Button>
			</div>

			<!-- On-Screen Voucher Card -->
			<div class="rounded-lg border border-border bg-surface p-4 shadow-xs space-y-3 font-sans">
				<div class="flex justify-between items-start border-b border-border pb-3">
					<div>
						<span class="text-xs font-mono font-bold text-primary">{recordedSlip.receiptNumber}</span>
						<h4 class="text-base font-bold text-text-primary">{recordedSlip.partyName}</h4>
						<p class="text-xs text-text-muted">{recordedSlip.partyPhone || ''}</p>
					</div>
					<div class="text-right">
						<span class="text-xs text-text-muted">Voucher Date</span>
						<p class="text-xs font-mono font-semibold text-text-primary">{recordedSlip.date}</p>
						<span class="inline-block mt-1 rounded bg-surface-alt px-2 py-0.5 font-mono text-[11px] font-bold uppercase text-text-secondary">
							{recordedSlip.paymentMethod}
						</span>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3 text-xs">
					<div class="space-y-1">
						{#if recordedSlip.reference}
							<div class="flex justify-between">
								<span class="text-text-muted">Txn / UTR / Cheque:</span>
								<span class="font-mono font-medium">{recordedSlip.reference}</span>
							</div>
						{/if}
						{#if recordedSlip.invoiceNumber}
							<div class="flex justify-between">
								<span class="text-text-muted">Purchase Bill:</span>
								<span class="font-mono font-medium text-primary">{recordedSlip.invoiceNumber}</span>
							</div>
						{/if}
						{#if recordedSlip.notes}
							<div class="text-text-secondary text-[11px] italic">
								"{recordedSlip.notes}"
							</div>
						{/if}
					</div>

					<div class="space-y-1 rounded-md bg-surface-alt/70 p-2.5">
						<div class="flex justify-between text-text-muted">
							<span>Previous Payable:</span>
							<span class="font-mono">{formatCurrency(recordedSlip.previousBalance)}</span>
						</div>
						<div class="flex justify-between font-bold text-danger">
							<span>Amount Disbursed:</span>
							<span class="font-mono">{formatCurrency(recordedSlip.amount)}</span>
						</div>
						<div class="flex justify-between border-t border-border/80 pt-1 font-bold text-text-primary">
							<span>Closing Payable:</span>
							<span class="font-mono">{formatCurrency(recordedSlip.newBalance)}</span>
						</div>
					</div>
				</div>

				<div class="rounded bg-surface-alt/40 px-3 py-1.5 text-[11px] italic text-text-secondary">
					Amount in Words: <strong class="font-medium text-text-primary not-italic">{numberToWordsRupees(recordedSlip.amount)}</strong>
				</div>
			</div>

			<!-- Quick Actions -->
			<div class="flex flex-wrap gap-2 pt-1">
				<Button variant="primary" onclick={handlePrintSlip}>
					<Printer size={15} class="mr-1.5" />
					<span>Print Voucher Slip</span>
				</Button>
				{#if selectedSupplier}
					<Button variant="secondary" onclick={() => selectedSupplier && goto(`/suppliers/${selectedSupplier.id}`)}>
						<BookOpen size={15} class="mr-1.5" />
						<span>View Vendor Ledger</span>
					</Button>
				{/if}
				<Button variant="secondary" onclick={handleReset}>
					<RotateCcw size={15} class="mr-1.5" />
					<span>Record Another</span>
				</Button>
				<Button variant="ghost" onclick={() => goto('/payments')}>
					<span>Back to Payments</span>
				</Button>
			</div>
		</div>
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
				<span>Payment will be debited against supplier account ledger and settled against outstanding bills (FIFO).</span>
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

<style>
	@media print {
		.no-print {
			display: none !important;
		}
	}
</style>
