<script lang="ts">
	import { onMount } from 'svelte';
	import { PageHeader, LoadingState, Button } from '$lib/components/common/index.js';
	import { formatCurrency, formatDate } from '$lib/utils/formatters.js';
	import { FileSpreadsheet, Printer, Search, Truck, ArrowUpRight } from '@lucide/svelte';

	interface PurchaseReportItem {
		id: string;
		date: string;
		supplierInvoiceRef: string;
		supplierInvoiceDate: string | null;
		supplierId: string;
		supplierName: string | null;
		supplierGstin: string | null;
		supplierPhone: string | null;
		totalAmount: number;
		itemsCount: number;
	}

	let purchases = $state<PurchaseReportItem[]>([]);
	let loading = $state(true);
	let searchQuery = $state('');

	// Date filter
	let datePreset = $state('month');
	let fromDate = $state('');
	let toDate = $state('');

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

			const res = await fetch(`/api/reports/purchases?${params.toString()}`);
			if (res.ok) {
				purchases = await res.json();
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

	let filteredPurchases = $derived(
		purchases.filter((p) => {
			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			return (
				p.supplierInvoiceRef.toLowerCase().includes(q) ||
				(p.supplierName && p.supplierName.toLowerCase().includes(q)) ||
				(p.supplierGstin && p.supplierGstin.toLowerCase().includes(q)) ||
				(p.supplierPhone && p.supplierPhone.includes(q))
			);
		})
	);

	let totalPurchasesAmount = $derived(filteredPurchases.reduce((acc, p) => acc + p.totalAmount, 0));
	let totalItemsReceived = $derived(filteredPurchases.reduce((acc, p) => acc + p.itemsCount, 0));
	let uniqueSuppliers = $derived(new Set(filteredPurchases.map((p) => p.supplierId)).size);

	function exportCSV() {
		const headers = [
			'GRN Date',
			'Supplier Bill Ref',
			'Supplier Bill Date',
			'Distributor / Supplier',
			'Supplier GSTIN',
			'Phone',
			'Items Count',
			'Total Bill Amount (₹)'
		];
		const rows = filteredPurchases.map((p) => [
			formatDate(p.date),
			`"${p.supplierInvoiceRef}"`,
			p.supplierInvoiceDate ? formatDate(p.supplierInvoiceDate) : '-',
			`"${p.supplierName || 'Unknown'}"`,
			p.supplierGstin || '-',
			p.supplierPhone || '-',
			p.itemsCount,
			p.totalAmount.toFixed(2)
		]);

		const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', encodedUri);
		link.setAttribute('download', `purchase_grn_report_${fromDate}_to_${toDate}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
</script>

<svelte:head>
	<title>Purchase Inward Register & GRN Audit - MedStock ERP</title>
</svelte:head>

<div class="space-y-4">
	<PageHeader
		title="Purchase / Inward GRN Register"
		subtitle="Audit trail of distributor inward invoices, goods received notes, and supplier procurement values"
		backHref="/reports"
	>
		{#snippet actions()}
			<div class="flex gap-2">
				<Button variant="secondary" size="sm" onclick={exportCSV} disabled={filteredPurchases.length === 0}>
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
			<!-- Date Presets -->
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

			<!-- Explicit Range -->
			<div class="flex items-center gap-2 text-xs">
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
			</div>
		</div>

		<!-- Search -->
		<div class="relative">
			<Search size={14} class="absolute top-1/2 left-3 -translate-y-1/2 text-text-muted" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search supplier invoice number, distributor name, GSTIN..."
				class="w-full rounded-md border border-border bg-surface py-1.5 pr-3 pl-8 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
			/>
		</div>
	</div>

	<!-- Procurement KPI Cards -->
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total Inward Procurement</div>
			<div class="mt-1 font-mono text-lg font-bold text-text-primary tabular-nums">
				{formatCurrency(totalPurchasesAmount)}
			</div>
			<div class="text-[10px] text-text-muted">Total distributor invoices billed</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Inward GRN Invoices</div>
			<div class="mt-1 font-mono text-lg font-bold text-accent tabular-nums">
				{filteredPurchases.length}
			</div>
			<div class="text-[10px] text-text-muted">Purchase entries logged</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Distinct Suppliers</div>
			<div class="mt-1 font-mono text-lg font-bold text-accent tabular-nums">
				{uniqueSuppliers}
			</div>
			<div class="text-[10px] text-text-muted">Active procurement partners</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total Line Items Inward</div>
			<div class="mt-1 font-mono text-lg font-bold text-text-primary tabular-nums">
				{totalItemsReceived}
			</div>
			<div class="text-[10px] text-text-muted">Batch entries received</div>
		</div>
	</div>

	<!-- Purchases Table -->
	{#if loading}
		<LoadingState message="Fetching inward purchase records..." />
	{:else if filteredPurchases.length === 0}
		<div class="rounded-xl border border-border bg-surface p-8 text-center text-xs text-text-muted">
			<Truck size={32} class="mx-auto mb-2 opacity-40 text-text-muted" />
			No purchase entries found for the selected period.
		</div>
	{:else}
		<div class="overflow-x-auto rounded-xl border border-border bg-surface shadow-2xs">
			<table class="w-full text-left text-xs">
				<thead class="border-b border-border bg-surface-secondary text-[10px] font-bold uppercase tracking-wider text-text-muted">
					<tr>
						<th class="px-3 py-2.5">Inward Date</th>
						<th class="px-3 py-2.5">Supplier Bill #</th>
						<th class="px-3 py-2.5">Bill Date</th>
						<th class="px-3 py-2.5">Distributor / Supplier</th>
						<th class="px-3 py-2.5">GSTIN</th>
						<th class="px-3 py-2.5 text-center">Items Received</th>
						<th class="px-3 py-2.5 text-right">Inward Total (₹)</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border">
					{#each filteredPurchases as purchase}
						<tr class="hover:bg-surface-hover transition-colors">
							<td class="px-3 py-2 font-mono text-[11px] text-text-secondary">
								{formatDate(purchase.date)}
							</td>
							<td class="px-3 py-2 font-mono font-bold text-accent">
								<a href={`/purchases/${purchase.id}`} class="hover:underline flex items-center gap-1">
									<span>{purchase.supplierInvoiceRef}</span>
									<ArrowUpRight size={10} class="opacity-60" />
								</a>
							</td>
							<td class="px-3 py-2 font-mono text-[11px] text-text-muted">
								{purchase.supplierInvoiceDate ? formatDate(purchase.supplierInvoiceDate) : '-'}
							</td>
							<td class="px-3 py-2 font-semibold text-text-primary">
								{purchase.supplierName || 'Unknown Supplier'}
							</td>
							<td class="px-3 py-2 font-mono text-[11px] text-text-muted">
								{purchase.supplierGstin || '-'}
							</td>
							<td class="px-3 py-2 text-center font-mono">{purchase.itemsCount}</td>
							<td class="px-3 py-2 text-right font-mono font-bold tabular-nums text-text-primary">
								{formatCurrency(purchase.totalAmount)}
							</td>
						</tr>
					{/each}
				</tbody>
				<tfoot class="border-t-2 border-border bg-surface-secondary font-bold text-xs">
					<tr>
						<td colspan="5" class="px-3 py-2.5 text-right uppercase tracking-wider text-[10px] text-text-muted">
							Total Procurement Value:
						</td>
						<td class="px-3 py-2.5 text-center font-mono">{totalItemsReceived}</td>
						<td class="px-3 py-2.5 text-right font-mono tabular-nums text-text-primary">{formatCurrency(totalPurchasesAmount)}</td>
					</tr>
				</tfoot>
			</table>
		</div>
	{/if}
</div>