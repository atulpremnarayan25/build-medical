<script lang="ts">
	import { onMount } from 'svelte';
	import { saleService } from '$lib/services/index.js';
	import type { Sale } from '$lib/types/index.js';
	import {
		PageHeader,
		LoadingState,
		EmptyState,
		Badge,
		Button
	} from '$lib/components/common/index.js';
	import Pagination from '$lib/components/tables/Pagination.svelte';
	import {
		Search,
		Plus,
		TrendingUp,
		Receipt,
		CreditCard,
		ShieldAlert,
		FileText,
		Filter,
		CheckCircle2,
		Clock,
		AlertCircle,
		ArrowUpRight,
		Eye,
		Printer
	} from '@lucide/svelte';
	import { goto } from '$app/navigation';

	let loading = $state(true);
	let error = $state<string | null>(null);
	let sales = $state<Sale[]>([]);

	let searchQuery = $state('');
	let statusFilter = $state<string>('all');
	let saleTypeFilter = $state<string>('all');

	let currentPage = $state(1);
	const itemsPerPage = 15;

	// Computed KPIs
	let totalSalesAmount = $derived(sales.reduce((acc, s) => acc + (s.grandTotal || 0), 0));
	let totalPaidAmount = $derived(sales.reduce((acc, s) => acc + (s.paidAmount || 0), 0));
	let totalPendingAmount = $derived(sales.reduce((acc, s) => acc + (s.dueAmount || 0), 0));
	let h1SalesCount = $derived(sales.filter((s) => s.notes && s.notes.includes('H1')).length);

	let filteredSales = $derived.by(() => {
		let list = sales;
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			list = list.filter(
				(s) =>
					s.invoiceNumber.toLowerCase().includes(query) ||
					s.customerName.toLowerCase().includes(query) ||
					(s.notes && s.notes.toLowerCase().includes(query))
			);
		}
		if (statusFilter !== 'all') {
			list = list.filter((s) => s.paymentStatus === statusFilter);
		}
		if (saleTypeFilter !== 'all') {
			list = list.filter((s) => (s.saleType || 'retail') === saleTypeFilter);
		}
		return list;
	});

	let paginatedSales = $derived(
		filteredSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
	);

	let totalPages = $derived(Math.ceil(filteredSales.length / itemsPerPage));

	onMount(async () => {
		try {
			const result = await saleService.getSales();
			sales = result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
			loading = false;
		} catch (e) {
			console.error(e);
			error = 'Failed to load sales history';
			loading = false;
		}
	});

	$effect(() => {
		if (searchQuery !== undefined || statusFilter !== undefined || saleTypeFilter !== undefined) {
			currentPage = 1;
		}
	});

	function handleRowClick(sale: Sale) {
		goto(`/sales/${sale.id}`);
	}
</script>

<div class="space-y-4">
	<!-- Page Header -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-xl font-bold text-text-primary">Sales & Invoicing Hub</h1>
			<p class="text-xs text-text-muted">Overview of invoices, cash receipts, and customer ledgers</p>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="primary" onclick={() => goto('/sales/new')}>
				<Plus size={16} class="mr-1.5" />
				<span>+ New Sale (POS)</span>
			</Button>
		</div>
	</div>

	<!-- Executive KPI Cards -->
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
		<!-- Total Revenue -->
		<div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold text-text-muted">Total Sales Revenue</span>
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-light/50 text-accent">
					<TrendingUp size={16} />
				</div>
			</div>
			<div class="mt-2 flex items-baseline gap-2">
				<span class="font-mono text-2xl font-black text-text-primary tabular-nums">
					₹{totalSalesAmount.toLocaleString('en-IN', {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2
					})}
				</span>
			</div>
			<div class="mt-1 text-[11px] text-text-muted">
				{sales.length} total invoices generated
			</div>
		</div>

		<!-- Cash & UPI Collected -->
		<div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold text-text-muted">Realized Collections</span>
				<div
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-success-light text-success"
				>
					<CheckCircle2 size={16} />
				</div>
			</div>
			<div class="mt-2 flex items-baseline gap-2">
				<span
					class="font-mono text-2xl font-black text-success tabular-nums"
				>
					₹{totalPaidAmount.toLocaleString('en-IN', {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2
					})}
				</span>
			</div>
			<div class="mt-1 text-[11px] text-text-muted">Cash, Bank & UPI settlements</div>
		</div>

		<!-- Credit / Outstanding Added -->
		<div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold text-text-muted">Credit Due (Ledgers)</span>
				<div
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-light text-warning"
				>
					<CreditCard size={16} />
				</div>
			</div>
			<div class="mt-2 flex items-baseline gap-2">
				<span class="font-mono text-2xl font-black text-warning tabular-nums">
					₹{totalPendingAmount.toLocaleString('en-IN', {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2
					})}
				</span>
			</div>
			<div class="mt-1 text-[11px] text-text-muted">Receivables pending collection</div>
		</div>

		<!-- Controlled / Schedule H1 Invoices -->
		<div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold text-schedule-h1">Regulated Bills (H1/X)</span>
				<div
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-schedule-h1-light text-schedule-h1"
				>
					<ShieldAlert size={16} />
				</div>
			</div>
			<div class="mt-2 flex items-baseline gap-2">
				<span
					class="font-mono text-2xl font-black text-schedule-h1 tabular-nums"
				>
					{h1SalesCount}
				</span>
			</div>
			<div class="mt-1 text-[11px] text-text-muted">Statutory doctor & patient logged</div>
		</div>
	</div>

	<!-- Filters & Quick Search Toolbar -->
	<div
		class="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between"
	>
		<div class="relative w-full sm:max-w-md">
			<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
				<Search size={16} />
			</div>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search by invoice number, customer, doctor..."
				class="w-full rounded-lg border border-border bg-surface py-2 pr-4 pl-9 text-xs font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
			/>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<!-- Payment Status Filter -->
			<select
				bind:value={statusFilter}
				class="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
			>
				<option value="all">All Payment Statuses</option>
				<option value="paid">Paid</option>
				<option value="partial">Partial</option>
				<option value="unpaid">Unpaid / Credit</option>
			</select>

			<!-- Sale Type Filter -->
			<select
				bind:value={saleTypeFilter}
				class="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
			>
				<option value="all">All Sale Types</option>
				<option value="retail">Retail (B2C)</option>
				<option value="wholesale">Wholesale (B2B)</option>
			</select>
		</div>
	</div>

	<!-- Main Data Grid Table -->
	{#if loading}
		<LoadingState message="Loading sales history..." />
	{:else if error}
		<EmptyState title="Error Loading Invoices" message={error} />
	{:else if sales.length === 0}
		<EmptyState
			title="No Sales Recorded"
			message="Create your first billing invoice to view sales history."
		>
			{#snippet action()}
				<Button variant="primary" onclick={() => goto('/sales/new')}>+ New Sale (POS)</Button>
			{/snippet}
		</EmptyState>
	{:else if filteredSales.length === 0}
		<EmptyState
			title="No Matching Invoices"
			message="No invoices found matching your search and filter criteria."
		/>
	{:else}
		<div class="overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead
						class="border-b border-border bg-surface-secondary text-[11px] font-semibold tracking-wider text-text-muted uppercase"
					>
						<tr>
							<th class="px-4 py-3">Invoice No</th>
							<th class="px-4 py-3">Date & Time</th>
							<th class="px-4 py-3">Customer</th>
							<th class="px-3 py-3 text-center">Type</th>
							<th class="px-4 py-3 text-right">Grand Total (₹)</th>
							<th class="px-4 py-3 text-right">Paid (₹)</th>
							<th class="px-4 py-3 text-right">Balance Due (₹)</th>
							<th class="px-3 py-3 text-center">Payment Status</th>
							<th class="px-4 py-3 text-right">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border-subtle">
						{#each paginatedSales as sale (sale.id)}
							<tr class="group transition-colors hover:bg-surface-hover/70">
								<!-- Invoice No -->
								<td class="px-4 py-3 whitespace-nowrap">
									<button
										type="button"
										onclick={() => handleRowClick(sale)}
										class="flex items-center gap-1 font-mono text-xs font-bold text-accent hover:underline"
									>
										<span>{sale.invoiceNumber}</span>
										<ArrowUpRight
											size={12}
											class="opacity-0 transition-opacity group-hover:opacity-100"
										/>
									</button>
								</td>

								<!-- Date -->
								<td class="px-4 py-3 text-text-secondary whitespace-nowrap">
									{new Date(sale.date).toLocaleDateString('en-IN', {
										day: '2-digit',
										month: 'short',
										year: 'numeric'
									})}
								</td>

								<!-- Customer -->
								<td class="px-4 py-3">
									<div class="font-semibold text-text-primary">{sale.customerName}</div>
									{#if sale.notes && sale.notes.includes('H1')}
										<div
											class="mt-0.5 inline-flex items-center gap-1 rounded bg-schedule-h1-light px-1.5 py-0.5 text-[11px] font-bold text-schedule-h1 border border-schedule-h1/20"
										>
											<ShieldAlert size={10} />
											<span>H1 Reg</span>
										</div>
									{/if}
								</td>

								<!-- Type -->
								<td class="px-3 py-3 text-center">
									<span
										class="inline-block rounded px-2 py-0.5 text-[11px] font-bold tracking-wider uppercase
											{sale.saleType === 'wholesale'
											? 'bg-info-light text-info'
											: 'border border-border bg-surface-secondary text-text-muted'}"
									>
										{sale.saleType || 'retail'}
									</span>
								</td>

								<!-- Grand Total -->
								<td
									class="px-4 py-3 text-right font-mono font-bold text-text-primary tabular-nums"
								>
									₹{sale.grandTotal.toFixed(2)}
								</td>

								<!-- Paid -->
								<td
									class="px-4 py-3 text-right font-mono text-success tabular-nums"
								>
									₹{(sale.paidAmount || 0).toFixed(2)}
								</td>

								<!-- Balance Due -->
								<td
									class="px-4 py-3 text-right font-mono font-semibold tabular-nums
										{(sale.dueAmount || 0) > 0
										? 'text-warning'
										: 'text-text-muted'}"
								>
									₹{(sale.dueAmount || 0).toFixed(2)}
								</td>

								<!-- Status Badge -->
								<td class="px-3 py-3 text-center">
									<Badge
										variant={sale.paymentStatus === 'paid'
											? 'success'
											: sale.paymentStatus === 'partial'
												? 'warning'
												: 'danger'}
										size="sm"
									>
										{sale.paymentStatus}
									</Badge>
								</td>

								<!-- Actions -->
								<td class="px-4 py-3 text-right">
									<div class="flex items-center justify-end gap-1.5">
										<button
											type="button"
											onclick={() => handleRowClick(sale)}
											class="rounded-md border border-border p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
											title="View invoice details"
										>
											<Eye size={13} />
										</button>
										<button
											type="button"
											onclick={() => handleRowClick(sale)}
											class="rounded-md border border-border p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
											title="Print invoice"
										>
											<Printer size={13} />
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination Footer -->
			<div class="border-t border-border p-3">
				<Pagination
					{currentPage}
					{totalPages}
					totalItems={filteredSales.length}
					{itemsPerPage}
					onPageChange={(page) => (currentPage = page)}
				/>
			</div>
		</div>
	{/if}
</div>
