<script lang="ts">
	import { onMount } from 'svelte';
	import { PageHeader, LoadingState, Button, Badge } from '$lib/components/common/index.js';
	import { formatCurrency, formatDate, formatDateTime } from '$lib/utils/formatters.js';
	import {
		FileSpreadsheet,
		Printer,
		ShieldAlert,
		Search,
		FileText,
		Calendar,
		User,
		Stethoscope,
		Pill,
		AlertTriangle,
		RefreshCw
	} from '@lucide/svelte';

	interface ScheduleRow {
		saleItemId: string;
		saleId: string;
		date: string;
		invoiceNumber: string;
		saleType: 'retail' | 'wholesale';
		patientName: string | null;
		prescriberName: string | null;
		prescriberRegNo: string | null;
		notes: string | null;
		customerId: string | null;
		customerName: string | null;
		customerPhone: string | null;
		customerAddress: string | null;
		productId: string;
		productName: string;
		genericName: string | null;
		manufacturer: string | null;
		drugSchedule: string;
		hsnCode: string | null;
		batchId: string;
		batchNo: string;
		expiryDate: string;
		quantity: number;
		rate: number;
		gstRate: number;
		lineTotal: number;
		dispensedBy: string | null;
	}

	interface ScheduleSummary {
		totalEntries: number;
		distinctInvoices: number;
		totalQuantity: number;
		totalValue: number;
		h1Count: number;
		hCount: number;
		xCount: number;
	}

	let entries = $state<ScheduleRow[]>([]);
	let summary = $state<ScheduleSummary>({
		totalEntries: 0,
		distinctInvoices: 0,
		totalQuantity: 0,
		totalValue: 0,
		h1Count: 0,
		hCount: 0,
		xCount: 0
	});
	let loading = $state(true);

	// Filter states
	let datePreset = $state('month');
	let fromDate = $state('');
	let toDate = $state('');
	let scheduleFilter = $state('all');
	let searchQuery = $state('');
	let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

	function setDateRange(preset: string) {
		datePreset = preset;
		const now = new Date();
		const todayStr = now.toISOString().split('T')[0];

		if (preset === 'today') {
			fromDate = todayStr;
			toDate = todayStr;
		} else if (preset === 'week') {
			const weekStart = new Date(now);
			weekStart.setDate(now.getDate() - 7);
			fromDate = weekStart.toISOString().split('T')[0];
			toDate = todayStr;
		} else if (preset === 'month') {
			const m = new Date(now.getFullYear(), now.getMonth(), 1);
			fromDate = m.toISOString().split('T')[0];
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

	function handleSearchInput() {
		if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
		searchDebounceTimer = setTimeout(() => {
			loadReport();
		}, 300);
	}

	async function loadReport() {
		loading = true;
		try {
			const params = new URLSearchParams();
			if (fromDate) params.append('from', fromDate);
			if (toDate) params.append('to', toDate);
			if (scheduleFilter) params.append('schedule', scheduleFilter);
			if (searchQuery.trim()) params.append('search', searchQuery.trim());

			const res = await fetch(`/api/reports/schedule-h1?${params.toString()}`);
			if (res.ok) {
				const data = await res.json();
				entries = data.entries || [];
				summary = data.summary || {
					totalEntries: 0,
					distinctInvoices: 0,
					totalQuantity: 0,
					totalValue: 0,
					h1Count: 0,
					hCount: 0,
					xCount: 0
				};
			}
		} catch (e) {
			console.error('Failed to load Schedule H1 audit register:', e);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		setDateRange('month');
	});

	function exportForm35Csv() {
		if (!entries || entries.length === 0) return;

		const headers = [
			'Date of Supply',
			'Invoice No',
			'Sale Type',
			'Drug Name',
			'Generic Composition',
			'Schedule',
			'Batch No',
			'Expiry Date',
			'Quantity',
			'Rate (₹)',
			'Total (₹)',
			'Patient / Buyer Name',
			'Patient Address / Phone',
			'Prescriber (Doctor) Name',
			'Doctor Reg No (MCI / State Council)',
			'Dispensed By',
			'Remarks / Notes'
		];

		const rows = entries.map((r) => [
			`"${formatDate(r.date)}"`,
			`"${r.invoiceNumber}"`,
			`"${r.saleType}"`,
			`"${(r.productName || '').replace(/"/g, '""')}"`,
			`"${(r.genericName || '').replace(/"/g, '""')}"`,
			`"${r.drugSchedule}"`,
			`"${r.batchNo}"`,
			`"${r.expiryDate}"`,
			r.quantity,
			r.rate.toFixed(2),
			r.lineTotal.toFixed(2),
			`"${(r.patientName || r.customerName || 'Walk-in').replace(/"/g, '""')}"`,
			`"${(r.customerAddress || r.customerPhone || '-').replace(/"/g, '""')}"`,
			`"${(r.prescriberName || '-').replace(/"/g, '""')}"`,
			`"${(r.prescriberRegNo || '-').replace(/"/g, '""')}"`,
			`"${(r.dispensedBy || '-').replace(/"/g, '""')}"`,
			`"${(r.notes || '').replace(/"/g, '""')}"`
		]);

		const csvContent =
			'data:text/csv;charset=utf-8,﻿' +
			[headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', encodedUri);
		link.setAttribute(
			'download',
			`Schedule_H1_Form35_Register_${fromDate}_to_${toDate}.csv`
		);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
</script>

<svelte:head>
	<title>Schedule H / H1 / X Controlled Drug Inspection Register - MedStock ERP</title>
</svelte:head>

<div class="space-y-4">
	<PageHeader
		title="Schedule H / H1 / X Controlled Drug Register"
		subtitle="Statutory Form 35 Inspection Register compliant with Rule 65 of the Drugs and Cosmetics Rules, 1945"
		backHref="/reports"
	>
		{#snippet actions()}
			<div class="flex items-center gap-2 print:hidden">
				<Button
					variant="secondary"
					size="sm"
					onclick={exportForm35Csv}
					disabled={entries.length === 0}
				>
					<FileSpreadsheet size={14} class="mr-1 text-success" />
					<span>Export Form 35 CSV</span>
				</Button>
				<Button variant="secondary" size="sm" onclick={() => window.print()}>
					<Printer size={14} class="mr-1 text-text-muted" />
					<span>Print Inspection Sheet</span>
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	<!-- Regulatory Statutory Banner -->
	<div
		class="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3 text-text-primary"
	>
		<ShieldAlert class="mt-0.5 h-5 w-5 shrink-0 text-warning" />
		<div class="text-xs leading-relaxed">
			<p class="font-bold uppercase tracking-wider text-warning">
				Rule 65 Statutory Requirement — Drugs & Cosmetics Rules, 1945
			</p>
			<p class="mt-0.5 text-text-secondary">
				Every licensee must maintain a separate register for <strong>Schedule H1</strong> &amp;
				<strong>Schedule X</strong> substances containing: (1) Date of supply, (2) Name and address of
				the patient/purchaser, (3) Name of the drug and quantity, (4) Batch number and manufacturer, (5)
				Name and registration number of the registered medical practitioner, and (6) Signature/record
				of the qualified person under whose supervision the drug was dispensed. This record must be
				preserved for a minimum period of <strong>3 years</strong> for Drug Inspector audits.
			</p>
		</div>
	</div>

	<!-- Metric Summary Cards -->
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<span class="text-[11px] font-semibold text-text-muted">Total Dispatches</span>
			<div class="mt-1 flex items-baseline justify-between">
				<span class="text-xl font-bold font-mono text-text-primary">{summary.totalEntries}</span>
				<span class="text-[10px] text-text-muted">{summary.distinctInvoices} Bills</span>
			</div>
		</div>

		<div class="rounded-xl border border-danger/30 bg-danger/5 p-3 shadow-2xs">
			<div class="flex items-center justify-between">
				<span class="text-[11px] font-bold text-danger">Schedule H1</span>
				<span class="rounded bg-danger-light px-1.5 py-0.5 text-[9px] font-black text-danger">RULE 65</span>
			</div>
			<div class="mt-1">
				<span class="text-xl font-bold font-mono text-danger">{summary.h1Count}</span>
				<span class="ml-1 text-[10px] text-danger/80">lines</span>
			</div>
		</div>

		<div class="rounded-xl border border-warning/30 bg-warning/5 p-3 shadow-2xs">
			<div class="flex items-center justify-between">
				<span class="text-[11px] font-bold text-warning">Schedule H</span>
				<span class="rounded bg-warning-light px-1.5 py-0.5 text-[9px] font-bold text-warning">RX ONLY</span>
			</div>
			<div class="mt-1">
				<span class="text-xl font-bold font-mono text-warning">{summary.hCount}</span>
				<span class="ml-1 text-[10px] text-warning/80">lines</span>
			</div>
		</div>

		<div class="rounded-xl border border-schedule-h1/30 bg-schedule-h1/5 p-3 shadow-2xs">
			<div class="flex items-center justify-between">
				<span class="text-[11px] font-bold text-schedule-h1">Schedule X</span>
				<span class="rounded bg-schedule-h1-light px-1.5 py-0.5 text-[9px] font-black text-schedule-h1">NARCOTIC</span>
			</div>
			<div class="mt-1">
				<span class="text-xl font-bold font-mono text-schedule-h1">{summary.xCount}</span>
				<span class="ml-1 text-[10px] text-schedule-h1/80">lines</span>
			</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<span class="text-[11px] font-semibold text-text-muted">Total Units Dispensed</span>
			<div class="mt-1">
				<span class="text-xl font-bold font-mono text-text-primary">{summary.totalQuantity.toLocaleString('en-IN')}</span>
			</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<span class="text-[11px] font-semibold text-text-muted">Regulated Turnover</span>
			<div class="mt-1">
				<span class="text-xl font-bold font-mono text-success">
					{formatCurrency(summary.totalValue)}
				</span>
			</div>
		</div>
	</div>

	<!-- Filters & Live Search Toolbar -->
	<div
		class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 shadow-2xs print:hidden"
	>
		<!-- Date presets -->
		<div class="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-surface-secondary p-1 text-xs">
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
			<button
				type="button"
				class="rounded-md px-2.5 py-1 font-medium transition-all {datePreset === 'year'
					? 'bg-surface font-semibold text-accent shadow-2xs'
					: 'text-text-secondary hover:text-text-primary'}"
				onclick={() => setDateRange('year')}
			>
				Fiscal Year
			</button>
		</div>

		<!-- Schedule selector & Date picker -->
		<div class="flex flex-wrap items-center gap-3 text-xs">
			<!-- Schedule dropdown -->
			<div class="flex items-center gap-1.5">
				<span class="font-medium text-text-muted">Schedule:</span>
				<select
					bind:value={scheduleFilter}
					onchange={() => loadReport()}
					class="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
				>
					<option value="all">All Scheduled (H, H1, X)</option>
					<option value="H1">Schedule H1 Only (Form 35)</option>
					<option value="H">Schedule H Only (Rx)</option>
					<option value="X">Schedule X Only (Narcotic)</option>
				</select>
			</div>

			<!-- Custom date inputs -->
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

			<!-- Search input -->
			<div class="relative w-48 sm:w-64">
				<Search class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" size={13} />
				<input
					type="text"
					placeholder="Search Doctor, Patient, Batch, Drug..."
					bind:value={searchQuery}
					oninput={handleSearchInput}
					class="w-full rounded-md border border-border bg-surface py-1 pl-8 pr-2.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
				/>
			</div>

			<Button variant="ghost" size="sm" onclick={loadReport}>
				<RefreshCw size={13} class={loading ? 'animate-spin' : ''} />
			</Button>
		</div>
	</div>

	<!-- Main Statutory Register Table -->
	<div class="overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
		{#if loading}
			<div class="p-8">
				<LoadingState message="Loading statutory drug register..." />
			</div>
		{:else if entries.length === 0}
			<div class="flex flex-col items-center justify-center p-12 text-center">
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-surface-secondary text-text-muted">
					<Pill size={24} />
				</div>
				<h3 class="mt-3 text-sm font-semibold text-text-primary">No Scheduled Drug Dispatches</h3>
				<p class="mt-1 text-xs text-text-muted">
					No Schedule H, H1, or X drug sales match your selected filters and date range.
				</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs border-collapse">
					<thead>
						<tr class="border-b border-border bg-surface-secondary text-[10px] font-bold uppercase tracking-wider text-text-muted">
							<th class="py-2.5 px-3">Date &amp; Time</th>
							<th class="py-2.5 px-3">Invoice No.</th>
							<th class="py-2.5 px-3">Drug / Composition</th>
							<th class="py-2.5 px-2 text-center">Sched</th>
							<th class="py-2.5 px-3">Batch &amp; Exp</th>
							<th class="py-2.5 px-3 text-right">Qty</th>
							<th class="py-2.5 px-3">Patient / Buyer</th>
							<th class="py-2.5 px-3">Prescribing Doctor &amp; Reg No.</th>
							<th class="py-2.5 px-3 text-right">Line Total</th>
							<th class="py-2.5 px-3">Dispenser</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border font-sans">
						{#each entries as row}
							<tr class="hover:bg-surface-hover transition-colors">
								<!-- Date & Time -->
								<td class="py-2.5 px-3 whitespace-nowrap">
									<div class="font-mono text-text-primary">{formatDate(row.date)}</div>
									<div class="text-[10px] text-text-muted">{formatDateTime(row.date).split(' ')[1] || ''}</div>
								</td>

								<!-- Invoice No & Type -->
								<td class="py-2.5 px-3 whitespace-nowrap">
									<a
										href={`/sales/${row.saleId}`}
										class="font-mono font-semibold text-accent hover:underline"
									>
										{row.invoiceNumber}
									</a>
									<span
										class="ml-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase {row.saleType === 'wholesale'
											? 'bg-accent-light text-accent'
											: 'bg-surface-secondary text-text-secondary'}"
									>
										{row.saleType}
									</span>
								</td>

								<!-- Drug & Generic Name -->
								<td class="py-2.5 px-3 max-w-xs">
									<div class="font-semibold text-text-primary line-clamp-1">{row.productName}</div>
									{#if row.genericName}
										<div class="text-[10px] text-text-muted italic line-clamp-1">{row.genericName}</div>
									{/if}
									{#if row.manufacturer}
										<div class="text-[9px] text-text-muted">{row.manufacturer}</div>
									{/if}
								</td>

								<!-- Schedule Badge -->
								<td class="py-2.5 px-2 text-center whitespace-nowrap">
									{#if row.drugSchedule === 'H1'}
										<span class="inline-block rounded bg-danger-light border border-danger/30 px-1.5 py-0.5 text-[10px] font-black text-danger">
											H1
										</span>
									{:else if row.drugSchedule === 'X'}
										<span class="inline-block rounded bg-schedule-h1-light border border-schedule-h1/30 px-1.5 py-0.5 text-[10px] font-black text-schedule-h1">
											X
										</span>
									{:else}
										<span class="inline-block rounded bg-warning-light border border-warning/30 px-1.5 py-0.5 text-[10px] font-bold text-warning">
											H
										</span>
									{/if}
								</td>

								<!-- Batch & Expiry -->
								<td class="py-2.5 px-3 whitespace-nowrap">
									<div class="font-mono font-semibold text-text-primary">{row.batchNo}</div>
									<div class="text-[10px] font-mono text-text-muted">Exp: {row.expiryDate}</div>
								</td>

								<!-- Quantity -->
								<td class="py-2.5 px-3 text-right font-mono font-semibold text-text-primary whitespace-nowrap">
									{row.quantity}
								</td>

								<!-- Patient / Buyer -->
								<td class="py-2.5 px-3 max-w-[200px]">
									<div class="font-medium text-text-primary line-clamp-1">
										{row.patientName || row.customerName || 'Walk-in Cash Customer'}
									</div>
									{#if row.customerPhone}
										<div class="text-[10px] font-mono text-text-muted">{row.customerPhone}</div>
									{/if}
									{#if row.customerAddress}
										<div class="text-[10px] text-text-muted line-clamp-1">{row.customerAddress}</div>
									{/if}
								</td>

								<!-- Doctor / Prescriber -->
								<td class="py-2.5 px-3 max-w-[220px]">
									{#if row.prescriberName}
										<div class="font-medium text-accent line-clamp-1 flex items-center gap-1">
											<Stethoscope size={11} class="shrink-0 text-accent" />
											<span>{row.prescriberName}</span>
										</div>
										{#if row.prescriberRegNo}
											<div class="text-[10px] font-mono text-text-muted">
												Reg: <span class="font-semibold text-text-secondary">{row.prescriberRegNo}</span>
											</div>
										{/if}
									{:else}
										<span class="text-text-muted italic text-[11px]">— Not Specified —</span>
									{/if}
								</td>

								<!-- Line Total -->
								<td class="py-2.5 px-3 text-right font-mono font-semibold text-text-primary whitespace-nowrap">
									{formatCurrency(row.lineTotal)}
								</td>

								<!-- Dispenser User -->
								<td class="py-2.5 px-3 text-text-muted whitespace-nowrap text-[11px]">
									{row.dispensedBy || 'Pharmacist'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<style>
	@media print {
		:global(body) {
			background: white !important;
			color: black !important;
		}
		:global(header),
		:global(nav),
		:global(aside),
		:global(.print\:hidden) {
			display: none !important;
		}
	}
</style>
