<script lang="ts">
	import { onMount } from 'svelte';
	import { purchaseService } from '$lib/services/index.js';
	import type { Purchase } from '$lib/types/index.js';
	import { LoadingState, EmptyState, Badge, Button } from '$lib/components/common/index.js';
	import DataTable from '$lib/components/tables/DataTable.svelte';
	import Pagination from '$lib/components/tables/Pagination.svelte';
	import {
		Search,
		Plus,
		ShoppingCart,
		CreditCard,
		CheckCircle2,
		AlertCircle,
		Eye,
		ArrowUpRight,
		FileText
	} from '@lucide/svelte';
	import { goto } from '$app/navigation';

	let loading = $state(true);
	let error = $state<string | null>(null);
	let purchases = $state<Purchase[]>([]);

	let searchQuery = $state('');
	let paymentFilter = $state<string>('all');
	let statusFilter = $state<string>('all');

	let currentPage = $state(1);
	const itemsPerPage = 15;

	// Metrics
	let totalPurchasesCount = $derived(purchases.length);
	let totalPurchasesAmount = $derived(purchases.reduce((acc, p) => acc + p.grandTotal, 0));
	let totalPayablesDue = $derived(
		purchases
			.filter((p) => p.paymentStatus !== 'paid')
			.reduce((acc, p) => acc + (p.dueAmount ?? p.grandTotal - (p.paidAmount ?? 0)), 0)
	);
	let confirmedCount = $derived(purchases.filter((p) => p.status === 'confirmed').length);

	let filteredPurchases = $derived.by(() => {
		let list = purchases;
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			list = list.filter(
				(p) =>
					p.invoiceNumber.toLowerCase().includes(query) ||
					p.supplierName.toLowerCase().includes(query) ||
					(p.notes && p.notes.toLowerCase().includes(query))
			);
		}
		if (paymentFilter !== 'all') {
			list = list.filter((p) => p.paymentStatus === paymentFilter);
		}
		if (statusFilter !== 'all') {
			list = list.filter((p) => p.status === statusFilter);
		}
		return list;
	});

	let paginatedPurchases = $derived(
		filteredPurchases.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
	);

	let totalPages = $derived(Math.ceil(filteredPurchases.length / itemsPerPage));

	onMount(async () => {
		try {
			const result = await purchaseService.getPurchases();
			purchases = result.sort(
				(a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
			);
			loading = false;
		} catch (e) {
			console.error(e);
			error = 'Failed to load inward purchase records.';
			loading = false;
		}
	});

	$effect(() => {
		if (searchQuery !== undefined || paymentFilter !== undefined || statusFilter !== undefined) {
			currentPage = 1;
		}
	});
</script>

<div class="space-y-4">
	<!-- Page Header -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-xl font-bold text-text-primary">Inward Purchases & GRN Hub</h1>
			<p class="text-xs text-text-muted">Supplier bills, goods received notes, tax credits, and payables ledger</p>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="primary" size="sm" onclick={() => goto('/purchases/new')}>
				<Plus size={14} class="mr-1" />
				<span>+ Inward GRN (Purchase)</span>
			</Button>
		</div>
	</div>

	<!-- Metric summary cards -->
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
		<div class="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
			<div>
				<div class="text-[11px] font-semibold text-text-muted uppercase">Total Inward Bills</div>
				<div class="mt-1 font-mono text-xl font-bold text-text-primary tabular-nums">{totalPurchasesCount}</div>
			</div>
			<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-info-light text-info">
				<ShoppingCart size={16} />
			</div>
		</div>

		<div class="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
			<div>
				<div class="text-[11px] font-semibold text-text-muted uppercase">Total Volume (₹)</div>
				<div class="mt-1 font-mono text-xl font-bold text-text-primary tabular-nums">
					₹{totalPurchasesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
				</div>
			</div>
			<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-light text-accent">
				<FileText size={16} />
			</div>
		</div>

		<div class="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
			<div>
				<div class="text-[11px] font-semibold text-text-muted uppercase">Pending Payables (₹)</div>
				<div class="mt-1 font-mono text-xl font-bold text-warning tabular-nums">
					₹{totalPayablesDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
				</div>
			</div>
			<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-light text-warning">
				<CreditCard size={16} />
			</div>
		</div>

		<div class="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
			<div>
				<div class="text-[11px] font-semibold text-text-muted uppercase">Stocked GRNs</div>
				<div class="mt-1 font-mono text-xl font-bold text-success tabular-nums">{confirmedCount}</div>
			</div>
			<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-success-light text-success">
				<CheckCircle2 size={16} />
			</div>
		</div>
	</div>

	<!-- Toolbar & Filters -->
	<div class="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
		<div class="relative w-full sm:max-w-md">
			<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
				<Search size={15} />
			</div>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search by supplier bill no., distributor name, notes..."
				class="w-full rounded-lg border border-border bg-surface py-2 pr-4 pl-9 text-xs font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
			/>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<!-- Payment Status Filter -->
			<select
				bind:value={paymentFilter}
				class="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
			>
				<option value="all">All Payment Statuses</option>
				<option value="paid">Paid</option>
				<option value="partial">Partial</option>
				<option value="unpaid">Unpaid / Due</option>
			</select>

			<!-- GRN Status Filter -->
			<select
				bind:value={statusFilter}
				class="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
			>
				<option value="all">All GRN Statuses</option>
				<option value="confirmed">Confirmed (Stock Inwarded)</option>
				<option value="draft">Draft / Verification</option>
				<option value="cancelled">Cancelled</option>
			</select>
		</div>
	</div>

	<!-- Main Purchases Table -->
	{#if loading}
		<LoadingState message="Loading purchase records..." />
	{:else if error}
		<EmptyState title="Error Loading Purchases" message={error} />
	{:else if purchases.length === 0}
		<EmptyState title="No Purchase Entries" message="Log your first supplier bill to receive batches into inventory.">
			{#snippet action()}
				<Button variant="primary" onclick={() => goto('/purchases/new')}>+ New Purchase</Button>
			{/snippet}
		</EmptyState>
	{:else if filteredPurchases.length === 0}
		<EmptyState title="No Matching Purchases" message="No purchases match your search and filter criteria." />
	{:else}
		<DataTable
			items={paginatedPurchases}
			columns={[
				{ header: 'Supplier Invoice #', align: 'left' },
				{ header: 'Date', align: 'left' },
				{ header: 'Distributor / Supplier', align: 'left' },
				{ header: 'Grand Total (₹)', align: 'right' },
				{ header: 'GRN Status', align: 'center' },
				{ header: 'Payment Status', align: 'center' },
				{ header: 'Actions', align: 'right' }
			]}
		>
			{#snippet row(purchase)}
				<!-- Invoice No -->
				<td class="px-4 py-2.5 font-medium whitespace-nowrap">
					<a
						href="/purchases/{purchase.id}"
						class="flex items-center gap-1.5 font-mono font-bold text-accent hover:underline group"
					>
						<span>{purchase.invoiceNumber}</span>
						<ArrowUpRight size={12} class="opacity-0 group-hover:opacity-100 transition-opacity text-accent" />
					</a>
				</td>

				<!-- Date -->
				<td class="px-4 py-2.5 text-xs text-text-secondary whitespace-nowrap">
					{new Date(purchase.invoiceDate).toLocaleDateString('en-IN', {
						day: '2-digit',
						month: 'short',
						year: 'numeric'
					})}
				</td>

				<!-- Supplier -->
				<td class="max-w-[200px] truncate px-4 py-2.5 font-medium text-xs text-text-primary">
					{purchase.supplierName || purchase.supplierId || 'Supplier'}
				</td>

				<!-- Grand Total -->
				<td class="px-4 py-2.5 text-right font-mono text-xs font-bold text-text-primary tabular-nums">
					₹{purchase.grandTotal.toFixed(2)}
				</td>

				<!-- GRN Status -->
				<td class="px-4 py-2.5 text-center">
					<Badge
						variant={purchase.status === 'confirmed'
							? 'success'
							: purchase.status === 'draft'
								? 'neutral'
								: 'danger'}
						size="sm"
					>
						{purchase.status}
					</Badge>
				</td>

				<!-- Payment Status -->
				<td class="px-4 py-2.5 text-center">
					<Badge
						variant={purchase.paymentStatus === 'paid'
							? 'success'
							: purchase.paymentStatus === 'partial'
								? 'warning'
								: 'danger'}
						size="sm"
					>
						{purchase.paymentStatus}
					</Badge>
				</td>

				<!-- Actions -->
				<td class="px-4 py-2.5 text-right">
					<button
						type="button"
						onclick={() => goto(`/purchases/${purchase.id}`)}
						class="rounded p-1 text-text-muted hover:bg-surface-hover hover:text-text-primary"
						title="View purchase bill and inwarded batches"
					>
						<Eye size={14} />
					</button>
				</td>
			{/snippet}
		</DataTable>

		<div class="mt-3">
			<Pagination
				{currentPage}
				{totalPages}
				totalItems={filteredPurchases.length}
				{itemsPerPage}
				onPageChange={(page) => (currentPage = page)}
			/>
		</div>
	{/if}
</div>
