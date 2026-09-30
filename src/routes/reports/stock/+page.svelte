<script lang="ts">
	import { onMount } from 'svelte';
	import { PageHeader, LoadingState, Button } from '$lib/components/common/index.js';
	import { formatCurrency } from '$lib/utils/formatters.js';
	import { FileSpreadsheet, Printer, Search, Box } from '@lucide/svelte';

	interface StockReportItem {
		productId: string;
		productName: string;
		genericName: string | null;
		category: string | null;
		manufacturer: string | null;
		hsnCode: string | null;
		drugSchedule: string;
		mrp: number;
		sellingRate: number;
		purchaseRate: number;
		reorderThreshold: number | null;
		batchesCount: number;
		stockLevel: number;
		costValuation: number;
		mrpValuation: number;
	}

	let stock = $state<StockReportItem[]>([]);
	let loading = $state(true);
	let searchQuery = $state('');
	let categoryFilter = $state('all');
	let scheduleFilter = $state('all');

	async function loadStock() {
		loading = true;
		try {
			const res = await fetch('/api/reports/stock');
			if (res.ok) {
				stock = await res.json();
			}
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadStock();
	});

	let categories = $derived(
		Array.from(new Set(stock.map((s) => s.category).filter(Boolean))) as string[]
	);

	let filteredStock = $derived(
		stock.filter((item) => {
			if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
			if (scheduleFilter !== 'all' && item.drugSchedule !== scheduleFilter) return false;
			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			return (
				item.productName.toLowerCase().includes(q) ||
				(item.genericName && item.genericName.toLowerCase().includes(q)) ||
				(item.manufacturer && item.manufacturer.toLowerCase().includes(q)) ||
				(item.hsnCode && item.hsnCode.includes(q))
			);
		})
	);

	let totalCostValuation = $derived(filteredStock.reduce((acc, i) => acc + i.costValuation, 0));
	let totalMrpValuation = $derived(filteredStock.reduce((acc, i) => acc + i.mrpValuation, 0));
	let totalQuantity = $derived(filteredStock.reduce((acc, i) => acc + i.stockLevel, 0));
	let totalBatches = $derived(filteredStock.reduce((acc, i) => acc + i.batchesCount, 0));
	let marginSpread = $derived(totalMrpValuation - totalCostValuation);

	function exportCSV() {
		const headers = [
			'Medicine Name',
			'Generic Composition',
			'Category',
			'Manufacturer',
			'HSN Code',
			'Schedule',
			'Batches',
			'Total Qty',
			'Purchase Rate (₹)',
			'MRP (₹)',
			'Cost Valuation (₹)',
			'MRP Valuation (₹)'
		];
		const rows = filteredStock.map((i) => [
			`"${i.productName}"`,
			`"${i.genericName || ''}"`,
			`"${i.category || ''}"`,
			`"${i.manufacturer || ''}"`,
			i.hsnCode || '',
			i.drugSchedule.toUpperCase(),
			i.batchesCount,
			i.stockLevel,
			i.purchaseRate.toFixed(2),
			i.mrp.toFixed(2),
			i.costValuation.toFixed(2),
			i.mrpValuation.toFixed(2)
		]);

		const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', encodedUri);
		link.setAttribute('download', `stock_valuation_report.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
</script>

<svelte:head>
	<title>Stock Valuation & Inventory Summary - MedStock ERP</title>
</svelte:head>

<div class="space-y-4">
	<PageHeader
		title="Stock Valuation & Warehouse Inventory Summary"
		subtitle="Real-time inventory valuation at cost vs MRP, drug schedules, and batch counts"
		backHref="/reports"
	>
		{#snippet actions()}
			<div class="flex gap-2">
				<Button variant="secondary" size="sm" onclick={exportCSV} disabled={filteredStock.length === 0}>
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

	<!-- Search and Filters Strip -->
	<div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 shadow-2xs">
		<div class="relative flex-1 min-w-[240px]">
			<Search size={14} class="absolute top-1/2 left-3 -translate-y-1/2 text-text-muted" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search medicine, generic name, manufacturer, HSN..."
				class="w-full rounded-md border border-border bg-surface py-1.5 pr-3 pl-8 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
			/>
		</div>

		<div class="flex flex-wrap items-center gap-2 text-xs">
			<select
				bind:value={categoryFilter}
				class="rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
			>
				<option value="all">All Categories</option>
				{#each categories as cat}
					<option value={cat}>{cat}</option>
				{/each}
			</select>

			<select
				bind:value={scheduleFilter}
				class="rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
			>
				<option value="all">All Schedules</option>
				<option value="H1">Schedule H1 (Prescription Regulated)</option>
				<option value="H">Schedule H (Doctor Prescription)</option>
				<option value="X">Schedule X (Narcotic / Controlled)</option>
				<option value="G">Schedule G</option>
				<option value="none">Regular / OTC</option>
			</select>
		</div>
	</div>

	<!-- Valuation Summary Metric Cards -->
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total Stock Valuation (Cost)</div>
			<div class="mt-1 font-mono text-lg font-bold text-text-primary tabular-nums">
				{formatCurrency(totalCostValuation)}
			</div>
			<div class="text-[10px] text-text-muted">Actual acquisition cost</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total Retail Valuation (MRP)</div>
			<div class="mt-1 font-mono text-lg font-bold text-accent tabular-nums">
				{formatCurrency(totalMrpValuation)}
			</div>
			<div class="text-[10px] text-text-muted">Retail inventory potential</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Gross Margin Potential</div>
			<div class="mt-1 font-mono text-lg font-bold text-success tabular-nums">
				{formatCurrency(marginSpread)}
			</div>
			<div class="text-[10px] text-text-muted">
				{totalCostValuation > 0 ? ((marginSpread / totalCostValuation) * 100).toFixed(1) : 0}% Markup
			</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Physical Units in Stock</div>
			<div class="mt-1 font-mono text-lg font-bold text-text-primary tabular-nums">
				{totalQuantity.toLocaleString()}
			</div>
			<div class="text-[10px] text-text-muted">Across all active batches</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Active SKUs / Batches</div>
			<div class="mt-1 font-mono text-lg font-bold text-accent tabular-nums">
				{filteredStock.length} / {totalBatches}
			</div>
			<div class="text-[10px] text-text-muted">Catalog items / Active batches</div>
		</div>
	</div>

	<!-- Valuation Grid Table -->
	{#if loading}
		<LoadingState message="Aggregating warehouse stock valuation..." />
	{:else if filteredStock.length === 0}
		<div class="rounded-xl border border-border bg-surface p-8 text-center text-xs text-text-muted">
			<Box size={32} class="mx-auto mb-2 opacity-40 text-text-muted" />
			No products match the selected filters.
		</div>
	{:else}
		<div class="overflow-x-auto rounded-xl border border-border bg-surface shadow-2xs">
			<table class="w-full text-left text-xs">
				<thead class="border-b border-border bg-surface-secondary text-[10px] font-bold uppercase tracking-wider text-text-muted">
					<tr>
						<th class="px-3 py-2.5">Medicine / Item Details</th>
						<th class="px-3 py-2.5">Category</th>
						<th class="px-3 py-2.5">HSN Code</th>
						<th class="px-3 py-2.5 text-center">Schedule</th>
						<th class="px-3 py-2.5 text-center">Batches</th>
						<th class="px-3 py-2.5 text-right">In Stock (Qty)</th>
						<th class="px-3 py-2.5 text-right">Purchase Rate (₹)</th>
						<th class="px-3 py-2.5 text-right">Selling Rate (₹)</th>
						<th class="px-3 py-2.5 text-right">MRP (₹)</th>
						<th class="px-3 py-2.5 text-right">Cost Value (₹)</th>
						<th class="px-3 py-2.5 text-right">MRP Value (₹)</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border">
					{#each filteredStock as item}
						<tr class="hover:bg-surface-hover transition-colors">
							<td class="px-3 py-2">
								<div class="font-semibold text-text-primary">{item.productName}</div>
								{#if item.genericName}
									<div class="text-[10px] text-text-muted italic">{item.genericName}</div>
								{/if}
								{#if item.manufacturer}
									<div class="text-[10px] text-text-muted">Mfg: {item.manufacturer}</div>
								{/if}
							</td>
							<td class="px-3 py-2 text-text-secondary">{item.category || '-'}</td>
							<td class="px-3 py-2 font-mono text-[11px] text-text-muted">{item.hsnCode || '-'}</td>
							<td class="px-3 py-2 text-center">
								{#if item.drugSchedule && item.drugSchedule !== 'none'}
									<span class="inline-block rounded border border-schedule-h1/20 bg-schedule-h1-light px-1.5 py-0.5 text-[10px] font-bold text-schedule-h1">
										{item.drugSchedule}
									</span>
								{:else}
									<span class="text-[10px] text-text-muted">-</span>
								{/if}
							</td>
							<td class="px-3 py-2 text-center font-mono tabular-nums">{item.batchesCount}</td>
							<td class="px-3 py-2 text-right font-mono font-bold tabular-nums {item.stockLevel === 0 ? 'text-danger' : 'text-text-primary'}">
								{item.stockLevel}
							</td>
							<td class="px-3 py-2 text-right font-mono tabular-nums text-text-secondary">{formatCurrency(item.purchaseRate)}</td>
							<td class="px-3 py-2 text-right font-mono tabular-nums text-text-secondary">{formatCurrency(item.sellingRate)}</td>
							<td class="px-3 py-2 text-right font-mono tabular-nums text-text-muted">{formatCurrency(item.mrp)}</td>
							<td class="px-3 py-2 text-right font-mono font-bold tabular-nums text-text-primary">{formatCurrency(item.costValuation)}</td>
							<td class="px-3 py-2 text-right font-mono font-bold tabular-nums text-accent">{formatCurrency(item.mrpValuation)}</td>
						</tr>
					{/each}
				</tbody>
				<tfoot class="border-t-2 border-border bg-surface-secondary font-bold text-xs">
					<tr>
						<td colspan="5" class="px-3 py-2.5 text-right uppercase tracking-wider text-[10px] text-text-muted">
							Valuation Total:
						</td>
						<td class="px-3 py-2.5 text-right font-mono tabular-nums text-text-primary">{totalQuantity.toLocaleString()}</td>
						<td colspan="3"></td>
						<td class="px-3 py-2.5 text-right font-mono tabular-nums text-text-primary">{formatCurrency(totalCostValuation)}</td>
						<td class="px-3 py-2.5 text-right font-mono tabular-nums text-accent">{formatCurrency(totalMrpValuation)}</td>
					</tr>
				</tfoot>
			</table>
		</div>
	{/if}
</div>