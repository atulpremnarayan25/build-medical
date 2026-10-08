<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { PageHeader, LoadingState, Button } from '$lib/components/common/index.js';
	import CustomerSearch from '$lib/components/billing/CustomerSearch.svelte';
	import PrintableReceiptSlip, { type ReceiptSlipData, type StoreInfo } from '$lib/components/billing/PrintableReceiptSlip.svelte';
	import type { Customer, Sale, CreatePaymentInput, PaymentMethod } from '$lib/types/index.js';
	import { customerService, saleService, paymentService } from '$lib/services/index.js';
	import { addToast } from '$lib/stores/toastStore.svelte.js';
	import { formatCurrency, numberToWordsRupees } from '$lib/utils/formatters.js';
	import { ArrowDownLeft, UserCheck, Calendar, CreditCard, FileText, Printer, CheckCircle, RotateCcw, BookOpen } from '@lucide/svelte';

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
	let recordedSlip = $state<ReceiptSlipData | null>(null);

	let storeInfo = $state<StoreInfo>({
		name: 'MedStock Pharmacy',
		address: '123 Healthcare Road, Medical Square',
		phone: '+91 98765 43210',
		gstin: '29ABCDE1234F1Z5'
	});

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

			// Fetch store settings for receipt slip header
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

			const payment = await paymentService.createPayment(payload);
			addToast('success', `Receipt voucher of ${formatCurrency(amount)} recorded successfully`);

			// Prepare receipt slip data for one-click printing
			const prevBal = selectedCustomer.outstandingBalance || 0;
			const newBal = Math.max(0, prevBal - amount);

			recordedSlip = {
				receiptNumber: `RCP-${new Date().getFullYear()}-${payment.id ? payment.id.slice(0, 8).toUpperCase() : Math.floor(100000 + Math.random() * 900000)}`,
				date,
				partyName: selectedCustomer.name,
				partyCode: selectedCustomer.code,
				partyPhone: selectedCustomer.phone,
				partyType: 'customer',
				amount,
				paymentMethod: paymentMethod.toUpperCase(),
				reference,
				notes,
				previousBalance: prevBal,
				newBalance: newBal,
				invoiceNumber: sale?.invoiceNumber
			};
		} catch (e) {
			console.error(e);
			addToast('error', e instanceof Error ? e.message : 'Failed to save receipt voucher');
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
		if (!lockedCustomer) {
			selectedCustomer = null;
		}
	}
</script>

<!-- Hidden Printable Slip Component for window.print() -->
<PrintableReceiptSlip slip={recordedSlip} store={storeInfo} />

<div class="mx-auto max-w-2xl space-y-4 no-print">
	<PageHeader
		title="Receipt Voucher (Customer Inflow)"
		subtitle="Record incoming payment against sales invoice or customer ledger"
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
						<span>Print Receipt Slip</span>
					</Button>
				{:else}
					<Button variant="secondary" size="sm" onclick={() => goto('/payments')}>Cancel</Button>
					<Button variant="primary" size="sm" disabled={isSaving || !selectedCustomer || amount <= 0} onclick={handleSave}>
						<ArrowDownLeft size={14} class="mr-1" />
						<span>{isSaving ? 'Recording...' : 'Record Receipt Voucher'}</span>
					</Button>
				{/if}
			</div>
		{/snippet}
	</PageHeader>

	{#if loading}
		<LoadingState message="Loading voucher context..." />
	{:else if recordedSlip}
		<!-- SUCCESS / RECEIPT SLIP PREVIEW -->
		<div class="rounded-xl border border-success/30 bg-success/5 p-4 space-y-4">
			<div class="flex items-center justify-between border-b border-success/20 pb-3">
				<div class="flex items-center gap-2">
					<CheckCircle size={20} class="text-success shrink-0" />
					<div>
						<h3 class="text-sm font-bold text-text-primary">Payment Voucher Successfully Recorded</h3>
						<p class="text-xs text-text-muted">Applied to customer ledger with FIFO settlement across unpaid invoices.</p>
					</div>
				</div>
				<Button variant="primary" size="sm" onclick={handlePrintSlip}>
					<Printer size={14} class="mr-1" />
					<span>Print Receipt Slip</span>
				</Button>
			</div>

			<!-- On-Screen Slip Card -->
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
								<span class="text-text-muted">Ref / UTR:</span>
								<span class="font-mono font-medium">{recordedSlip.reference}</span>
							</div>
						{/if}
						{#if recordedSlip.invoiceNumber}
							<div class="flex justify-between">
								<span class="text-text-muted">Settled Against:</span>
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
							<span>Previous Due:</span>
							<span class="font-mono">{formatCurrency(recordedSlip.previousBalance)}</span>
						</div>
						<div class="flex justify-between font-bold text-success">
							<span>Amount Received:</span>
							<span class="font-mono">{formatCurrency(recordedSlip.amount)}</span>
						</div>
						<div class="flex justify-between border-t border-border/80 pt-1 font-bold text-text-primary">
							<span>Remaining Balance:</span>
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
					<span>Print Receipt Slip</span>
				</Button>
				{#if selectedCustomer}
					<Button variant="secondary" onclick={() => selectedCustomer && goto(`/customers/${selectedCustomer.id}`)}>
						<BookOpen size={15} class="mr-1.5" />
						<span>View Customer Ledger</span>
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
				<span>Payment will be credited to customer account ledger and settled against oldest unpaid invoices (FIFO).</span>
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

<style>
	@media print {
		.no-print {
			display: none !important;
		}
	}
</style>
