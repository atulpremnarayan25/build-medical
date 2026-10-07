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

<div class="space-y-5">
	<!-- Page Header -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<div class="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-0.5 text-[11px] font-bold text-teal-700 border border-teal-200/80 mb-1.5">
				<Receipt size={12} class="text-teal-600" />
				<span>Axiscare Dispensing & Invoicing</span>
			</div>
			<h1 class="text-2xl font-extrabold tracking-tight text-slate-900">Sales & Invoicing Hub</h1>
			<p class="text-xs text-slate-500">Real-time outpatient bills, wholesale invoices, and customer ledgers</p>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="royal" onclick={() => goto('/sales/new')}>
				<Plus size={16} class="mr-1.5" />
				<span>+ New Sale (POS)</span>
			</Button>
		</div>
	</div>

	<!-- Executive KPI Cards -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<!-- Total Revenue -->
		<div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sales Revenue</span>
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
					<TrendingUp size={18} />
				</div>
			</div>
			<div class="mt-3">
				<span class="font-mono text-2xl font-extrabold text-slate-900 tabular-nums">
					₹{totalSalesAmount.toLocaleString('en-IN', {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2
					})}
				</span>
			</div>
			<div class="mt-1 text-xs text-slate-500 font-medium">
				{sales.length} total invoices generated
			</div>
		</div>

		<!-- Cash & UPI Collected -->
		<div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Realized Collections</span>
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
					<CheckCircle2 size={18} />
				</div>
			</div>
			<div class="mt-3">
				<span class="font-mono text-2xl font-extrabold text-emerald-600 tabular-nums">
					₹{totalPaidAmount.toLocaleString('en-IN', {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2
					})}
				</span>
			</div>
			<div class="mt-1 text-xs text-emerald-600 font-medium">
				Cash, Bank & UPI settlements
			</div>
		</div>

		<!-- Credit / Outstanding Added -->
		<div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Credit Due (Ledgers)</span>
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
					<CreditCard size={18} />
				</div>
			</div>
			<div class="mt-3">
				<span class="font-mono text-2xl font-extrabold text-amber-600 tabular-nums">
					₹{totalPendingAmount.toLocaleString('en-IN', {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2
					})}
				</span>
			</div>
			<div class="mt-1 text-xs text-amber-600 font-medium">
				Receivables pending collection
			</div>
		</div>

		<!-- Controlled / Schedule H1 Invoices -->
		<div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold text-purple-700 uppercase tracking-wider">Regulated (H1/X)</span>
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700 border border-purple-100">
					<ShieldAlert size={18} />
				</div>
			</div>
			<div class="mt-3">
				<span class="font-mono text-2xl font-extrabold text-purple-700 tabular-nums">
					{h1SalesCount}
				</span>
			</div>
			<div class="mt-1 text-xs text-purple-600 font-medium">
				Statutory doctor & patient logged
			</div>
		</div>
	</div>

	<!-- Filters & Quick Search Toolbar -->
	<div
		class="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between"
	>
		<div class="relative w-full sm:max-w-md">
			<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
				<Search size={16} />
			</div>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search by invoice number, customer, doctor..."
				class="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-4 pl-10 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all"
			/>
		</div>

		<div class="flex flex-wrap items-center gap-2.5">
			<!-- Payment Status Filter -->
			<select
				bind:value={statusFilter}
				class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all shadow-2xs cursor-pointer"
			>
				<option value="all">All Payment Statuses</option>
				<option value="paid">Paid</option>
				<option value="partial">Partial</option>
				<option value="unpaid">Unpaid / Credit</option>
			</select>

			<!-- Sale Type Filter -->
			<select
				bind:value={saleTypeFilter}
				class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all shadow-2xs cursor-pointer"
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
		<div class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead
						class="border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold tracking-wider text-slate-500 uppercase"
					>
						<tr>
							<th class="px-4 py-3">Invoice No</th>
							<th class="px-4 py-3">Date & Time</th>
							<th class="px-4 py-3">Customer / Client</th>
							<th class="px-3 py-3 text-center">Type</th>
							<th class="px-4 py-3 text-right">Grand Total</th>
							<th class="px-4 py-3 text-right">Paid</th>
							<th class="px-4 py-3 text-right">Balance Due</th>
							<th class="px-3 py-3 text-center">Payment Status</th>
							<th class="px-4 py-3 text-right">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						{#each paginatedSales as sale (sale.id)}
							<tr class="group transition-colors hover:bg-teal-50/40">
								<!-- Invoice No -->
								<td class="px-4 py-3 whitespace-nowrap">
									<button
										type="button"
										onclick={() => handleRowClick(sale)}
										class="flex items-center gap-1 font-mono text-xs font-bold text-teal-700 hover:text-teal-900 hover:underline cursor-pointer"
									>
										<span>{sale.invoiceNumber}</span>
										<ArrowUpRight
											size={12}
											class="opacity-0 transition-opacity group-hover:opacity-100"
										/>
									</button>
								</td>

								<!-- Date -->
								<td class="px-4 py-3 text-slate-600 whitespace-nowrap">
									{new Date(sale.date).toLocaleDateString('en-IN', {
										day: '2-digit',
										month: 'short',
										year: 'numeric'
									})}
								</td>

								<!-- Customer -->
								<td class="px-4 py-3">
									<div class="font-bold text-slate-800">{sale.customerName || 'Walk-in Customer'}</div>
									{#if sale.notes && sale.notes.includes('H1')}
										<div
											class="mt-0.5 inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200/80"
										>
											<ShieldAlert size={10} />
											<span>H1 Reg</span>
										</div>
									{/if}
								</td>

								<!-- Type -->
								<td class="px-3 py-3 text-center">
									<span
										class="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase
											{sale.saleType === 'wholesale'
											? 'bg-blue-50 text-blue-700 border border-blue-200/80'
											: 'bg-slate-100 text-slate-600 border border-slate-200'}"
									>
										{sale.saleType || 'retail'}
									</span>
								</td>

								<!-- Grand Total -->
								<td
									class="px-4 py-3 text-right font-mono font-bold text-slate-900 tabular-nums"
								>
									₹{sale.grandTotal.toFixed(2)}
								</td>

								<!-- Paid -->
								<td
									class="px-4 py-3 text-right font-mono font-semibold text-emerald-600 tabular-nums"
								>
									₹{(sale.paidAmount || 0).toFixed(2)}
								</td>

								<!-- Balance Due -->
								<td
									class="px-4 py-3 text-right font-mono font-semibold tabular-nums
										{(sale.dueAmount || 0) > 0
										? 'text-amber-600'
										: 'text-slate-400'}"
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
										dot
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
											class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
											title="View invoice details"
										>
											<Eye size={14} />
										</button>
										<button
											type="button"
											onclick={() => handleRowClick(sale)}
											class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
											title="Print invoice"
										>
											<Printer size={14} />
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
