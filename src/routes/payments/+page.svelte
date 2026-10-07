<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { paymentService } from '$lib/services/index.js';
	import type { Payment } from '$lib/types/index.js';
	import {
		PageHeader,
		LoadingState,
		EmptyState,
		Badge,
		Button
	} from '$lib/components/common/index.js';
	import DataTable from '$lib/components/tables/DataTable.svelte';
	import Pagination from '$lib/components/tables/Pagination.svelte';
	import { Search, ArrowDownLeft, ArrowUpRight, CreditCard, Banknote, ArrowRightLeft } from '@lucide/svelte';
	import { formatCurrency, formatDate } from '$lib/utils/formatters.js';

	let loading = $state(true);
	let error = $state<string | null>(null);
	let payments = $state<Payment[]>([]);

	let searchQuery = $state('');
	let typeFilter = $state<'all' | 'received' | 'made'>('all');

	let currentPage = $state(1);
	const itemsPerPage = 15;

	let totalReceived = $derived(
		payments.filter((p) => p.type === 'received').reduce((sum, p) => sum + p.amount, 0)
	);
	let totalPaid = $derived(
		payments.filter((p) => p.type === 'made').reduce((sum, p) => sum + p.amount, 0)
	);

	let filteredPayments = $derived.by(() => {
		let result = payments;

		if (typeFilter !== 'all') {
			result = result.filter((p) => p.type === typeFilter);
		}

		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			result = result.filter(
				(p) =>
					p.partyName?.toLowerCase().includes(query) ||
					(p.reference && p.reference.toLowerCase().includes(query)) ||
					(p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(query))
			);
		}

		return result;
	});

	let paginatedPayments = $derived(
		filteredPayments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
	);

	let totalPages = $derived(Math.ceil(filteredPayments.length / itemsPerPage));

	onMount(async () => {
		try {
			const result = await paymentService.getPayments();
			payments = result.sort(
				(a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
			);
		} catch (e) {
			console.error(e);
			error = 'Failed to load payments';
		} finally {
			loading = false;
		}
	});

	$effect(() => {
		if (searchQuery !== undefined || typeFilter !== undefined) {
			currentPage = 1;
		}
	});
</script>

<div class="space-y-5">
	<!-- Page Header -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<div class="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-0.5 text-[11px] font-bold text-teal-700 border border-teal-200/80 mb-1.5">
				<CreditCard size={12} class="text-teal-600" />
				<span>Axiscare Financial Ledger</span>
			</div>
			<h1 class="text-2xl font-extrabold tracking-tight text-slate-900">Payment & Receipt Vouchers</h1>
			<p class="text-xs text-slate-500">Track all incoming receipts, outgoing supplier disbursements, and bank settlements</p>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="secondary" size="sm" onclick={() => goto('/payments/pay')}>
				<ArrowUpRight size={14} class="mr-1 text-rose-600" />
				<span>- Pay Supplier</span>
			</Button>
			<Button variant="royal" size="sm" onclick={() => goto('/payments/receive')}>
				<ArrowDownLeft size={14} class="mr-1 text-white" />
				<span>+ Receive Payment</span>
			</Button>
		</div>
	</div>

	<!-- Quick Voucher Metrics -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		<div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Customer Receipts</span>
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
					<ArrowDownLeft size={18} />
				</div>
			</div>
			<div class="mt-3 font-mono text-2xl font-extrabold text-emerald-600 tabular-nums">
				{formatCurrency(totalReceived)}
			</div>
			<div class="mt-1 text-xs text-emerald-600 font-medium">Realized collections</div>
		</div>

		<div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Supplier Disbursements</span>
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
					<ArrowUpRight size={18} />
				</div>
			</div>
			<div class="mt-3 font-mono text-2xl font-extrabold text-rose-600 tabular-nums">
				{formatCurrency(totalPaid)}
			</div>
			<div class="mt-1 text-xs text-rose-600 font-medium">Outward remittance</div>
		</div>

		<div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold text-teal-700 uppercase tracking-wider">Net Movement</span>
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
					<ArrowRightLeft size={18} />
				</div>
			</div>
			<div class="mt-3 font-mono text-2xl font-extrabold tabular-nums {totalReceived >= totalPaid ? 'text-teal-700' : 'text-amber-600'}">
				{formatCurrency(totalReceived - totalPaid)}
			</div>
			<div class="mt-1 text-xs text-slate-500 font-medium">Net cash flow position</div>
		</div>
	</div>

	<!-- Search and Filter Bar -->
	<div class="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
		<div class="relative w-full sm:max-w-md">
			<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
				<Search size={16} />
			</div>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search by party, voucher ref, or invoice number..."
				class="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-4 pl-10 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all"
			/>
		</div>
		<div class="flex flex-wrap items-center gap-2.5">
			<span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Voucher Type:</span>
			<select
				bind:value={typeFilter}
				class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all shadow-2xs cursor-pointer"
			>
				<option value="all">All Vouchers ({payments.length})</option>
				<option value="received">Receipts In ({payments.filter(p => p.type === 'received').length})</option>
				<option value="made">Payments Out ({payments.filter(p => p.type === 'made').length})</option>
			</select>
		</div>
	</div>

	{#if loading}
		<LoadingState message="Loading payment and receipt records..." />
	{:else if error}
		<EmptyState title="Error" message={error} />
	{:else if payments.length === 0}
		<EmptyState title="No vouchers recorded" message="Record your first receipt or supplier payment voucher to start the audit ledger." />
	{:else if filteredPayments.length === 0}
		<EmptyState title="No matching vouchers" message="No vouchers match your active search and filter criteria." />
	{:else}
		<DataTable
			items={paginatedPayments}
			columns={[
				{ header: 'Type', align: 'center' },
				{ header: 'Date', align: 'left' },
				{ header: 'Party Name', align: 'left' },
				{ header: 'Against Invoice', align: 'left' },
				{ header: 'Mode', align: 'center' },
				{ header: 'Txn / Cheque Ref', align: 'left' },
				{ header: 'Amount (₹)', align: 'right' }
			]}
		>
			{#snippet row(payment)}
				<td class="px-3.5 py-2 text-center">
					{#if payment.type === 'received'}
						<span class="inline-flex items-center gap-1 rounded bg-success-light px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
							<ArrowDownLeft size={12} /> Receipt
						</span>
					{:else}
						<span class="inline-flex items-center gap-1 rounded bg-danger-light px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-danger">
							<ArrowUpRight size={12} /> Payment
						</span>
					{/if}
				</td>
				<td class="px-3.5 py-2 text-xs whitespace-nowrap font-mono text-text-secondary">
					{formatDate(payment.date || payment.createdAt)}
				</td>
				<td class="max-w-[220px] truncate px-3.5 py-2 text-xs font-semibold text-text-accent">
					<a
						href={payment.partyType === 'customer'
							? `/customers/${payment.partyId}`
							: `/suppliers/${payment.partyId}`}
						class="text-accent hover:underline"
					>
						{payment.partyName || (payment.partyType === 'customer' ? 'Customer' : 'Supplier')}
					</a>
				</td>
				<td class="px-3.5 py-2 text-xs text-text-muted">
					{#if payment.invoiceNumber}
						<span class="inline-flex rounded border border-border bg-surface-alt px-1.5 py-0.5 font-mono text-[11px] font-semibold text-text-secondary">
							{payment.invoiceNumber}
						</span>
					{:else}
						<span class="text-[11px] italic text-text-muted">On Account</span>
					{/if}
				</td>
				<td class="px-3.5 py-2 text-center">
					<span class="inline-flex rounded bg-surface-alt px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
						{payment.paymentMethod}
					</span>
				</td>
				<td class="max-w-[150px] truncate px-3.5 py-2 font-mono text-xs text-text-muted">
					{payment.reference || '-'}
				</td>
				<td
					class="px-3.5 py-2 text-right font-mono text-xs font-bold tabular-nums {payment.type === 'received'
						? 'text-success'
						: 'text-danger'}"
				>
					{payment.type === 'received' ? '+' : '-'}{formatCurrency(payment.amount)}
				</td>
			{/snippet}
		</DataTable>

		<div class="mt-3">
			<Pagination
				{currentPage}
				{totalPages}
				totalItems={filteredPayments.length}
				{itemsPerPage}
				onPageChange={(page) => (currentPage = page)}
			/>
		</div>
	{/if}
</div>
