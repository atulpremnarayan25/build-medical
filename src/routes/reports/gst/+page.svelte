<script lang="ts">
	import { onMount } from 'svelte';
	import { PageHeader, LoadingState, Button } from '$lib/components/common/index.js';
	import { formatCurrency } from '$lib/utils/formatters.js';
	import { FileSpreadsheet, Printer, ShieldCheck, ArrowDownLeft, ArrowUpRight, Scale } from '@lucide/svelte';

	interface GSTSlab {
		gstRate: number;
		itemCount: number;
		taxableAmount: number;
		cgstAmount: number;
		sgstAmount: number;
		totalAmount: number;
	}

	interface GstReportData {
		from: string;
		to: string;
		sales: GSTSlab[];
		purchases: GSTSlab[];
		b2b: {
			invoiceCount: number;
			taxableAmount: number;
			gstAmount: number;
			totalAmount: number;
		};
		b2c: {
			invoiceCount: number;
			taxableAmount: number;
			gstAmount: number;
			totalAmount: number;
		};
	}

	let data = $state<GstReportData | null>(null);
	let loading = $state(true);

	// Date filter
	let datePreset = $state('month');
	let fromDate = $state('');
	let toDate = $state('');

	function setDateRange(preset: string) {
		datePreset = preset;
		const now = new Date();
		const todayStr = now.toISOString().split('T')[0];

		if (preset === 'month') {
			const m = new Date(now.getFullYear(), now.getMonth(), 1);
			fromDate = m.toISOString().split('T')[0];
			toDate = todayStr;
		} else if (preset === 'quarter') {
			const currentQuarter = Math.floor(now.getMonth() / 3);
			const qStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
			fromDate = qStart.toISOString().split('T')[0];
			toDate = todayStr;
		} else if (preset === 'year') {
			const fyStart = now.getMonth() >= 3 ? new Date(now.getFullYear(), 3, 1) : new Date(now.getFullYear() - 1, 3, 1);
			fromDate = fyStart.toISOString().split('T')[0];
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

			const res = await fetch(`/api/reports/gst?${params.toString()}`);
			if (res.ok) {
				data = await res.json();
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

	let totalOutputGst = $derived(
		data?.sales.reduce((acc, s) => acc + s.cgstAmount + s.sgstAmount, 0) || 0
	);
	let totalSalesTaxable = $derived(
		data?.sales.reduce((acc, s) => acc + s.taxableAmount, 0) || 0
	);
	let totalInputTaxCredit = $derived(
		data?.purchases.reduce((acc, p) => acc + p.cgstAmount + p.sgstAmount, 0) || 0
	);
	let netGstLiability = $derived(Math.max(0, totalOutputGst - totalInputTaxCredit));

	function exportGstr1Csv() {
		if (!data) return;
		const headers = ['Rate Slab (%)', 'Type', 'Taxable Turnover (₹)', 'CGST (₹)', 'SGST (₹)', 'Total GST (₹)', 'Gross Value (₹)'];
		const rows = data.sales.map((s) => [
			`${s.gstRate}%`,
			'Output Tax (Sales)',
			s.taxableAmount.toFixed(2),
			s.cgstAmount.toFixed(2),
			s.sgstAmount.toFixed(2),
			(s.cgstAmount + s.sgstAmount).toFixed(2),
			s.totalAmount.toFixed(2)
		]);

		const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', encodedUri);
		link.setAttribute('download', `gstr1_report_${fromDate}_to_${toDate}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
</script>

<svelte:head>
	<title>GST Tax Filings & GSTR-1 Statement - MedStock ERP</title>
</svelte:head>

<div class="space-y-4">
	<PageHeader
		title="GST Statutory Statement & GSTR-1 Filing Summary"
		subtitle="Tax liability by rate slabs (0%, 5%, 12%, 18%), B2B vs B2C breakdown, and Purchase Input Tax Credit (ITC)"
		backHref="/reports"
	>
		{#snippet actions()}
			<div class="flex gap-2">
				<Button variant="secondary" size="sm" onclick={exportGstr1Csv} disabled={!data || data.sales.length === 0}>
					<FileSpreadsheet size={14} class="mr-1 text-success" />
					<span>Export GSTR-1 CSV</span>
				</Button>
				<Button variant="secondary" size="sm" onclick={() => window.print()}>
					<Printer size={14} class="mr-1 text-text-muted" />
					<span>Print</span>
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	<!-- Period Selector Filter -->
	<div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 shadow-2xs">
		<div class="flex items-center gap-1 rounded-lg border border-border bg-surface-secondary p-1 text-xs">
			<button
				type="button"
				class="rounded-md px-2.5 py-1 font-medium transition-all {datePreset === 'month'
					? 'bg-surface font-semibold text-accent shadow-2xs'
					: 'text-text-secondary hover:text-text-primary'}"
				onclick={() => setDateRange('month')}
			>
				This Month (M-T-D)
			</button>
			<button
				type="button"
				class="rounded-md px-2.5 py-1 font-medium transition-all {datePreset === 'quarter'
					? 'bg-surface font-semibold text-accent shadow-2xs'
					: 'text-text-secondary hover:text-text-primary'}"
				onclick={() => setDateRange('quarter')}
			>
				Current Quarter (Q-T-D)
			</button>
			<button
				type="button"
				class="rounded-md px-2.5 py-1 font-medium transition-all {datePreset === 'year'
					? 'bg-surface font-semibold text-accent shadow-2xs'
					: 'text-text-secondary hover:text-text-primary'}"
				onclick={() => setDateRange('year')}
			>
				Fiscal Year (FY)
			</button>
		</div>

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

	<!-- Top GST Summary Cards -->
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total Sales Taxable</div>
			<div class="mt-1 font-mono text-lg font-bold text-text-primary tabular-nums">
				{formatCurrency(totalSalesTaxable)}
			</div>
			<div class="text-[10px] text-text-muted">Gross sales turnover</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total Output GST</div>
			<div class="mt-1 font-mono text-lg font-bold text-accent tabular-nums">
				{formatCurrency(totalOutputGst)}
			</div>
			<div class="text-[10px] text-text-muted">CGST + SGST collected</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Eligible Input Tax Credit (ITC)</div>
			<div class="mt-1 font-mono text-lg font-bold text-success tabular-nums">
				{formatCurrency(totalInputTaxCredit)}
			</div>
			<div class="text-[10px] text-text-muted">GST paid on purchases</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Net GST Payable / Refund</div>
			<div class="mt-1 font-mono text-lg font-bold tabular-nums {netGstLiability > 0 ? 'text-danger' : 'text-success'}">
				{formatCurrency(netGstLiability)}
			</div>
			<div class="text-[10px] text-text-muted">Output GST minus eligible ITC</div>
		</div>
	</div>

	{#if loading}
		<LoadingState message="Calculating statutory GST slabs and ITC ledgers..." />
	{:else if data}
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<!-- B2B vs B2C Split -->
			<div class="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-2xs">
				<h3 class="text-xs font-bold uppercase tracking-wider text-text-muted">B2B vs B2C Sales Classification</h3>
				<div class="grid grid-cols-2 gap-3">
					<div class="rounded-lg border border-border bg-surface-secondary p-3">
						<div class="text-[10px] font-bold uppercase tracking-wider text-accent">B2B Registered (With GSTIN)</div>
						<div class="mt-1 font-mono text-base font-bold text-text-primary tabular-nums">
							{formatCurrency(data.b2b.totalAmount)}
						</div>
						<div class="mt-2 space-y-0.5 text-[11px] text-text-muted">
							<div>Invoices: <strong class="font-mono text-text-primary">{data.b2b.invoiceCount}</strong></div>
							<div>Taxable: <span class="font-mono text-text-secondary">{formatCurrency(data.b2b.taxableAmount)}</span></div>
							<div>GST: <span class="font-mono text-accent font-semibold">{formatCurrency(data.b2b.gstAmount)}</span></div>
						</div>
					</div>

					<div class="rounded-lg border border-border bg-surface-secondary p-3">
						<div class="text-[10px] font-bold uppercase tracking-wider text-text-secondary">B2C Retail / Unregistered</div>
						<div class="mt-1 font-mono text-base font-bold text-text-primary tabular-nums">
							{formatCurrency(data.b2c.totalAmount)}
						</div>
						<div class="mt-2 space-y-0.5 text-[11px] text-text-muted">
							<div>Invoices: <strong class="font-mono text-text-primary">{data.b2c.invoiceCount}</strong></div>
							<div>Taxable: <span class="font-mono text-text-secondary">{formatCurrency(data.b2c.taxableAmount)}</span></div>
							<div>GST: <span class="font-mono text-accent font-semibold">{formatCurrency(data.b2c.gstAmount)}</span></div>
						</div>
					</div>
				</div>
			</div>

			<!-- Tax Settle Summary Box -->
			<div class="flex flex-col justify-between rounded-xl border border-border bg-surface p-4 shadow-2xs">
				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider text-text-muted">GSTR-3B Tax Offset Ledger</h3>
					<div class="mt-3 space-y-2 text-xs">
						<div class="flex justify-between py-1 border-b border-border">
							<span class="text-text-secondary">Total Output Tax Liability (Sales)</span>
							<span class="font-mono font-bold text-accent">{formatCurrency(totalOutputGst)}</span>
						</div>
						<div class="flex justify-between py-1 border-b border-border">
							<span class="text-text-secondary">Less: Inward Input Tax Credit (Purchases)</span>
							<span class="font-mono font-bold text-success">- {formatCurrency(totalInputTaxCredit)}</span>
						</div>
						<div class="flex justify-between py-1 text-sm font-bold">
							<span class="text-text-primary">Net Cash Tax Payable into Electronic Ledger</span>
							<span class="font-mono {netGstLiability > 0 ? 'text-danger' : 'text-success'}">
								{formatCurrency(netGstLiability)}
							</span>
						</div>
					</div>
				</div>
				<div class="mt-3 rounded-lg bg-surface-secondary p-2.5 text-[11px] text-text-muted flex items-center gap-2">
					<ShieldCheck size={16} class="text-success shrink-0" />
					<span>All calculations adhere to Central GST & State GST 50/50 split statutory rules.</span>
				</div>
			</div>
		</div>

		<!-- Sales GST Slabs Table -->
		<div class="space-y-2">
			<h3 class="text-xs font-bold uppercase tracking-wider text-text-muted">1. Outward Supplies (Sales) - Tax Slabs Breakdown</h3>
			<div class="overflow-x-auto rounded-xl border border-border bg-surface shadow-2xs">
				<table class="w-full text-left text-xs">
					<thead class="border-b border-border bg-surface-secondary text-[10px] font-bold uppercase tracking-wider text-text-muted">
						<tr>
							<th class="px-3 py-2.5">GST Rate Slab</th>
							<th class="px-3 py-2.5 text-center">Items Billed</th>
							<th class="px-3 py-2.5 text-right">Taxable Turnover (₹)</th>
							<th class="px-3 py-2.5 text-right">CGST (₹)</th>
							<th class="px-3 py-2.5 text-right">SGST (₹)</th>
							<th class="px-3 py-2.5 text-right">Total Tax (₹)</th>
							<th class="px-3 py-2.5 text-right">Total Gross Invoice Value (₹)</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#if data.sales.length === 0}
							<tr>
								<td colspan="7" class="px-3 py-6 text-center text-text-muted">No sales items recorded for this period.</td>
							</tr>
						{:else}
							{#each data.sales as slab}
								<tr class="hover:bg-surface-hover transition-colors">
									<td class="px-3 py-2 font-mono font-bold text-accent">
										<span class="rounded bg-accent-light px-2 py-0.5 text-accent">{slab.gstRate}% GST</span>
									</td>
									<td class="px-3 py-2 text-center font-mono">{slab.itemCount}</td>
									<td class="px-3 py-2 text-right font-mono tabular-nums text-text-primary">{formatCurrency(slab.taxableAmount)}</td>
									<td class="px-3 py-2 text-right font-mono tabular-nums text-text-secondary">{formatCurrency(slab.cgstAmount)}</td>
									<td class="px-3 py-2 text-right font-mono tabular-nums text-text-secondary">{formatCurrency(slab.sgstAmount)}</td>
									<td class="px-3 py-2 text-right font-mono font-bold tabular-nums text-accent">{formatCurrency(slab.cgstAmount + slab.sgstAmount)}</td>
									<td class="px-3 py-2 text-right font-mono font-bold tabular-nums text-text-primary">{formatCurrency(slab.totalAmount)}</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Purchase ITC Slabs Table -->
		<div class="space-y-2">
			<h3 class="text-xs font-bold uppercase tracking-wider text-text-muted">2. Inward Supplies (Purchases) - Input Tax Credit (ITC) Breakdown</h3>
			<div class="overflow-x-auto rounded-xl border border-border bg-surface shadow-2xs">
				<table class="w-full text-left text-xs">
					<thead class="border-b border-border bg-surface-secondary text-[10px] font-bold uppercase tracking-wider text-text-muted">
						<tr>
							<th class="px-3 py-2.5">GST Rate Slab</th>
							<th class="px-3 py-2.5 text-center">Items Received</th>
							<th class="px-3 py-2.5 text-right">Taxable Inward (₹)</th>
							<th class="px-3 py-2.5 text-right">Input CGST (₹)</th>
							<th class="px-3 py-2.5 text-right">Input SGST (₹)</th>
							<th class="px-3 py-2.5 text-right">Total ITC Available (₹)</th>
							<th class="px-3 py-2.5 text-right">Total Inward Purchase Value (₹)</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#if data.purchases.length === 0}
							<tr>
								<td colspan="7" class="px-3 py-6 text-center text-text-muted">No purchase GRNs recorded for this period.</td>
							</tr>
						{:else}
							{#each data.purchases as pSlab}
								<tr class="hover:bg-surface-hover transition-colors">
									<td class="px-3 py-2 font-mono font-bold text-success">
										<span class="rounded bg-success-light px-2 py-0.5 text-success">{pSlab.gstRate}% GST</span>
									</td>
									<td class="px-3 py-2 text-center font-mono">{pSlab.itemCount}</td>
									<td class="px-3 py-2 text-right font-mono tabular-nums text-text-primary">{formatCurrency(pSlab.taxableAmount)}</td>
									<td class="px-3 py-2 text-right font-mono tabular-nums text-text-secondary">{formatCurrency(pSlab.cgstAmount)}</td>
									<td class="px-3 py-2 text-right font-mono tabular-nums text-text-secondary">{formatCurrency(pSlab.sgstAmount)}</td>
									<td class="px-3 py-2 text-right font-mono font-bold tabular-nums text-success">{formatCurrency(pSlab.cgstAmount + pSlab.sgstAmount)}</td>
									<td class="px-3 py-2 text-right font-mono font-bold tabular-nums text-text-primary">{formatCurrency(pSlab.totalAmount)}</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
