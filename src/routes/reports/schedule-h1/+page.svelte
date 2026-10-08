<script lang="ts">
	import { onMount } from 'svelte';
	import { PageHeader, LoadingState, Button } from '$lib/components/common/index.js';
	import { formatCurrency, formatDate, formatDateTime } from '$lib/utils/formatters.js';
	import {
		FileSpreadsheet,
		Printer,
		ShieldAlert,
		Search,
		Calendar,
		Stethoscope,
		Pill,
		RefreshCw,
		CheckCircle2
	} from '@lucide/svelte';

	interface ScheduleRow {
		saleItemId: string;
		saleId: string;
		date: string;
		invoiceNumber: string;
		saleType: 'retail' | 'wholesale';
		patientName: string | null;
		patientDisplayName: string;
		patientFullAddress: string;
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
		medicineWithStrength: string;
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
		billerName: string;
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

	interface StoreInfo {
		name: string;
		address: string | null;
		phone: string | null;
		gstin: string | null;
		drugLicenseNo: string | null;
		drugLicenseNo2: string | null;
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
	let storeInfo = $state<StoreInfo>({
		name: 'MedStock Pharmacy',
		address: '123 Healthcare Road, Medical Square',
		phone: '+91 98765 43210',
		gstin: '29ABCDE1234F1Z5',
		drugLicenseNo: 'KA-B2-192847',
		drugLicenseNo2: 'KA-B2-192848'
	});
	let loading = $state(true);

	// Filter states
	let datePreset = $state<'today' | 'week' | 'month' | 'custom'>('month');
	let fromDate = $state('');
	let toDate = $state('');
	let scheduleFilter = $state('all');
	let searchQuery = $state('');
	let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

	function setDateRange(preset: 'today' | 'week' | 'month' | 'custom') {
		datePreset = preset;
		const now = new Date();
		const todayStr = now.toISOString().split('T')[0];

		if (preset === 'today') {
			fromDate = todayStr;
			toDate = todayStr;
		} else if (preset === 'week') {
			// Start of current week (Monday)
			const day = now.getDay();
			const diff = now.getDate() - day + (day === 0 ? -6 : 1);
			const monday = new Date(now.setDate(diff));
			fromDate = monday.toISOString().split('T')[0];
			toDate = todayStr;
		} else if (preset === 'month') {
			const m = new Date(now.getFullYear(), now.getMonth(), 1);
			fromDate = m.toISOString().split('T')[0];
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
				if (data.store) {
					storeInfo = data.store;
				}
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

		// Exact Rule 65 statutory columns for Drug Inspector submission
		const headers = [
			'Sl No',
			'Date',
			'Patient Name & Address',
			'Prescribing Doctor Name',
			'Doctor Medical Reg No',
			'Medicine Name & Strength',
			'Manufacturer',
			'Batch No',
			'Expiry Date',
			'Quantity Dispensed',
			'Biller / Pharmacist Name',
			'Invoice Number',
			'Drug Schedule',
			'Line Total (INR)'
		];

		const rows = entries.map((r, idx) => [
			idx + 1,
			`"${formatDate(r.date)}"`,
			`"${(r.patientDisplayName + ' - ' + r.patientFullAddress).replace(/"/g, '""')}"`,
			`"${(r.prescriberName || '-').replace(/"/g, '""')}"`,
			`"${(r.prescriberRegNo || '-').replace(/"/g, '""')}"`,
			`"${(r.medicineWithStrength || r.productName).replace(/"/g, '""')}"`,
			`"${(r.manufacturer || '-').replace(/"/g, '""')}"`,
			`"${r.batchNo}"`,
			`"${r.expiryDate}"`,
			r.quantity,
			`"${(r.billerName || 'Pharmacist').replace(/"/g, '""')}"`,
			`"${r.invoiceNumber}"`,
			`"${r.drugSchedule}"`,
			r.lineTotal.toFixed(2)
		]);

		const csvContent =
			'data:text/csv;charset=utf-8,﻿' +
			[headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', encodedUri);
		link.setAttribute(
			'download',
			`Form_35_Schedule_H1_Register_${fromDate}_to_${toDate}.csv`
		);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	function handlePrintRegister() {
		window.print();
	}
</script>

<svelte:head>
	<title>Schedule H / H1 / X Controlled Drug Inspection Register - MedStock ERP</title>
</svelte:head>

<!-- PRINT-ONLY STATUTORY FORM 35 LAYOUT (LANDSCAPE A4) -->
<div class="print-statutory-container">
	<div class="print-header">
		<div class="store-brand">
			<h1>{storeInfo.name || 'MEDSTOCK PHARMACY'}</h1>
			<p>{storeInfo.address || '123 Healthcare Road, Medical Square'}</p>
			<p>
				DL No: <strong>{storeInfo.drugLicenseNo || '20B/21B-VALID'}</strong>
				{#if storeInfo.drugLicenseNo2}
					| <strong>{storeInfo.drugLicenseNo2}</strong>
				{/if}
				| GSTIN: <strong>{storeInfo.gstin || '29ABCDE1234F1Z5'}</strong>
			</p>
		</div>

		<div class="register-title-box">
			<h2>FORM 35 — REGISTER OF PRESCRIPTION DRUGS (SCHEDULE H1 &amp; X)</h2>
			<div class="statutory-rule-subtitle">
				[Prescribed under Rule 65(9)(b) &amp; Rule 65(9)(g) of the Drugs and Cosmetics Rules, 1945]
			</div>
			<div class="period-badge">
				Audit Period: <strong>{fromDate || 'Start'}</strong> to <strong>{toDate || 'Present'}</strong>
				| Filter: <strong>{scheduleFilter === 'all' ? 'All Scheduled (H/H1/X)' : 'Schedule ' + scheduleFilter}</strong>
			</div>
		</div>
	</div>

	<!-- Landscape Statutory Table -->
	<table class="print-statutory-table">
		<thead>
			<tr>
				<th style="width: 25px;">#</th>
				<th style="width: 70px;">Date</th>
				<th style="width: 140px;">Patient Name &amp; Address</th>
				<th style="width: 110px;">Prescribing Doctor</th>
				<th style="width: 80px;">Doctor Reg No</th>
				<th style="width: 130px;">Medicine Name &amp; Strength</th>
				<th style="width: 85px;">Manufacturer</th>
				<th style="width: 65px;">Batch No</th>
				<th style="width: 60px;">Expiry</th>
				<th style="width: 45px; text-align: right;">Qty</th>
				<th style="width: 80px;">Biller / Pharmacist</th>
			</tr>
		</thead>
		<tbody>
			{#if entries.length === 0}
				<tr>
					<td colspan="11" style="text-align: center; padding: 20px;">
						No transactions recorded in this period for the selected schedule.
					</td>
				</tr>
			{:else}
				{#each entries as row, idx}
					<tr>
						<td>{idx + 1}</td>
						<td style="font-family: monospace;">{formatDate(row.date)}</td>
						<td>
							<strong>{row.patientDisplayName}</strong>
							<div style="font-size: 7.5pt; color: #333;">{row.patientFullAddress}</div>
						</td>
						<td>{row.prescriberName || '-'}</td>
						<td style="font-family: monospace;">{row.prescriberRegNo || '-'}</td>
						<td>
							<strong>{row.productName}</strong>
							{#if row.genericName}
								<div style="font-size: 7pt; color: #444;">{row.genericName}</div>
							{/if}
						</td>
						<td>{row.manufacturer || '-'}</td>
						<td style="font-family: monospace; font-weight: bold;">{row.batchNo}</td>
						<td style="font-family: monospace;">{row.expiryDate}</td>
						<td style="text-align: right; font-family: monospace; font-weight: bold;">{row.quantity}</td>
						<td>{row.billerName}</td>
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>

	<!-- Print Footer with Regulatory Signatures -->
	<div class="print-footer">
		<div class="declaration-note">
			<p><strong>Declaration:</strong> I hereby certify that the particulars furnished above are true and complete extracts from the dispensing ledger maintained under Rule 65 of the Drugs and Cosmetics Rules, 1945.</p>
			<p style="margin-top: 4px;">Total Dispatches: <strong>{summary.totalEntries}</strong> | Total Units Dispensed: <strong>{summary.totalQuantity}</strong> | Total Value: <strong>{formatCurrency(summary.totalValue)}</strong></p>
		</div>
		<div class="sign-block">
			<div class="sign-line">Registered Pharmacist In-Charge</div>
			<div class="sign-caption">(Signature &amp; Reg. Stamp)</div>
		</div>
		<div class="sign-block">
			<div class="sign-line">Drug Inspector / Licensing Authority</div>
			<div class="sign-caption">(Inspected &amp; Verified)</div>
		</div>
	</div>
</div>

<!-- ON-SCREEN UI -->
<div class="space-y-4 no-print">
	<PageHeader
		title="Schedule H1 / Form 35 Statutory Register"
		subtitle="Statutory inspection register compliant with Rule 65 of Drugs and Cosmetics Rules, 1945 for Schedule H, H1 & X substances"
		backHref="/reports"
	>
		{#snippet actions()}
			<div class="flex items-center gap-2">
				<Button
					variant="secondary"
					size="sm"
					onclick={exportForm35Csv}
					disabled={entries.length === 0}
				>
					<FileSpreadsheet size={14} class="mr-1 text-success" />
					<span>Export to Excel/CSV</span>
				</Button>
				<Button variant="primary" size="sm" onclick={handlePrintRegister}>
					<Printer size={14} class="mr-1" />
					<span>Print Statutory Register</span>
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	<!-- Regulatory Rule 65 Statutory Notice -->
	<div class="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3 text-text-primary">
		<ShieldAlert class="mt-0.5 h-5 w-5 shrink-0 text-warning" />
		<div class="text-xs leading-relaxed">
			<p class="font-bold uppercase tracking-wider text-warning">
				Rule 65 Compliance — Drugs &amp; Cosmetics Rules, 1945
			</p>
			<p class="mt-0.5 text-text-secondary">
				Under Rule 65, pharmacies must maintain an unalterable register for <strong>Schedule H1</strong> and
				<strong>Schedule X</strong> substances recording: Date of supply, Patient name &amp; address, Prescribing doctor's name
				and medical registration number, Drug name &amp; quantity, Batch number &amp; manufacturer, and Dispensing pharmacist.
				Records must be retained for Drug Inspector audit for at least <strong>3 years</strong>.
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

	<!-- Date Filter Presets & Controls -->
	<div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 shadow-2xs">
		<!-- Date presets: Today, This Week, This Month, Custom Date Range -->
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
				This Week
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
				class="rounded-md px-2.5 py-1 font-medium transition-all {datePreset === 'custom'
					? 'bg-surface font-semibold text-accent shadow-2xs'
					: 'text-text-secondary hover:text-text-primary'}"
				onclick={() => {
					datePreset = 'custom';
					loadReport();
				}}
			>
				Custom Date Range
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
					placeholder="Search Doctor, Patient, Reg No, Batch, Drug..."
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

	<!-- Mandatory Statutory Columns Table -->
	<div class="overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
		{#if loading}
			<div class="p-8">
				<LoadingState message="Loading statutory Schedule H1 / Form 35 register..." />
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
							<th class="py-2.5 px-3 whitespace-nowrap">Date</th>
							<th class="py-2.5 px-3">Patient Name &amp; Address</th>
							<th class="py-2.5 px-3">Prescribing Doctor Name</th>
							<th class="py-2.5 px-3 whitespace-nowrap">Doctor Reg No</th>
							<th class="py-2.5 px-3">Medicine Name &amp; Strength</th>
							<th class="py-2.5 px-3">Manufacturer</th>
							<th class="py-2.5 px-3 whitespace-nowrap">Batch No</th>
							<th class="py-2.5 px-3 whitespace-nowrap">Expiry Date</th>
							<th class="py-2.5 px-3 text-right whitespace-nowrap">Qty Dispensed</th>
							<th class="py-2.5 px-3 whitespace-nowrap">Biller / Pharmacist Name</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border font-sans">
						{#each entries as row}
							<tr class="hover:bg-surface-hover transition-colors">
								<!-- 1. Date -->
								<td class="py-2.5 px-3 whitespace-nowrap">
									<div class="font-mono text-text-primary">{formatDate(row.date)}</div>
									<div class="text-[10px] font-mono text-accent">{row.invoiceNumber}</div>
								</td>

								<!-- 2. Patient Name & Address -->
								<td class="py-2.5 px-3 max-w-[220px]">
									<div class="font-semibold text-text-primary line-clamp-1">
										{row.patientDisplayName}
									</div>
									<div class="text-[10px] text-text-muted line-clamp-1">
										{row.patientFullAddress}
									</div>
								</td>

								<!-- 3. Prescribing Doctor Name -->
								<td class="py-2.5 px-3 max-w-[180px]">
									{#if row.prescriberName}
										<div class="font-medium text-accent line-clamp-1 flex items-center gap-1">
											<Stethoscope size={11} class="shrink-0 text-accent" />
											<span>{row.prescriberName}</span>
										</div>
									{:else}
										<span class="text-text-muted italic text-[11px]">— Not Specified —</span>
									{/if}
								</td>

								<!-- 4. Doctor Medical Reg No -->
								<td class="py-2.5 px-3 whitespace-nowrap font-mono text-xs">
									{#if row.prescriberRegNo}
										<span class="rounded bg-surface-secondary px-1.5 py-0.5 font-bold text-text-secondary border border-border">
											{row.prescriberRegNo}
										</span>
									{:else}
										<span class="text-text-muted italic">—</span>
									{/if}
								</td>

								<!-- 5. Medicine Name & Strength -->
								<td class="py-2.5 px-3 max-w-xs">
									<div class="flex items-center gap-1.5">
										<span class="font-semibold text-text-primary line-clamp-1">{row.productName}</span>
										{#if row.drugSchedule === 'H1'}
											<span class="inline-block rounded bg-danger-light border border-danger/30 px-1 py-0.2 text-[9px] font-black text-danger shrink-0">
												H1
											</span>
										{:else if row.drugSchedule === 'X'}
											<span class="inline-block rounded bg-schedule-h1-light border border-schedule-h1/30 px-1 py-0.2 text-[9px] font-black text-schedule-h1 shrink-0">
												X
											</span>
										{:else}
											<span class="inline-block rounded bg-warning-light border border-warning/30 px-1 py-0.2 text-[9px] font-bold text-warning shrink-0">
												H
											</span>
										{/if}
									</div>
									{#if row.genericName}
										<div class="text-[10px] text-text-muted italic line-clamp-1">{row.genericName}</div>
									{/if}
								</td>

								<!-- 6. Manufacturer -->
								<td class="py-2.5 px-3 max-w-[140px] text-text-secondary">
									<div class="line-clamp-1 text-[11px]">{row.manufacturer || 'Standard'}</div>
								</td>

								<!-- 7. Batch No -->
								<td class="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-text-primary">
									{row.batchNo}
								</td>

								<!-- 8. Expiry Date -->
								<td class="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-text-secondary">
									{row.expiryDate}
								</td>

								<!-- 9. Quantity Dispensed -->
								<td class="py-2.5 px-3 text-right font-mono font-bold text-text-primary whitespace-nowrap">
									{row.quantity}
								</td>

								<!-- 10. Biller / Pharmacist Name -->
								<td class="py-2.5 px-3 whitespace-nowrap text-text-secondary text-[11px]">
									{row.billerName}
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
	/* Screen styles: hide printable statutory register */
	@media screen {
		.print-statutory-container {
			display: none;
		}
	}

	/* Landscape A4 Print Styles */
	@media print {
		@page {
			size: A4 landscape;
			margin: 8mm 10mm;
		}

		:global(body *) {
			visibility: hidden;
		}

		.no-print {
			display: none !important;
		}

		.print-statutory-container,
		.print-statutory-container * {
			visibility: visible;
		}

		.print-statutory-container {
			position: absolute;
			left: 0;
			top: 0;
			width: 100%;
			font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			font-size: 8pt;
			color: #000;
			background: #fff;
			display: block !important;
		}

		.print-header {
			border-bottom: 2px solid #000;
			padding-bottom: 6px;
			margin-bottom: 8px;
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
		}

		.store-brand h1 {
			font-size: 13pt;
			font-weight: bold;
			text-transform: uppercase;
			margin: 0;
			letter-spacing: 0.5px;
		}

		.store-brand p {
			margin: 1px 0;
			font-size: 7.5pt;
			color: #222;
		}

		.register-title-box {
			text-align: right;
		}

		.register-title-box h2 {
			font-size: 10pt;
			font-weight: bold;
			margin: 0;
			text-transform: uppercase;
			color: #000;
		}

		.statutory-rule-subtitle {
			font-size: 7pt;
			font-style: italic;
			color: #333;
			margin: 2px 0;
		}

		.period-badge {
			font-size: 7.5pt;
			margin-top: 2px;
		}

		.print-statutory-table {
			width: 100%;
			border-collapse: collapse;
			font-size: 7.5pt;
			margin-top: 4px;
		}

		.print-statutory-table th {
			background: #e6e6e6 !important;
			color: #000 !important;
			font-weight: bold;
			text-transform: uppercase;
			font-size: 6.5pt;
			border: 1px solid #000;
			padding: 4px 3px;
			text-align: left;
		}

		.print-statutory-table td {
			border: 1px solid #777;
			padding: 3.5px 3px;
			vertical-align: middle;
			line-height: 1.15;
		}

		.print-footer {
			margin-top: 15px;
			display: flex;
			justify-content: space-between;
			align-items: flex-end;
			border-top: 1px solid #000;
			padding-top: 8px;
			page-break-inside: avoid;
		}

		.declaration-note {
			width: 50%;
			font-size: 6.8pt;
			line-height: 1.3;
			color: #222;
		}

		.sign-block {
			text-align: center;
			width: 22%;
		}

		.sign-line {
			border-top: 1px solid #000;
			padding-top: 4px;
			font-size: 7.5pt;
			font-weight: bold;
		}

		.sign-caption {
			font-size: 6.5pt;
			color: #444;
		}
	}
</style>
