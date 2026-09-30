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

<div class="space-y-4">
	<PageHeader title="Payment & Receipt Vouchers" subtitle="Track all incoming receipts, outgoing supplier disbursements, and bank settlements">
		{#snippet actions()}
			<div class="flex gap-2">
				<Button variant="secondary" size="sm" onclick={() => goto('/payments/pay')}>
					<ArrowUpRight size={14} class="mr-1 text-danger" />
					<span>- Pay Supplier</span>
				</Button>
				<Button variant="primary" size="sm" onclick={() => goto('/payments/receive')}>
					<ArrowDownLeft size={14} class="mr-1 text-white" />
					<span>+ Receive Payment</span>
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	<!-- Quick Voucher Metrics -->
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
		<div class="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
			<div>
				<p class="text-[11px] font-bold uppercase tracking-wider text-text-muted">Total Customer Receipts</p>
				<h3 class="mt-0.5 text-xl font-bold font-mono tabular-nums text-success">
					{formatCurrency(totalReceived)}
				</h3>
			</div>
			<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-success-light text-success">
				<ArrowDownLeft size={18} />
			</div>
		</div>

		<div class="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
			<div>
				<p class="text-[11px] font-bold uppercase tracking-wider text-text-muted">Total Supplier Disbursements</p>
				<h3 class="mt-0.5 text-xl font-bold font-mono tabular-nums text-danger">
					{formatCurrency(totalPaid)}
				</h3>
			</div>
			<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-danger-light text-danger">
				<ArrowUpRight size={18} />
			</div>
		</div>

		<div class="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
			<div>
				<p class="text-[11px] font-bold uppercase tracking-wider text-text-muted">Net Cash / Bank Movement</p>
				<h3 class="mt-0.5 text-xl font-bold font-mono tabular-nums {totalReceived >= totalPaid ? 'text-accent' : 'text-warning'}">
					{formatCurrency(totalReceived - totalPaid)}
				</h3>
			</div>
			<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-light text-accent">
				<ArrowRightLeft size={18} />
			</div>
		</div>
	</div>

	<!-- Search and Filter Bar -->
	<div class="flex flex-col items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 shadow-2xs sm:flex-row">
		<div class="relative w-full max-w-md">
			<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
				<Search size={15} class="text-text-muted" />
			</div>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search by party, voucher ref, or invoice number..."
				class="block w-full rounded-md border border-border bg-surface py-1.5 pr-3 pl-9 text-xs text-text-accent placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
			/>
		</div>
		<div class="flex w-full items-center gap-2 sm:w-auto">
			<span class="text-[11px] font-bold uppercase tracking-wider text-text-muted">Voucher Type:</span>
			<select
				bind:value={typeFilter}
				class="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-text-accent focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
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
