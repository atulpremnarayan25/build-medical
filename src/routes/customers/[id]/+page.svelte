<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { PageHeader, LoadingState, EmptyState, Button, Badge } from '$lib/components/common/index.js';
	import CustomerForm from '$lib/components/forms/CustomerForm.svelte';
	import type { Customer, CreateCustomerInput } from '$lib/types/customer.js';
	import type { LedgerEntry } from '$lib/types/ledger.js';
	import { customerService, ledgerService } from '$lib/services/index.js';
	import { goto } from '$app/navigation';
	import { addToast } from '$lib/stores/toastStore.svelte.js';
	import { formatCurrency, formatDate } from '$lib/utils/formatters.js';
	import { Printer, MessageCircle, CreditCard, Clock, AlertTriangle, ShieldCheck, ArrowDownLeft } from '@lucide/svelte';

	let customerId = $derived($page.params.id as string);
	let customer = $state<Customer | null>(null);
	let ledgerEntries = $state<LedgerEntry[]>([]);
	let loading = $state(true);
	let isSaving = $state(false);

	let storeInfo = $state({
		name: 'MedStock Central Pharmacy',
		upiId: 'medstock@upi',
		phone: '9876543210',
		address: 'Main Market Road',
		gstin: '09AABBC1234D1Z5'
	});

	// FIFO Aging Breakdown
	let aging = $derived.by(() => {
		const balance = customer?.outstandingBalance || 0;
		if (balance <= 0) {
			return { current: 0, days30to60: 0, days60to90: 0, overdue: 0 };
		}

		// Sort sales chronological (oldest first)
		const sales = ledgerEntries
			.filter((e) => e.type === 'sale')
			.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

		// Total credits applied
		let totalCredit = ledgerEntries
			.filter((e) => e.type === 'payment-received' || e.type === 'sales-return')
			.reduce((sum, e) => sum + Number(e.credit || 0), 0);

		let current = 0;
		let days30to60 = 0;
		let days60to90 = 0;
		let overdue = 0;
		const now = Date.now();

		for (const sale of sales) {
			let unpaid = Number(sale.debit || 0);
			if (totalCredit >= unpaid) {
				totalCredit -= unpaid;
				continue;
			} else if (totalCredit > 0) {
				unpaid -= totalCredit;
				totalCredit = 0;
			}

			const ageDays = Math.floor((now - new Date(sale.date).getTime()) / (1000 * 60 * 60 * 24));
			if (ageDays < 30) {
				current += unpaid;
			} else if (ageDays <= 60) {
				days30to60 += unpaid;
			} else if (ageDays <= 90) {
				days60to90 += unpaid;
			} else {
				overdue += unpaid;
			}
		}

		// Allocate remaining unassigned balance to current bucket
		const allocated = current + days30to60 + days60to90 + overdue;
		if (allocated < balance) {
			current += balance - allocated;
		}

		return {
			current: Math.round(current * 100) / 100,
			days30to60: Math.round(days30to60 * 100) / 100,
			days60to90: Math.round(days60to90 * 100) / 100,
			overdue: Math.round(overdue * 100) / 100
		};
	});

	onMount(async () => {
		try {
			const [fetchedCustomer, fetchedLedger] = await Promise.all([
				customerService.getCustomer(customerId),
				ledgerService.getLedgerByParty(customerId, 'customer')
			]);
			customer = fetchedCustomer;

			// Sort chronological (oldest to newest for proper running balance display)
			ledgerEntries = [...fetchedLedger].sort(
				(a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
			);

			// Fetch store settings for WhatsApp and statement print header
			try {
				const res = await fetch('/api/settings');
				if (res.ok) {
					const data = await res.json();
					if (data) {
						storeInfo = {
							name: data.name || storeInfo.name,
							upiId: data.phone ? `${data.phone}@upi` : storeInfo.upiId,
							phone: data.phone || storeInfo.phone,
							address: data.address || storeInfo.address,
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

	async function handleSave(data: CreateCustomerInput) {
		isSaving = true;
		try {
			await customerService.updateCustomer(customerId, data);
			addToast('success', 'Customer updated successfully');
			goto('/customers');
		} catch (e) {
			console.error(e);
			addToast('error', 'Failed to update customer');
		} finally {
			isSaving = false;
		}
	}

	function handleCancel() {
		goto('/customers');
	}

	function printStatement() {
		window.print();
	}

	function sendWhatsAppStatement() {
		if (!customer) return;
		const rawPhone = customer.phone || '';
		const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
		if (!cleanPhone) {
			addToast('error', 'Customer does not have a valid contact phone number.');
			return;
		}

		const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
		const recentSale = [...ledgerEntries].reverse().find((e) => e.type === 'sale');
		const recentInvNo = recentSale?.reference || 'N/A';
		const todayDate = new Date().toLocaleDateString('en-IN', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
		const amountStr = (customer.outstandingBalance || 0).toLocaleString('en-IN', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		});

		const message = `Dear ${customer.name}, your outstanding balance with ${storeInfo.name} as of ${todayDate} is ₹${amountStr}. Recent invoice: ${recentInvNo}. Please clear dues via UPI at ${storeInfo.upiId}.`;
		const url = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(message)}`;
		window.open(url, '_blank');
	}

	function getVoucherLabel(type: string) {
		switch (type) {
			case 'sale':
				return 'Invoice';
			case 'payment-received':
				return 'Receipt';
			case 'sales-return':
				return 'Return';
			case 'credit-note':
				return 'Credit Note';
			case 'debit-note':
				return 'Debit Note';
			default:
				return type.replace('-', ' ').toUpperCase();
		}
	}

	function getVoucherBadgeClass(type: string) {
		switch (type) {
			case 'sale':
				return 'bg-accent-light text-accent border border-accent/20';
			case 'payment-received':
				return 'bg-success-light text-success border border-success/20';
			case 'sales-return':
				return 'bg-warning-light text-warning border border-warning/20';
			default:
				return 'bg-surface-secondary text-text-secondary';
		}
	}
</script>

<div class="mx-auto max-w-4xl space-y-4">
	<!-- Printable Header (visible only on print) -->
	<div class="hidden print:block print:mb-6 border-b pb-4">
		<div class="flex justify-between items-start">
			<div>
				<h1 class="text-2xl font-bold text-black">{storeInfo.name}</h1>
				<p class="text-sm text-gray-600">{storeInfo.address}</p>
				{#if storeInfo.gstin}<p class="text-xs text-gray-500 font-mono">GSTIN: {storeInfo.gstin}</p>{/if}
				{#if storeInfo.phone}<p class="text-xs text-gray-500">Phone: {storeInfo.phone}</p>{/if}
			</div>
			<div class="text-right">
				<h2 class="text-lg font-bold uppercase tracking-wider text-black">Customer Account Statement</h2>
				<p class="text-xs text-gray-500">Generated: {new Date().toLocaleString('en-IN')}</p>
				<p class="text-xs font-mono font-bold mt-1">UPI ID: {storeInfo.upiId}</p>
			</div>
		</div>

		{#if customer}
			<div class="mt-4 grid grid-cols-2 gap-4 rounded border p-3 bg-gray-50 text-xs">
				<div>
					<p class="font-bold text-gray-700">Account: {customer.name}</p>
					{#if customer.phone}<p>Phone: {customer.phone}</p>{/if}
					{#if customer.address}<p>Address: {customer.address}</p>{/if}
				</div>
				<div class="text-right">
					{#if customer.gstin}<p class="font-mono">GSTIN: {customer.gstin}</p>{/if}
					<p class="font-bold text-sm text-gray-900 mt-1">
						Closing Balance: ₹{(customer.outstandingBalance || 0).toLocaleString('en-IN', {
							minimumFractionDigits: 2
						})} Dr
					</p>
				</div>
			</div>
		{/if}
	</div>

	<!-- Interactive Page Header -->
	<div class="no-print">
		<PageHeader
			title={customer ? `Customer Khata: ${customer.name}` : 'Customer Details'}
			backHref="/customers"
		>
			{#snippet actions()}
				<div class="flex flex-wrap gap-2">
					<Button
						variant="secondary"
						size="sm"
						onclick={sendWhatsAppStatement}
						class="flex items-center gap-1.5 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border-[#25D366]/30"
					>
						<MessageCircle size={14} />
						<span>Send WhatsApp Statement</span>
					</Button>
					<Button
						variant="secondary"
						size="sm"
						onclick={printStatement}
						class="flex items-center gap-1.5"
					>
						<Printer size={14} />
						<span>Print Account Statement</span>
					</Button>
					<Button
						variant="primary"
						size="sm"
						onclick={() => goto(`/payments/receive?customerId=${customer?.id}`)}
						class="flex items-center gap-1.5"
					>
						<ArrowDownLeft size={14} />
						<span>Record Payment Receipt</span>
					</Button>
				</div>
			{/snippet}
		</PageHeader>
	</div>

	{#if loading}
		<LoadingState message="Loading customer account details and ledger..." />
	{:else if !customer}
		<EmptyState title="Not Found" message="The customer you are looking for does not exist." />
	{:else}
		<!-- Aging Breakdown Cards -->
		<div class="space-y-1.5">
			<div class="flex items-center justify-between px-1">
				<h3 class="text-[11px] font-bold uppercase tracking-wider text-text-muted">
					Outstanding Receivables Aging Analysis
				</h3>
				<span class="text-[11px] font-mono text-text-muted">FIFO Bill Settlement</span>
			</div>
			<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
				<!-- Current (< 30 days) -->
				<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
					<div class="flex items-center justify-between">
						<span class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Current (&lt;30d)</span>
						<ShieldCheck size={14} class="text-success" />
					</div>
					<p class="mt-1 font-mono text-base font-bold tabular-nums text-text-primary">
						{formatCurrency(aging.current)}
					</p>
					<p class="text-[10px] text-text-muted">Within credit terms</p>
				</div>

				<!-- 30-60 days -->
				<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
					<div class="flex items-center justify-between">
						<span class="text-[10px] font-bold uppercase tracking-wider text-text-muted">30-60 Days</span>
						<Clock size={14} class="text-info" />
					</div>
					<p class="mt-1 font-mono text-base font-bold tabular-nums text-text-primary">
						{formatCurrency(aging.days30to60)}
					</p>
					<p class="text-[10px] text-text-muted">Follow-up due</p>
				</div>

				<!-- 60-90 days -->
				<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
					<div class="flex items-center justify-between">
						<span class="text-[10px] font-bold uppercase tracking-wider text-text-muted">60-90 Days</span>
						<AlertTriangle size={14} class="text-warning" />
					</div>
					<p class="mt-1 font-mono text-base font-bold tabular-nums text-warning">
						{formatCurrency(aging.days60to90)}
					</p>
					<p class="text-[10px] text-text-muted">Overdue debt</p>
				</div>

				<!-- Overdue (> 90 days) -->
				<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
					<div class="flex items-center justify-between">
						<span class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Overdue (&gt;90d)</span>
						<AlertTriangle size={14} class="text-danger" />
					</div>
					<p class="mt-1 font-mono text-base font-bold tabular-nums text-danger">
						{formatCurrency(aging.overdue)}
					</p>
					<p class="text-[10px] text-text-muted">Critical recovery</p>
				</div>
			</div>
		</div>

		<!-- Quick Stats Area -->
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 no-print">
			<div class="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
				<div>
					<p class="text-[11px] font-bold uppercase tracking-wider text-text-muted">Total Outstanding Balance (Khata)</p>
					<h3
						class="text-xl font-bold font-mono tabular-nums {customer.outstandingBalance > 0
							? 'text-warning'
							: 'text-text-primary'} mt-0.5"
					>
						{formatCurrency(customer.outstandingBalance)} {customer.outstandingBalance > 0 ? 'Dr' : ''}
					</h3>
				</div>
				<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-warning-light text-warning">
					<CreditCard size={18} />
				</div>
			</div>

			<div class="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
				<div>
					<p class="text-[11px] font-bold uppercase tracking-wider text-text-muted">Approved Credit Limit</p>
					<h3 class="mt-0.5 text-xl font-bold font-mono tabular-nums text-text-primary">
						{formatCurrency(customer.creditLimit)}
					</h3>
				</div>
				<div class="text-right text-[11px] text-text-muted">
					{#if customer.creditLimit && customer.creditLimit > 0}
						{@const available = customer.creditLimit - (customer.outstandingBalance || 0)}
						<span>Available Credit: </span>
						<strong class="font-mono {available >= 0 ? 'text-success' : 'text-danger'}">
							{formatCurrency(available)}
						</strong>
					{:else}
						<span>No limit configured</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Chronological Double-Entry Ledger Table -->
		<div class="overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
			<div
				class="flex items-center justify-between border-b border-border bg-surface-secondary px-4 py-2.5"
			>
				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider text-text-primary">
						Double-Entry Khata Account Ledger
					</h3>
					<p class="text-[11px] text-text-muted">Chronological audit trail with live running balance</p>
				</div>
				<div class="no-print">
					<Badge variant="neutral" size="sm">
						{ledgerEntries.length} Voucher{ledgerEntries.length === 1 ? '' : 's'}
					</Badge>
				</div>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs print:text-[10px]">
					<thead
						class="border-b border-border bg-surface-secondary text-[10px] font-bold uppercase tracking-wider text-text-muted"
					>
						<tr>
							<th class="px-3 py-2.5">Date</th>
							<th class="px-3 py-2.5">Voucher Type</th>
							<th class="px-3 py-2.5">Particulars / Ref No</th>
							<th class="px-3 py-2.5 text-right">Debit (₹)</th>
							<th class="px-3 py-2.5 text-right">Credit (₹)</th>
							<th class="px-3 py-2.5 text-right">Running Balance (₹)</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border-subtle">
						{#if ledgerEntries.length === 0}
							<tr>
								<td colspan="6" class="px-4 py-8 text-center text-text-muted">
									No transaction vouchers recorded in Khata ledger for this customer.
								</td>
							</tr>
						{:else}
							{#each ledgerEntries as entry (entry.id)}
								<tr class="transition-colors hover:bg-surface-hover">
									<td class="px-3 py-2 whitespace-nowrap font-mono text-text-secondary">
										{formatDate(entry.date)}
									</td>
									<td class="px-3 py-2">
										<span
											class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider {getVoucherBadgeClass(
												entry.type
											)}"
										>
											{getVoucherLabel(entry.type)}
										</span>
									</td>
									<td class="px-3 py-2">
										{#if entry.type === 'sale'}
											<a
												href="/sales/{entry.reference}"
												class="font-medium text-accent hover:underline"
											>
												{entry.particulars}
											</a>
										{:else}
											<span class="text-text-primary font-medium">{entry.particulars}</span>
										{/if}
										{#if entry.reference && entry.type !== 'sale'}
											<span class="ml-1 text-[10px] font-mono text-text-muted">[{entry.reference}]</span>
										{/if}
									</td>
									<td class="px-3 py-2 text-right font-mono tabular-nums text-text-primary">
										{entry.debit ? formatCurrency(entry.debit) : '-'}
									</td>
									<td class="px-3 py-2 text-right font-mono tabular-nums text-success">
										{entry.credit ? formatCurrency(entry.credit) : '-'}
									</td>
									<td
										class="px-3 py-2 text-right font-mono font-bold tabular-nums {entry.balance > 0
											? 'text-warning'
											: 'text-text-primary'}"
									>
										{formatCurrency(entry.balance)} {entry.balance > 0 ? 'Dr' : entry.balance < 0 ? 'Cr' : ''}
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
					{#if ledgerEntries.length > 0}
						<tfoot class="border-t-2 border-border bg-surface-secondary font-bold">
							<tr>
								<td colspan="3" class="px-3 py-2.5 text-right uppercase text-[11px] text-text-secondary">
									Total / Net Outstanding Balance:
								</td>
								<td class="px-3 py-2.5 text-right font-mono tabular-nums text-text-primary">
									{formatCurrency(
										ledgerEntries.reduce((acc, cur) => acc + Number(cur.debit || 0), 0)
									)}
								</td>
								<td class="px-3 py-2.5 text-right font-mono tabular-nums text-success">
									{formatCurrency(
										ledgerEntries.reduce((acc, cur) => acc + Number(cur.credit || 0), 0)
									)}
								</td>
								<td
									class="px-3 py-2.5 text-right font-mono tabular-nums text-warning"
								>
									{formatCurrency(customer.outstandingBalance)} Dr
								</td>
							</tr>
						</tfoot>
					{/if}
				</table>
			</div>
		</div>

		<!-- Customer Details & Edit Form (hidden in print view) -->
		<div class="no-print pt-2">
			<CustomerForm {customer} onSave={handleSave} onCancel={handleCancel} {isSaving} />
		</div>
	{/if}
</div>

<style>
	@media print {
		:global(body) {
			background: white !important;
			color: black !important;
		}
		.no-print {
			display: none !important;
		}
	}
</style>
