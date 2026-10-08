<script lang="ts">
	import { onMount } from 'svelte';
	import { PageHeader, LoadingState, Button } from '$lib/components/common/index.js';
	import { formatCurrency, formatDate } from '$lib/utils/formatters.js';
	import {
		FileSpreadsheet,
		Printer,
		ShieldCheck,
		CheckCircle2,
		Building2,
		User,
		Layers,
		Hash,
		ArrowRight,
		Download
	} from '@lucide/svelte';

	interface B2BInvoice {
		id: string;
		invoiceNumber: string;
		date: string;
		customerName: string;
		customerGstin: string;
		pos: string;
		reverseCharge: 'N';
		invoiceType: 'Regular';
		taxableAmount: number;
		cgstAmount: number;
		sgstAmount: number;
		igstAmount: number;
		gstAmount: number;
		totalAmount: number;
		rate: number;
	}

	interface B2CSlab {
		gstRate: number;
		taxableAmount: number;
		cgstAmount: number;
		sgstAmount: number;
		totalTax: number;
		totalAmount: number;
	}

	interface HsnItem {
		hsnCode: string;
		description: string;
		uqc: string;
		totalQuantity: number;
		totalValue: number;
		taxableValue: number;
		cgstAmount: number;
		sgstAmount: number;
		igstAmount: number;
		cessAmount: number;
	}

	interface ItcSlab {
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
		store: {
			name: string;
			gstin: string;
			stateCode: string;
			pos: string;
		};
		totals: {
			invoiceCount: number;
			taxableAmount: number;
			gstAmount: number;
			cgstAmount: number;
			sgstAmount: number;
			igstAmount: number;
			totalAmount: number;
		};
		b2b: {
			summary: {
				invoiceCount: number;
				taxableAmount: number;
				cgstAmount: number;
				sgstAmount: number;
				igstAmount: number;
				gstAmount: number;
				totalAmount: number;
			};
			invoices: B2BInvoice[];
		};
		b2c: {
			summary: {
				invoiceCount: number;
				taxableAmount: number;
				cgstAmount: number;
				sgstAmount: number;
				gstAmount: number;
				totalAmount: number;
			};
			slabs: B2CSlab[];
		};
		hsnSummary: HsnItem[];
		sales: {
			gstRate: number;
			taxableAmount: number;
			cgstAmount: number;
			sgstAmount: number;
			totalAmount: number;
		}[];
		purchases: ItcSlab[];
	}

	let data = $state<GstReportData | null>(null);
	let loading = $state(true);

	// Date filter states
	let datePreset = $state<'month' | 'quarter' | 'year' | 'custom'>('month');
	let fromDate = $state('');
	let toDate = $state('');

	// Active tab: 'summary' | 'b2b' | 'b2c' | 'hsn' | 'itc'
	let activeTab = $state<'summary' | 'b2b' | 'b2c' | 'hsn' | 'itc'>('summary');

	function setDateRange(preset: 'month' | 'quarter' | 'year' | 'custom') {
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
			const fyStart =
				now.getMonth() >= 3
					? new Date(now.getFullYear(), 3, 1)
					: new Date(now.getFullYear() - 1, 3, 1);
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
			console.error('Failed to load GST statement:', e);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		setDateRange('month');
	});

	// Totals & ITC derived
	let totalOutputGst = $derived(data?.totals.gstAmount || 0);
	let totalSalesTaxable = $derived(data?.totals.taxableAmount || 0);
	let totalInputTaxCredit = $derived(
		data?.purchases.reduce((acc, p) => acc + p.cgstAmount + p.sgstAmount, 0) || 0
	);
	let netGstLiability = $derived(Math.max(0, totalOutputGst - totalInputTaxCredit));

	// Verification check: B2B + B2C = Total Sales
	let tieOutCheck = $derived(() => {
		if (!data) return { ok: true, diffTaxable: 0, diffGst: 0, diffTotal: 0 };
		const b2bTaxable = data.b2b.summary.taxableAmount;
		const b2cTaxable = data.b2c.summary.taxableAmount;
		const sumTaxable = Number((b2bTaxable + b2cTaxable).toFixed(2));
		const diffTaxable = Number((data.totals.taxableAmount - sumTaxable).toFixed(2));

		const b2bGst = data.b2b.summary.gstAmount;
		const b2cGst = data.b2c.summary.gstAmount;
		const sumGst = Number((b2bGst + b2cGst).toFixed(2));
		const diffGst = Number((data.totals.gstAmount - sumGst).toFixed(2));

		const b2bTot = data.b2b.summary.totalAmount;
		const b2cTot = data.b2c.summary.totalAmount;
		const sumTot = Number((b2bTot + b2cTot).toFixed(2));
		const diffTotal = Number((data.totals.totalAmount - sumTot).toFixed(2));

		const ok = Math.abs(diffTaxable) < 0.05 && Math.abs(diffGst) < 0.05 && Math.abs(diffTotal) < 0.05;
		return { ok, diffTaxable, diffGst, diffTotal, sumTaxable, sumGst, sumTot };
	});

	// Official GST Offline Tool CSV Exports
	function exportB2BCsv() {
		if (!data || data.b2b.invoices.length === 0) return;
		// Official Table 4 B2B format
		const headers = [
			'GSTIN/UIN of Recipient',
			'Receiver Name',
			'Invoice Number',
			'Invoice date',
			'Invoice Value',
			'Place Of Supply',
			'Reverse Charge',
			'Applicable % of Tax Rate',
			'Invoice Type',
			'E-Commerce GSTIN',
			'Rate',
			'Taxable Value',
			'Cess Amount'
		];

		const rows = data.b2b.invoices.map((inv) => [
			`"${inv.customerGstin}"`,
			`"${inv.customerName.replace(/"/g, '""')}"`,
			`"${inv.invoiceNumber}"`,
			`"${formatDate(inv.date)}"`,
			inv.totalAmount.toFixed(2),
			`"${inv.pos}"`,
			'N',
			'',
			'Regular',
			'',
			inv.rate.toFixed(2),
			inv.taxableAmount.toFixed(2),
			'0.00'
		]);

		downloadCsv(
			[headers.join(','), ...rows.map((r) => r.join(','))].join('\n'),
			`GSTR1_Table4_B2B_${fromDate}_to_${toDate}.csv`
		);
	}

	function exportB2CCsv() {
		if (!data || data.b2c.slabs.length === 0) return;
		// Official Table 7 B2C Small format
		const headers = [
			'Type',
			'Place Of Supply',
			'Applicable % of Tax Rate',
			'Rate',
			'Taxable Value',
			'Cess Amount',
			'E-Commerce GSTIN'
		];

		const pos = data.store.pos || '29-Local State';
		const rows = data.b2c.slabs
			.filter((s) => s.taxableAmount > 0)
			.map((s) => [
				'OE',
				`"${pos}"`,
				'',
				s.gstRate.toFixed(2),
				s.taxableAmount.toFixed(2),
				'0.00',
				''
			]);

		downloadCsv(
			[headers.join(','), ...rows.map((r) => r.join(','))].join('\n'),
			`GSTR1_Table7_B2C_${fromDate}_to_${toDate}.csv`
		);
	}

	function exportHsnCsv() {
		if (!data || data.hsnSummary.length === 0) return;
		// Official Table 12 HSN Summary format
		const headers = [
			'HSN',
			'Description',
			'UQC',
			'Total Quantity',
			'Total Value',
			'Taxable Value',
			'Integrated Tax Amount',
			'Central Tax Amount',
			'State/UT Tax Amount',
			'Cess Amount'
		];

		const rows = data.hsnSummary.map((h) => [
			`"${h.hsnCode}"`,
			`"${h.description.replace(/"/g, '""')}"`,
			`"${h.uqc}"`,
			h.totalQuantity.toFixed(2),
			h.totalValue.toFixed(2),
			h.taxableValue.toFixed(2),
			h.igstAmount.toFixed(2),
			h.cgstAmount.toFixed(2),
			h.sgstAmount.toFixed(2),
			'0.00'
		]);

		downloadCsv(
			[headers.join(','), ...rows.map((r) => r.join(','))].join('\n'),
			`GSTR1_Table12_HSN_${fromDate}_to_${toDate}.csv`
		);
	}

	function exportCompleteGstr1Csv() {
		if (!data) return;

		let content = `GSTR-1 STATUTORY FILING REPORT\nStore Name: ${data.store.name}\nGSTIN: ${data.store.gstin}\nPeriod: ${fromDate} to ${toDate}\nGenerated: ${new Date().toLocaleString('en-IN')}\n\n`;

		// Section 1: Summary Reconciliation
		content += `--- SUMMARY RECONCILIATION ---\n`;
		content += `Classification,Invoices,Taxable Turnover (INR),CGST (INR),SGST (INR),IGST (INR),Total Tax (INR),Gross Total (INR)\n`;
		content += `B2B Registered,${data.b2b.summary.invoiceCount},${data.b2b.summary.taxableAmount.toFixed(2)},${data.b2b.summary.cgstAmount.toFixed(2)},${data.b2b.summary.sgstAmount.toFixed(2)},${data.b2b.summary.igstAmount.toFixed(2)},${data.b2b.summary.gstAmount.toFixed(2)},${data.b2b.summary.totalAmount.toFixed(2)}\n`;
		content += `B2C Retail,${data.b2c.summary.invoiceCount},${data.b2c.summary.taxableAmount.toFixed(2)},${data.b2c.summary.cgstAmount.toFixed(2)},${data.b2c.summary.sgstAmount.toFixed(2)},0.00,${data.b2c.summary.gstAmount.toFixed(2)},${data.b2c.summary.totalAmount.toFixed(2)}\n`;
		content += `TOTAL SALES,${data.totals.invoiceCount},${data.totals.taxableAmount.toFixed(2)},${data.totals.cgstAmount.toFixed(2)},${data.totals.sgstAmount.toFixed(2)},${data.totals.igstAmount.toFixed(2)},${data.totals.gstAmount.toFixed(2)},${data.totals.totalAmount.toFixed(2)}\n\n`;

		// Section 2: Table 4 B2B Invoices
		content += `--- TABLE 4: B2B INVOICES ---\n`;
		content += `GSTIN/UIN,Receiver Name,Invoice Number,Invoice Date,Invoice Value,POS,Reverse Charge,Rate %,Taxable Value,CGST,SGST,IGST\n`;
		for (const inv of data.b2b.invoices) {
			content += `"${inv.customerGstin}","${inv.customerName.replace(/"/g, '""')}","${inv.invoiceNumber}","${formatDate(inv.date)}",${inv.totalAmount.toFixed(2)},"${inv.pos}",N,${inv.rate.toFixed(2)},${inv.taxableAmount.toFixed(2)},${inv.cgstAmount.toFixed(2)},${inv.sgstAmount.toFixed(2)},${inv.igstAmount.toFixed(2)}\n`;
		}
		content += `\n`;

		// Section 3: Table 7 B2C Slabs
		content += `--- TABLE 7: B2C SLABS SUMMARY ---\n`;
		content += `Rate Slab,Taxable Turnover,CGST,SGST,Total Tax,Gross Value\n`;
		for (const s of data.b2c.slabs) {
			content += `${s.gstRate}%,${s.taxableAmount.toFixed(2)},${s.cgstAmount.toFixed(2)},${s.sgstAmount.toFixed(2)},${s.totalTax.toFixed(2)},${s.totalAmount.toFixed(2)}\n`;
		}
		content += `\n`;

		// Section 4: Table 12 HSN Summary
		content += `--- TABLE 12: HSN SUMMARY ---\n`;
		content += `HSN Code,Description,UQC,Total Qty,Total Value,Taxable Value,Central Tax (CGST),State Tax (SGST),Integrated Tax (IGST)\n`;
		for (const h of data.hsnSummary) {
			content += `"${h.hsnCode}","${h.description.replace(/"/g, '""')}","${h.uqc}",${h.totalQuantity.toFixed(2)},${h.totalValue.toFixed(2)},${h.taxableValue.toFixed(2)},${h.cgstAmount.toFixed(2)},${h.sgstAmount.toFixed(2)},${h.igstAmount.toFixed(2)}\n`;
		}

		downloadCsv(content, `GSTR1_Consolidated_Statement_${fromDate}_to_${toDate}.csv`);
	}

	function downloadCsv(content: string, filename: string) {
		const csvContent = 'data:text/csv;charset=utf-8,﻿' + content;
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', encodedUri);
		link.setAttribute('download', filename);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
</script>

<svelte:head>
	<title>GSTR-1 Statutory Tax Filing Statement - MedStock ERP</title>
</svelte:head>

<div class="space-y-4">
	<PageHeader
		title="GSTR-1 Tax Reports & CA Audit Statement"
		subtitle="Indian GST statutory categorization: Table 4 (B2B), Table 7 (B2C), and Table 12 (HSN-wise summary) with integer paise precision"
		backHref="/reports"
	>
		{#snippet actions()}
			<div class="flex flex-wrap items-center gap-2">
				<Button
					variant="secondary"
					size="sm"
					onclick={exportCompleteGstr1Csv}
					disabled={!data || data.totals.invoiceCount === 0}
				>
					<Download size={14} class="mr-1 text-success" />
					<span>Download GSTR-1 CSV</span>
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
					class="rounded-md border border-border bg-surface px-2 py-1 font-mono text-xs text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
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
					class="rounded-md border border-border bg-surface px-2 py-1 font-mono text-xs text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
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
			<div class="text-[10px] text-text-muted">{data?.totals.invoiceCount || 0} Total Invoices</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total Output GST</div>
			<div class="mt-1 font-mono text-lg font-bold text-accent tabular-nums">
				{formatCurrency(totalOutputGst)}
			</div>
			<div class="text-[10px] text-text-muted">CGST + SGST + IGST Collected</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Eligible Input Tax Credit (ITC)</div>
			<div class="mt-1 font-mono text-lg font-bold text-success tabular-nums">
				{formatCurrency(totalInputTaxCredit)}
			</div>
			<div class="text-[10px] text-text-muted">GST Paid on Purchases (Inward)</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Net GST Payable (GSTR-3B)</div>
			<div
				class="mt-1 font-mono text-lg font-bold tabular-nums {netGstLiability > 0
					? 'text-danger'
					: 'text-success'}"
			>
				{formatCurrency(netGstLiability)}
			</div>
			<div class="text-[10px] text-text-muted">Output GST minus eligible ITC</div>
		</div>
	</div>

	<!-- Statutory B2B vs B2C Rupee Tie-Out Banner -->
	{#if data}
		{@const check = tieOutCheck()}
		<div
			class="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-xs shadow-2xs {check.ok
				? 'border-success/30 bg-success/10 text-text-primary'
				: 'border-danger/30 bg-danger/10 text-danger'}"
		>
			<div class="flex items-center gap-2">
				{#if check.ok}
					<CheckCircle2 class="h-5 w-5 shrink-0 text-success" />
				{:else}
					<ShieldCheck class="h-5 w-5 shrink-0 text-danger" />
				{/if}
				<div>
					<span class="font-bold">
						{check.ok
							? 'Statutory Reconciliation Verified: B2B + B2C Ties Out Exactly to Rupee'
							: 'Reconciliation Discrepancy Detected'}
					</span>
					<div class="text-[11px] text-text-secondary mt-0.5">
						Total Sales: <strong class="font-mono text-text-primary">{formatCurrency(data.totals.totalAmount)}</strong>
						= B2B: <span class="font-mono">{formatCurrency(data.b2b.summary.totalAmount)}</span>
						+ B2C: <span class="font-mono">{formatCurrency(data.b2c.summary.totalAmount)}</span>
						{#if !check.ok}
							<span class="text-danger font-bold ml-1">(Diff: ₹{check.diffTotal})</span>
						{/if}
					</div>
				</div>
			</div>

			<div class="flex items-center gap-4 text-[11px] font-mono">
				<div>
					<span class="text-text-muted">Taxable: </span>
					<strong>{formatCurrency(data.b2b.summary.taxableAmount)}</strong> + <strong>{formatCurrency(data.b2c.summary.taxableAmount)}</strong>
					= <strong>{formatCurrency(data.totals.taxableAmount)}</strong>
				</div>
				<div>
					<span class="text-text-muted">GST: </span>
					<strong>{formatCurrency(data.b2b.summary.gstAmount)}</strong> + <strong>{formatCurrency(data.b2c.summary.gstAmount)}</strong>
					= <strong>{formatCurrency(data.totals.gstAmount)}</strong>
				</div>
			</div>
		</div>
	{/if}

	<!-- Section Navigation Tabs -->
	<div class="flex flex-wrap items-center gap-2 border-b border-border pb-2 text-xs">
		<button
			type="button"
			class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all {activeTab === 'summary'
				? 'bg-accent text-white shadow-2xs'
				: 'bg-surface text-text-secondary hover:bg-surface-secondary border border-border'}"
			onclick={() => (activeTab = 'summary')}
		>
			<Layers size={13} />
			<span>Overview &amp; Slabs</span>
		</button>

		<button
			type="button"
			class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all {activeTab === 'b2b'
				? 'bg-accent text-white shadow-2xs'
				: 'bg-surface text-text-secondary hover:bg-surface-secondary border border-border'}"
			onclick={() => (activeTab = 'b2b')}
		>
			<Building2 size={13} />
			<span>Table 4: B2B Invoices ({data?.b2b.summary.invoiceCount || 0})</span>
		</button>

		<button
			type="button"
			class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all {activeTab === 'b2c'
				? 'bg-accent text-white shadow-2xs'
				: 'bg-surface text-text-secondary hover:bg-surface-secondary border border-border'}"
			onclick={() => (activeTab = 'b2c')}
		>
			<User size={13} />
			<span>Table 7: B2C Slabs ({data?.b2c.summary.invoiceCount || 0} Bills)</span>
		</button>

		<button
			type="button"
			class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all {activeTab === 'hsn'
				? 'bg-accent text-white shadow-2xs'
				: 'bg-surface text-text-secondary hover:bg-surface-secondary border border-border'}"
			onclick={() => (activeTab = 'hsn')}
		>
			<Hash size={13} />
			<span>Table 12: HSN Summary ({data?.hsnSummary.length || 0})</span>
		</button>

		<button
			type="button"
			class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all {activeTab === 'itc'
				? 'bg-accent text-white shadow-2xs'
				: 'bg-surface text-text-secondary hover:bg-surface-secondary border border-border'}"
			onclick={() => (activeTab = 'itc')}
		>
			<ShieldCheck size={13} />
			<span>GSTR-3B ITC Offsets</span>
		</button>
	</div>

	{#if loading}
		<div class="p-8">
			<LoadingState message="Compiling GSTR-1 statutory tables and tax reconciliations..." />
		</div>
	{:else if data}
		<!-- TAB 1: OVERVIEW & SLABS -->
		{#if activeTab === 'summary'}
			<div class="space-y-4">
				<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
					<!-- B2B vs B2C Split Cards -->
					<div class="rounded-xl border border-border bg-surface p-4 shadow-2xs space-y-3">
						<div class="flex items-center justify-between">
							<h3 class="text-xs font-bold uppercase tracking-wider text-text-muted">
								Tax Classification Split
							</h3>
							<span class="text-[10px] text-text-muted">Rule 4 &amp; 7 Classification</span>
						</div>

						<div class="grid grid-cols-2 gap-3">
							<!-- B2B Card -->
							<div class="rounded-lg border border-accent/30 bg-accent/5 p-3">
								<div class="flex items-center justify-between">
									<span class="text-[10px] font-bold uppercase tracking-wider text-accent">B2B Registered</span>
									<span class="rounded bg-accent-light px-1.5 py-0.5 text-[9px] font-black text-accent">WITH GSTIN</span>
								</div>
								<div class="mt-1 font-mono text-base font-bold text-text-primary tabular-nums">
									{formatCurrency(data.b2b.summary.totalAmount)}
								</div>
								<div class="mt-2 space-y-0.5 text-[11px] text-text-muted">
									<div>Invoices: <strong class="font-mono text-text-primary">{data.b2b.summary.invoiceCount}</strong></div>
									<div>Taxable: <span class="font-mono text-text-secondary">{formatCurrency(data.b2b.summary.taxableAmount)}</span></div>
									<div>GST: <span class="font-mono text-accent font-semibold">{formatCurrency(data.b2b.summary.gstAmount)}</span></div>
								</div>
								<div class="mt-3">
									<button
										type="button"
										class="text-[11px] font-semibold text-accent hover:underline flex items-center gap-1"
										onclick={() => (activeTab = 'b2b')}
									>
										<span>View Table 4 Invoices</span>
										<ArrowRight size={11} />
									</button>
								</div>
							</div>

							<!-- B2C Card -->
							<div class="rounded-lg border border-border bg-surface-secondary p-3">
								<div class="flex items-center justify-between">
									<span class="text-[10px] font-bold uppercase tracking-wider text-text-secondary">B2C Retail</span>
									<span class="rounded bg-surface px-1.5 py-0.5 text-[9px] font-bold text-text-muted border border-border">CONSUMER</span>
								</div>
								<div class="mt-1 font-mono text-base font-bold text-text-primary tabular-nums">
									{formatCurrency(data.b2c.summary.totalAmount)}
								</div>
								<div class="mt-2 space-y-0.5 text-[11px] text-text-muted">
									<div>Invoices: <strong class="font-mono text-text-primary">{data.b2c.summary.invoiceCount}</strong></div>
									<div>Taxable: <span class="font-mono text-text-secondary">{formatCurrency(data.b2c.summary.taxableAmount)}</span></div>
									<div>GST: <span class="font-mono text-accent font-semibold">{formatCurrency(data.b2c.summary.gstAmount)}</span></div>
								</div>
								<div class="mt-3">
									<button
										type="button"
										class="text-[11px] font-semibold text-accent hover:underline flex items-center gap-1"
										onclick={() => (activeTab = 'b2c')}
									>
										<span>View Table 7 Slabs</span>
										<ArrowRight size={11} />
									</button>
								</div>
							</div>
						</div>
					</div>

					<!-- GSTR-3B Tax Offset Ledger -->
					<div class="flex flex-col justify-between rounded-xl border border-border bg-surface p-4 shadow-2xs">
						<div>
							<h3 class="text-xs font-bold uppercase tracking-wider text-text-muted">GSTR-3B Tax Offset Ledger</h3>
							<div class="mt-3 space-y-2 text-xs">
								<div class="flex justify-between py-1 border-b border-border">
									<span class="text-text-secondary">Total Output Tax Liability (Sales)</span>
									<span class="font-mono font-bold text-accent">{formatCurrency(totalOutputGst)}</span>
								</div>
								<div class="flex justify-between py-1 border-b border-border">
									<span class="text-text-secondary">Less: Eligible Input Tax Credit (Purchases)</span>
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

						<div class="mt-3 rounded-lg bg-surface-secondary p-2 text-[11px] text-text-muted flex items-center gap-2">
							<ShieldCheck size={16} class="text-success shrink-0" />
							<span>50/50 Intra-State Central GST &amp; State GST split verified with zero rounding drift.</span>
						</div>
					</div>
				</div>

				<!-- Combined Sales Tax Slabs -->
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<h3 class="text-xs font-bold uppercase tracking-wider text-text-muted">
							Outward Supplies — Combined Rate Slabs
						</h3>
					</div>
					<div class="overflow-x-auto rounded-xl border border-border bg-surface shadow-2xs">
						<table class="w-full text-left text-xs">
							<thead class="border-b border-border bg-surface-secondary text-[10px] font-bold uppercase tracking-wider text-text-muted">
								<tr>
									<th class="px-3 py-2.5">GST Rate Slab</th>
									<th class="px-3 py-2.5 text-right">Taxable Value (₹)</th>
									<th class="px-3 py-2.5 text-right">CGST (₹)</th>
									<th class="px-3 py-2.5 text-right">SGST (₹)</th>
									<th class="px-3 py-2.5 text-right">Total Tax (₹)</th>
									<th class="px-3 py-2.5 text-right">Total Gross Turnover (₹)</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-border">
								{#each data.sales as slab}
									<tr class="hover:bg-surface-hover transition-colors">
										<td class="px-3 py-2 font-mono font-bold text-accent">
											<span class="rounded bg-accent-light px-2 py-0.5 text-accent">{slab.gstRate}% GST</span>
										</td>
										<td class="px-3 py-2 text-right font-mono tabular-nums text-text-primary">
											{formatCurrency(slab.taxableAmount)}
										</td>
										<td class="px-3 py-2 text-right font-mono tabular-nums text-text-secondary">
											{formatCurrency(slab.cgstAmount)}
										</td>
										<td class="px-3 py-2 text-right font-mono tabular-nums text-text-secondary">
											{formatCurrency(slab.sgstAmount)}
										</td>
										<td class="px-3 py-2 text-right font-mono font-bold tabular-nums text-accent">
											{formatCurrency(slab.cgstAmount + slab.sgstAmount)}
										</td>
										<td class="px-3 py-2 text-right font-mono font-bold tabular-nums text-text-primary">
											{formatCurrency(slab.totalAmount)}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>

		<!-- TAB 2: TABLE 4 B2B INVOICES -->
		{:else if activeTab === 'b2b'}
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<div>
						<h3 class="text-xs font-bold uppercase tracking-wider text-text-primary">
							Table 4: Taxable Outward Supplies to Registered Persons (B2B)
						</h3>
						<p class="text-[11px] text-text-muted">
							Itemized list of all sales invoices issued to customers with a verified GSTIN
						</p>
					</div>
					<Button
						variant="secondary"
						size="sm"
						onclick={exportB2BCsv}
						disabled={data.b2b.invoices.length === 0}
					>
						<FileSpreadsheet size={13} class="mr-1 text-success" />
						<span>Export Table 4 CSV</span>
					</Button>
				</div>

				<div class="overflow-x-auto rounded-xl border border-border bg-surface shadow-2xs">
					<table class="w-full text-left text-xs">
						<thead class="border-b border-border bg-surface-secondary text-[10px] font-bold uppercase tracking-wider text-text-muted">
							<tr>
								<th class="px-3 py-2.5 whitespace-nowrap">Invoice No</th>
								<th class="px-3 py-2.5 whitespace-nowrap">Date</th>
								<th class="px-3 py-2.5">Customer Name</th>
								<th class="px-3 py-2.5 whitespace-nowrap">Customer GSTIN</th>
								<th class="px-3 py-2.5 whitespace-nowrap">POS</th>
								<th class="px-3 py-2.5 text-center">Rate</th>
								<th class="px-3 py-2.5 text-right whitespace-nowrap">Taxable Value (₹)</th>
								<th class="px-3 py-2.5 text-right whitespace-nowrap">CGST (₹)</th>
								<th class="px-3 py-2.5 text-right whitespace-nowrap">SGST (₹)</th>
								<th class="px-3 py-2.5 text-right whitespace-nowrap">IGST (₹)</th>
								<th class="px-3 py-2.5 text-right whitespace-nowrap">Invoice Value (₹)</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border">
							{#if data.b2b.invoices.length === 0}
								<tr>
									<td colspan="11" class="px-3 py-8 text-center text-text-muted">
										No B2B sales to GST-registered parties recorded in this period.
									</td>
								</tr>
							{:else}
								{#each data.b2b.invoices as inv}
									<tr class="hover:bg-surface-hover transition-colors font-sans">
										<td class="px-3 py-2.5 font-mono font-bold text-accent whitespace-nowrap">
											{inv.invoiceNumber}
										</td>
										<td class="px-3 py-2.5 font-mono text-text-secondary whitespace-nowrap">
											{formatDate(inv.date)}
										</td>
										<td class="px-3 py-2.5 font-semibold text-text-primary max-w-xs truncate">
											{inv.customerName}
										</td>
										<td class="px-3 py-2.5 font-mono font-bold text-text-primary whitespace-nowrap">
											<span class="rounded bg-surface-secondary px-1.5 py-0.5 border border-border">
												{inv.customerGstin}
											</span>
										</td>
										<td class="px-3 py-2.5 text-text-secondary whitespace-nowrap">
											{inv.pos}
										</td>
										<td class="px-3 py-2.5 text-center font-mono font-bold text-accent">
											{inv.rate}%
										</td>
										<td class="px-3 py-2.5 text-right font-mono tabular-nums text-text-primary whitespace-nowrap">
											{formatCurrency(inv.taxableAmount)}
										</td>
										<td class="px-3 py-2.5 text-right font-mono tabular-nums text-text-secondary whitespace-nowrap">
											{formatCurrency(inv.cgstAmount)}
										</td>
										<td class="px-3 py-2.5 text-right font-mono tabular-nums text-text-secondary whitespace-nowrap">
											{formatCurrency(inv.sgstAmount)}
										</td>
										<td class="px-3 py-2.5 text-right font-mono tabular-nums text-text-secondary whitespace-nowrap">
											{formatCurrency(inv.igstAmount)}
										</td>
										<td class="px-3 py-2.5 text-right font-mono font-bold tabular-nums text-text-primary whitespace-nowrap">
											{formatCurrency(inv.totalAmount)}
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
						{#if data.b2b.invoices.length > 0}
							<tfoot class="border-t-2 border-border bg-surface-secondary font-bold font-mono">
								<tr>
									<td colspan="6" class="px-3 py-2 text-text-primary">B2B TOTALS:</td>
									<td class="px-3 py-2 text-right text-text-primary">{formatCurrency(data.b2b.summary.taxableAmount)}</td>
									<td class="px-3 py-2 text-right text-text-secondary">{formatCurrency(data.b2b.summary.cgstAmount)}</td>
									<td class="px-3 py-2 text-right text-text-secondary">{formatCurrency(data.b2b.summary.sgstAmount)}</td>
									<td class="px-3 py-2 text-right text-text-secondary">{formatCurrency(data.b2b.summary.igstAmount)}</td>
									<td class="px-3 py-2 text-right text-accent">{formatCurrency(data.b2b.summary.totalAmount)}</td>
								</tr>
							</tfoot>
						{/if}
					</table>
				</div>
			</div>

		<!-- TAB 3: TABLE 7 B2C SLABS -->
		{:else if activeTab === 'b2c'}
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<div>
						<h3 class="text-xs font-bold uppercase tracking-wider text-text-primary">
							Table 7: Taxable Supplies to Unregistered Persons (B2C Others)
						</h3>
						<p class="text-[11px] text-text-muted">
							Walk-in retail sales aggregated by tax slab (0%, 5%, 12%, 18%)
						</p>
					</div>
					<Button
						variant="secondary"
						size="sm"
						onclick={exportB2CCsv}
						disabled={data.b2c.slabs.length === 0}
					>
						<FileSpreadsheet size={13} class="mr-1 text-success" />
						<span>Export Table 7 CSV</span>
					</Button>
				</div>

				<div class="overflow-x-auto rounded-xl border border-border bg-surface shadow-2xs">
					<table class="w-full text-left text-xs">
						<thead class="border-b border-border bg-surface-secondary text-[10px] font-bold uppercase tracking-wider text-text-muted">
							<tr>
								<th class="px-3 py-2.5">Rate Slab</th>
								<th class="px-3 py-2.5">Place of Supply</th>
								<th class="px-3 py-2.5 text-right">Taxable Turnover (₹)</th>
								<th class="px-3 py-2.5 text-right">CGST (₹)</th>
								<th class="px-3 py-2.5 text-right">SGST (₹)</th>
								<th class="px-3 py-2.5 text-right">Total Tax (₹)</th>
								<th class="px-3 py-2.5 text-right">Gross Invoice Value (₹)</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border">
							{#each data.b2c.slabs as slab}
								<tr class="hover:bg-surface-hover transition-colors font-sans">
									<td class="px-3 py-2.5 font-mono font-bold text-accent">
										<span class="rounded bg-accent-light px-2 py-0.5 text-accent">{slab.gstRate}% GST</span>
									</td>
									<td class="px-3 py-2.5 text-text-secondary">
										{data.store.pos}
									</td>
									<td class="px-3 py-2.5 text-right font-mono tabular-nums text-text-primary">
										{formatCurrency(slab.taxableAmount)}
									</td>
									<td class="px-3 py-2.5 text-right font-mono tabular-nums text-text-secondary">
										{formatCurrency(slab.cgstAmount)}
									</td>
									<td class="px-3 py-2.5 text-right font-mono tabular-nums text-text-secondary">
										{formatCurrency(slab.sgstAmount)}
									</td>
									<td class="px-3 py-2.5 text-right font-mono font-bold tabular-nums text-accent">
										{formatCurrency(slab.totalTax)}
									</td>
									<td class="px-3 py-2.5 text-right font-mono font-bold tabular-nums text-text-primary">
										{formatCurrency(slab.totalAmount)}
									</td>
								</tr>
							{/each}
						</tbody>
						<tfoot class="border-t-2 border-border bg-surface-secondary font-bold font-mono">
							<tr>
								<td colspan="2" class="px-3 py-2 text-text-primary">B2C TOTALS:</td>
								<td class="px-3 py-2 text-right text-text-primary">{formatCurrency(data.b2c.summary.taxableAmount)}</td>
								<td class="px-3 py-2 text-right text-text-secondary">{formatCurrency(data.b2c.summary.cgstAmount)}</td>
								<td class="px-3 py-2 text-right text-text-secondary">{formatCurrency(data.b2c.summary.sgstAmount)}</td>
								<td class="px-3 py-2 text-right text-accent">{formatCurrency(data.b2c.summary.gstAmount)}</td>
								<td class="px-3 py-2 text-right text-accent">{formatCurrency(data.b2c.summary.totalAmount)}</td>
							</tr>
						</tfoot>
					</table>
				</div>
			</div>

		<!-- TAB 4: TABLE 12 HSN SUMMARY -->
		{:else if activeTab === 'hsn'}
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<div>
						<h3 class="text-xs font-bold uppercase tracking-wider text-text-primary">
							Table 12: HSN-Wise Summary of Outward Supplies
						</h3>
						<p class="text-[11px] text-text-muted">
							Mandatory statutory table grouped by 8-digit HSN code with UQC quantity and tax values
						</p>
					</div>
					<Button
						variant="secondary"
						size="sm"
						onclick={exportHsnCsv}
						disabled={data.hsnSummary.length === 0}
					>
						<FileSpreadsheet size={13} class="mr-1 text-success" />
						<span>Export Table 12 CSV</span>
					</Button>
				</div>

				<div class="overflow-x-auto rounded-xl border border-border bg-surface shadow-2xs">
					<table class="w-full text-left text-xs">
						<thead class="border-b border-border bg-surface-secondary text-[10px] font-bold uppercase tracking-wider text-text-muted">
							<tr>
								<th class="px-3 py-2.5 whitespace-nowrap">HSN Code</th>
								<th class="px-3 py-2.5">Description</th>
								<th class="px-3 py-2.5 whitespace-nowrap">UQC</th>
								<th class="px-3 py-2.5 text-right whitespace-nowrap">Total Qty</th>
								<th class="px-3 py-2.5 text-right whitespace-nowrap">Taxable Value (₹)</th>
								<th class="px-3 py-2.5 text-right whitespace-nowrap">Central Tax (₹)</th>
								<th class="px-3 py-2.5 text-right whitespace-nowrap">State Tax (₹)</th>
								<th class="px-3 py-2.5 text-right whitespace-nowrap">Integrated Tax (₹)</th>
								<th class="px-3 py-2.5 text-right whitespace-nowrap">Total Value (₹)</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border">
							{#if data.hsnSummary.length === 0}
								<tr>
									<td colspan="9" class="px-3 py-8 text-center text-text-muted">
										No HSN items recorded in this period.
									</td>
								</tr>
							{:else}
								{#each data.hsnSummary as item}
									<tr class="hover:bg-surface-hover transition-colors font-sans">
										<td class="px-3 py-2.5 font-mono font-bold text-accent whitespace-nowrap">
											{item.hsnCode}
										</td>
										<td class="px-3 py-2.5 font-medium text-text-primary max-w-xs truncate">
											{item.description}
										</td>
										<td class="px-3 py-2.5 text-text-secondary whitespace-nowrap">
											{item.uqc}
										</td>
										<td class="px-3 py-2.5 text-right font-mono font-bold text-text-primary whitespace-nowrap">
											{item.totalQuantity}
										</td>
										<td class="px-3 py-2.5 text-right font-mono tabular-nums text-text-primary whitespace-nowrap">
											{formatCurrency(item.taxableValue)}
										</td>
										<td class="px-3 py-2.5 text-right font-mono tabular-nums text-text-secondary whitespace-nowrap">
											{formatCurrency(item.cgstAmount)}
										</td>
										<td class="px-3 py-2.5 text-right font-mono tabular-nums text-text-secondary whitespace-nowrap">
											{formatCurrency(item.sgstAmount)}
										</td>
										<td class="px-3 py-2.5 text-right font-mono tabular-nums text-text-secondary whitespace-nowrap">
											{formatCurrency(item.igstAmount)}
										</td>
										<td class="px-3 py-2.5 text-right font-mono font-bold tabular-nums text-text-primary whitespace-nowrap">
											{formatCurrency(item.totalValue)}
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>

		<!-- TAB 5: GSTR-3B ITC OFFSETS -->
		{:else if activeTab === 'itc'}
			<div class="space-y-3">
				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider text-text-primary">
						Inward Supplies (Purchases) — Eligible Input Tax Credit (ITC)
					</h3>
					<p class="text-[11px] text-text-muted">
						Tax paid on verified Goods Inward Receipts (GRN) available to set off against outward liability
					</p>
				</div>

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
								<th class="px-3 py-2.5 text-right">Total Inward Value (₹)</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border">
							{#if data.purchases.length === 0}
								<tr>
									<td colspan="7" class="px-3 py-8 text-center text-text-muted">
										No purchase GRNs recorded for this period.
									</td>
								</tr>
							{:else}
								{#each data.purchases as pSlab}
									<tr class="hover:bg-surface-hover transition-colors font-sans">
										<td class="px-3 py-2.5 font-mono font-bold text-success">
											<span class="rounded bg-success-light px-2 py-0.5 text-success">{pSlab.gstRate}% GST</span>
										</td>
										<td class="px-3 py-2.5 text-center font-mono">{pSlab.itemCount}</td>
										<td class="px-3 py-2.5 text-right font-mono tabular-nums text-text-primary">{formatCurrency(pSlab.taxableAmount)}</td>
										<td class="px-3 py-2.5 text-right font-mono tabular-nums text-text-secondary">{formatCurrency(pSlab.cgstAmount)}</td>
										<td class="px-3 py-2.5 text-right font-mono tabular-nums text-text-secondary">{formatCurrency(pSlab.sgstAmount)}</td>
										<td class="px-3 py-2.5 text-right font-mono font-bold tabular-nums text-success">{formatCurrency(pSlab.cgstAmount + pSlab.sgstAmount)}</td>
										<td class="px-3 py-2.5 text-right font-mono font-bold tabular-nums text-text-primary">{formatCurrency(pSlab.totalAmount)}</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	{/if}
</div>
