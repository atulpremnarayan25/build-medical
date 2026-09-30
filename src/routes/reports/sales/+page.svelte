<script lang="ts">
	import { onMount } from 'svelte';
	import { PageHeader, LoadingState, Button } from '$lib/components/common/index.js';
	import { formatCurrency, formatDate } from '$lib/utils/formatters.js';
	import { FileSpreadsheet, Printer, Search, ArrowUpRight, Filter, Calendar, TrendingUp, IndianRupee, FileText } from '@lucide/svelte';

	interface SalesReportItem {
		id: string;
		date: string;
		invoiceNumber: string;
		saleType: string;
		customerId: string | null;
		customerName: string | null;
		customerGstin: string | null;
		customerPhone: string | null;
		subtotal: number;
		gstAmount: number;
		totalAmount: number;
		amountPaidAtSale: number;
		dueAmount: number;
		paymentStatus: string;
		itemsCount: number;
	}

	let sales = $state<SalesReportItem[]>([]);
	let loading = $state(true);
	let searchQuery = $state('');

	// Date preset filter
	let datePreset = $state('month');
	let fromDate = $state('');
	let toDate = $state('');
	let saleTypeFilter = $state('all');
	let paymentStatusFilter = $state('all');

	function setDateRange(preset: string) {
		datePreset = preset;
		const now = new Date();
		const todayStr = now.toISOString().split('T')[0];

		if (preset === 'today') {
			fromDate = todayStr;
			toDate = todayStr;
		} else if (preset === 'yesterday') {
			const y = new Date(now);
			y.setDate(y.getDate() - 1);
			const yStr = y.toISOString().split('T')[0];
			fromDate = yStr;
			toDate = yStr;
		} else if (preset === 'week') {
			const w = new Date(now);
			w.setDate(w.getDate() - 7);
			fromDate = w.toISOString().split('T')[0];
			toDate = todayStr;
		} else if (preset === 'month') {
			const m = new Date(now.getFullYear(), now.getMonth(), 1);
			fromDate = m.toISOString().split('T')[0];
			toDate = todayStr;
		}
		loadReport();
	}

	async function loadReport() {
		loading = true;
		try {
			const params = new URLSearchParams();
			if (fromDate) params.append('from', fromDate);
			if (toDate) params.append('to', toDate);
			if (saleTypeFilter !== 'all') params.append('saleType', saleTypeFilter);
			if (paymentStatusFilter !== 'all') params.append('paymentStatus', paymentStatusFilter);

			const res = await fetch(`/api/reports/sales?${params.toString()}`);
			if (res.ok) {
				sales = await res.json();
			}
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		setDateRange('month');
	});

	let filteredSales = $derived(
		sales.filter((s) => {
			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			return (
				s.invoiceNumber.toLowerCase().includes(q) ||
				(s.customerName && s.customerName.toLowerCase().includes(q)) ||
				(s.customerPhone && s.customerPhone.includes(q)) ||
				(s.customerGstin && s.customerGstin.toLowerCase().includes(q))
			);
		})
	);

	let totalTurnover = $derived(filteredSales.reduce((acc, s) => acc + s.totalAmount, 0));
	let totalTaxable = $derived(filteredSales.reduce((acc, s) => acc + s.subtotal, 0));
	let totalGst = $derived(filteredSales.reduce((acc, s) => acc + s.gstAmount, 0));
	let totalCollected = $derived(filteredSales.reduce((acc, s) => acc + s.amountPaidAtSale, 0));
	let totalDue = $derived(filteredSales.reduce((acc, s) => acc + s.dueAmount, 0));

	function exportToCSV() {
		const headers = [
			'Invoice #',
			'Date',
			'Type',
			'Customer Name',
			'Customer GSTIN',
			'Items',
			'Taxable Amount',
			'GST Amount',
			'Total Amount',
			'Paid Amount',
			'Due Amount',
			'Status'
		];
		const rows = filteredSales.map((s) => [
			s.invoiceNumber,
			formatDate(s.date),
			s.saleType.toUpperCase(),
			s.customerName || 'Walk-in Customer',
			s.customerGstin || '-',
			s.itemsCount,
			s.subtotal.toFixed(2),
			s.gstAmount.toFixed(2),
			s.totalAmount.toFixed(2),
			s.amountPaidAtSale.toFixed(2),
			s.dueAmount.toFixed(2),
			s.paymentStatus.toUpperCase()
		]);

		const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', encodedUri);
		link.setAttribute('download', `sales_report_${fromDate}_to_${toDate}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
</script>

<svelte:head>
	<title>Sales Register & Turnover Report - MedStock ERP</title>
</svelte:head>

<div class="space-y-4">
	<PageHeader
		title="Sales Register & Turnover Analytics"
		subtitle="Comprehensive invoice audit trail, GST breakdown, and realization registry"
		backHref="/reports"
	>
		{#snippet actions()}
			<div class="flex gap-2">
				<Button variant="secondary" size="sm" onclick={exportToCSV} disabled={filteredSales.length === 0}>
					<FileSpreadsheet size={14} class="mr-1 text-success" />
					<span>Export CSV</span>
				</Button>
				<Button variant="secondary" size="sm" onclick={() => window.print()}>
					<Printer size={14} class="mr-1 text-text-muted" />
					<span>Print</span>
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	<!-- Filters Strip -->
	<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs space-y-3">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<!-- Date Range Presets -->
			<div class="flex items-center gap-1 rounded-lg border border-border bg-surface-secondary p-1 text-xs">
				<button
					type="button"
					class="rounded-md px-2.5 py-1 font-medium transition-all {datePreset === 'today'
						? 'bg-surface font-semibold text-accent shadow-2xs'
						: 'text-text-secondary hover:text-text-primary'}"
					onclick={() => setDateRange('today')}
				>
					Today
				</button>
				<button
					type="button"
					class="rounded-md px-2.5 py-1 font-medium transition-all {datePreset === 'yesterday'
						? 'bg-surface font-semibold text-accent shadow-2xs'
						: 'text-text-secondary hover:text-text-primary'}"
					onclick={() => setDateRange('yesterday')}
				>
					Yesterday
				</button>
				<button
					type="button"
					class="rounded-md px-2.5 py-1 font-medium transition-all {datePreset === 'week'
						? 'bg-surface font-semibold text-accent shadow-2xs'
						: 'text-text-secondary hover:text-text-primary'}"
					onclick={() => setDateRange('week')}
				>
					Last 7 Days
				</button>
				<button
					type="button"
					class="rounded-md px-2.5 py-1 font-medium transition-all {datePreset === 'month'
						? 'bg-surface font-semibold text-accent shadow-2xs'
						: 'text-text-secondary hover:text-text-primary'}"
					onclick={() => setDateRange('month')}
				>
					This Month
				</button>
			</div>

			<!-- Explicit Dates & Dropdown Filters -->
			<div class="flex flex-wrap items-center gap-2 text-xs">
				<div class="flex items-center gap-1.5">
					<span class="text-text-muted">From:</span>
					<input
						type="date"
						bind:value={fromDate}
						onchange={() => {
							datePreset = 'custom';
							loadReport();
						}}
						class="rounded-md border border-border bg-surface px-2 py-1 font-mono text-xs text-text-primary focus:border-accent focus:outline-none"
					/>
				</div>
				<div class="flex items-center gap-1.5">
					<span class="text-text-muted">To:</span>
					<input
						type="date"
						bind:value={toDate}
						onchange={() => {
							datePreset = 'custom';
							loadReport();
						}}
						class="rounded-md border border-border bg-surface px-2 py-1 font-mono text-xs text-text-primary focus:border-accent focus:outline-none"
					/>
				</div>

				<select
					bind:value={saleTypeFilter}
					onchange={loadReport}
					class="rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
				>
					<option value="all">All Channels (Retail + B2B)</option>
					<option value="retail">Retail POS Only</option>
					<option value="wholesale">Wholesale B2B Only</option>
				</select>

				<select
					bind:value={paymentStatusFilter}
					onchange={loadReport}
					class="rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
				>
					<option value="all">All Payment Statuses</option>
					<option value="paid">Settled / Paid</option>
					<option value="partial">Partially Paid</option>
					<option value="credit">Unpaid / Khata Credit</option>
				</select>
			</div>
		</div>

		<!-- Search Bar -->
		<div class="relative">
			<Search size={14} class="absolute top-1/2 left-3 -translate-y-1/2 text-text-muted" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search invoice number, customer name, GSTIN, or phone..."
				class="w-full rounded-md border border-border bg-surface py-1.5 pr-3 pl-8 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
			/>
		</div>
	</div>

	<!-- Metric KPI Cards -->
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total Gross Turnover</div>
			<div class="mt-1 font-mono text-lg font-bold text-text-primary tabular-nums">
				{formatCurrency(totalTurnover)}
			</div>
			<div class="text-[10px] text-text-muted">{filteredSales.length} Invoices Billed</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Taxable Turnover</div>
			<div class="mt-1 font-mono text-lg font-bold text-text-primary tabular-nums">
				{formatCurrency(totalTaxable)}
			</div>
			<div class="text-[10px] text-text-muted">Base sales excluding tax</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total GST Output</div>
			<div class="mt-1 font-mono text-lg font-bold text-accent tabular-nums">
				{formatCurrency(totalGst)}
			</div>
			<div class="text-[10px] text-text-muted">CGST + SGST Liability</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Realized Inflow</div>
			<div class="mt-1 font-mono text-lg font-bold text-success tabular-nums">
				{formatCurrency(totalCollected)}
			</div>
			<div class="text-[10px] text-text-muted">Paid at billing time</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Debtor Credit Due</div>
			<div class="mt-1 font-mono text-lg font-bold text-danger tabular-nums">
				{formatCurrency(totalDue)}
			</div>
			<div class="text-[10px] text-text-muted">Outstanding receivables</div>
		</div>
	</div>

	<!-- Invoices Register Table -->
	{#if loading}
		<LoadingState message="Generating sales register from ledger..." />
	{:else if filteredSales.length === 0}
		<div class="rounded-xl border border-border bg-surface p-8 text-center text-xs text-text-muted">
			<FileText size={32} class="mx-auto mb-2 opacity-40 text-text-muted" />
			No sales invoices match the selected date range and filters.
		</div>
	{:else}
		<div class="overflow-x-auto rounded-xl border border-border bg-surface shadow-2xs">
			<table class="w-full text-left text-xs">
				<thead class="border-b border-border bg-surface-secondary text-[10px] font-bold uppercase tracking-wider text-text-muted">
					<tr>
						<th class="px-3 py-2.5">Invoice #</th>
						<th class="px-3 py-2.5">Date & Time</th>
						<th class="px-3 py-2.5">Channel</th>
						<th class="px-3 py-2.5">Customer / Party</th>
						<th class="px-3 py-2.5 text-center">Items</th>
						<th class="px-3 py-2.5 text-right">Taxable (₹)</th>
						<th class="px-3 py-2.5 text-right">GST (₹)</th>
						<th class="px-3 py-2.5 text-right">Invoice Total (₹)</th>
						<th class="px-3 py-2.5 text-right">Paid (₹)</th>
						<th class="px-3 py-2.5 text-right">Balance Due (₹)</th>
						<th class="px-3 py-2.5 text-center">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border">
					{#each filteredSales as sale}
						<tr class="hover:bg-surface-hover transition-colors">
							<td class="px-3 py-2 font-mono font-bold text-accent">
								<a href={`/sales/${sale.id}`} class="hover:underline flex items-center gap-1">
									<span>{sale.invoiceNumber}</span>
									<ArrowUpRight size={10} class="opacity-60" />
								</a>
							</td>
							<td class="px-3 py-2 font-mono text-[11px] text-text-secondary">
								{formatDate(sale.date)}
							</td>
							<td class="px-3 py-2">
								<span
									class="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase {sale.saleType ===
									'wholesale'
										? 'bg-accent-light text-accent'
										: 'bg-surface-secondary text-text-secondary'}"
								>
									{sale.saleType}
								</span>
							</td>
							<td class="px-3 py-2">
								<div class="font-medium text-text-primary">{sale.customerName || 'Walk-in Retail Customer'}</div>
								{#if sale.customerGstin}
									<div class="font-mono text-[10px] text-text-muted">GSTIN: {sale.customerGstin}</div>
								{/if}
							</td>
							<td class="px-3 py-2 text-center font-mono">{sale.itemsCount}</td>
							<td class="px-3 py-2 text-right font-mono tabular-nums text-text-secondary">{formatCurrency(sale.subtotal)}</td>
							<td class="px-3 py-2 text-right font-mono tabular-nums text-text-secondary">{formatCurrency(sale.gstAmount)}</td>
							<td class="px-3 py-2 text-right font-mono font-bold tabular-nums text-text-primary">{formatCurrency(sale.totalAmount)}</td>
							<td class="px-3 py-2 text-right font-mono tabular-nums text-success">{formatCurrency(sale.amountPaidAtSale)}</td>
							<td class="px-3 py-2 text-right font-mono font-bold tabular-nums {sale.dueAmount > 0 ? 'text-danger' : 'text-text-muted'}">
								{formatCurrency(sale.dueAmount)}
							</td>
							<td class="px-3 py-2 text-center">
								<span
									class="inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase {sale.paymentStatus ===
									'paid'
										? 'bg-success-light text-success'
										: sale.paymentStatus === 'partial'
											? 'bg-warning-light text-warning'
											: 'bg-danger-light text-danger'}"
								>
									{sale.paymentStatus}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
				<tfoot class="border-t-2 border-border bg-surface-secondary font-bold text-xs">
					<tr>
						<td colspan="5" class="px-3 py-2.5 text-right uppercase tracking-wider text-[10px] text-text-muted">
							Total Summary:
						</td>
						<td class="px-3 py-2.5 text-right font-mono tabular-nums text-text-primary">{formatCurrency(totalTaxable)}</td>
						<td class="px-3 py-2.5 text-right font-mono tabular-nums text-accent">{formatCurrency(totalGst)}</td>
						<td class="px-3 py-2.5 text-right font-mono tabular-nums text-text-primary">{formatCurrency(totalTurnover)}</td>
						<td class="px-3 py-2.5 text-right font-mono tabular-nums text-success">{formatCurrency(totalCollected)}</td>
						<td class="px-3 py-2.5 text-right font-mono tabular-nums text-danger">{formatCurrency(totalDue)}</td>
						<td></td>
					</tr>
				</tfoot>
			</table>
		</div>
	{/if}
</div>
