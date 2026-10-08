<script lang="ts">
	import { onMount } from 'svelte';
	import { PageHeader, LoadingState, Button } from '$lib/components/common/index.js';
	import { formatCurrency, formatDate } from '$lib/utils/formatters.js';
	import {
		AlertTriangle,
		Clock,
		Calendar,
		Truck,
		FileSpreadsheet,
		Printer,
		RotateCcw,
		CheckCircle2,
		ShieldAlert,
		Search,
		X,
		Pill,
		RefreshCw
	} from '@lucide/svelte';

	interface ExpiryItem {
		id: string;
		productId: string;
		productName: string;
		genericName: string | null;
		manufacturer: string;
		drugSchedule: string;
		hsnCode: string | null;
		baseUnit: string;
		batchNo: string;
		expiryDate: string;
		daysToExpiry: number;
		category: 'expired' | '30_days' | '60_days' | '90_days' | 'safe';
		riskLabel: string;
		riskLevel: 'danger' | 'warning' | 'info' | 'safe';
		remainingStock: number;
		unitPurchaseCost: number;
		mrp: number;
		totalValueAtRisk: number;
		totalMrpValue: number;
		supplierId: string | null;
		supplierName: string;
		supplierPhone: string | null;
		supplierGstin: string | null;
		purchaseId: string | null;
		purchaseInvoiceNo: string | null;
	}

	interface SupplierRisk {
		supplierId: string | null;
		supplierName: string;
		supplierPhone: string | null;
		batchCount: number;
		totalUnits: number;
		totalValue: number;
		batchIds: string[];
	}

	interface StoreInfo {
		name: string;
		address: string | null;
		phone: string | null;
		gstin: string | null;
		drugLicenseNo: string | null;
		drugLicenseNo2: string | null;
	}

	interface ExpiryReportData {
		store: StoreInfo;
		summary: {
			totalBatchesAtRisk: number;
			totalUnitsAtRisk: number;
			totalCostAtRisk: number;
			totalMrpAtRisk: number;
			expiredCount: number;
			expiredCost: number;
			within30Count: number;
			within30Cost: number;
			within60Count: number;
			within60Cost: number;
			within90Count: number;
			within90Cost: number;
		};
		items: ExpiryItem[];
		suppliersAtRisk: SupplierRisk[];
	}

	let data = $state<ExpiryReportData | null>(null);
	let loading = $state(true);

	// Filters
	let windowFilter = $state<'all' | 'expired' | '30' | '60' | '90'>('all');
	let searchQuery = $state('');
	let searchTimer: ReturnType<typeof setTimeout> | null = null;

	// Modal state for Supplier Expiry Return Note
	let selectedBatchForReturn = $state<ExpiryItem | null>(null);
	let returnQuantity = $state(1);
	let returnReason = $state('Near-Expiry / Expired Stock Return under supplier cutoff policy');
	let isSubmittingReturn = $state(false);
	let returnSuccessNote = $state<any | null>(null);

	async function loadReport() {
		loading = true;
		try {
			const params = new URLSearchParams();
			if (windowFilter !== 'all') params.append('window', windowFilter);
			if (searchQuery.trim()) params.append('search', searchQuery.trim());

			const res = await fetch(`/api/reports/expiry?${params.toString()}`);
			if (res.ok) {
				data = await res.json();
			}
		} catch (e) {
			console.error('Failed to load expiry report:', e);
		} finally {
			loading = false;
		}
	}

	function handleSearchInput() {
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			loadReport();
		}, 300);
	}

	onMount(() => {
		loadReport();
	});

	function openReturnModal(item: ExpiryItem) {
		selectedBatchForReturn = item;
		returnQuantity = item.remainingStock;
		returnReason = item.daysToExpiry <= 0
			? `Expired stock return for credit (Expired on ${item.expiryDate})`
			: `Near-expiry return before cutoff (Expires in ${item.daysToExpiry} days on ${item.expiryDate})`;
		returnSuccessNote = null;
	}

	function closeReturnModal() {
		selectedBatchForReturn = null;
		returnSuccessNote = null;
	}

	async function submitSupplierReturn() {
		if (!selectedBatchForReturn || returnQuantity <= 0) return;

		isSubmittingReturn = true;
		try {
			const lineAmount = Number(
				(returnQuantity * selectedBatchForReturn.unitPurchaseCost).toFixed(2)
			);
			const payload = {
				returnType: 'purchase_return',
				originalPurchaseId: selectedBatchForReturn.purchaseId || undefined,
				reason: returnReason,
				items: [
					{
						batchId: selectedBatchForReturn.id,
						quantity: returnQuantity,
						lineAmount
					}
				]
			};

			const res = await fetch('/api/returns', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (res.ok) {
				const createdReturn = await res.json();
				returnSuccessNote = {
					debitNoteId: createdReturn.id,
					returnType: 'PURCHASE RETURN / DEBIT NOTE',
					date: new Date().toISOString(),
					supplierName: selectedBatchForReturn.supplierName,
					supplierPhone: selectedBatchForReturn.supplierPhone,
					supplierGstin: selectedBatchForReturn.supplierGstin,
					productName: selectedBatchForReturn.productName,
					batchNo: selectedBatchForReturn.batchNo,
					expiryDate: selectedBatchForReturn.expiryDate,
					quantity: returnQuantity,
					rate: selectedBatchForReturn.unitPurchaseCost,
					totalDebitValue: lineAmount,
					reason: returnReason,
					store: data?.store
				};
				await loadReport();
			} else {
				const err = await res.json();
				alert(`Failed to create return note: ${err.message || 'Unknown error'}`);
			}
		} catch (e: any) {
			alert(`Error processing return: ${e.message}`);
		} finally {
			isSubmittingReturn = false;
		}
	}

	function exportExpiryCsv() {
		if (!data || data.items.length === 0) return;

		const headers = [
			'Medicine Name',
			'Generic Name',
			'Manufacturer',
			'Drug Schedule',
			'Batch No',
			'Expiry Date',
			'Days to Expiry',
			'Risk Category',
			'Remaining Stock',
			'Base Unit',
			'Unit Purchase Cost (INR)',
			'Total Value at Risk (INR)',
			'MRP (INR)',
			'Supplier Name',
			'Supplier Phone',
			'Purchase Invoice'
		];

		const rows = data.items.map((i) => [
			`"${i.productName.replace(/"/g, '""')}"`,
			`"${(i.genericName || '-').replace(/"/g, '""')}"`,
			`"${i.manufacturer.replace(/"/g, '""')}"`,
			`"${i.drugSchedule}"`,
			`"${i.batchNo}"`,
			`"${i.expiryDate}"`,
			i.daysToExpiry,
			`"${i.riskLabel}"`,
			i.remainingStock,
			`"${i.baseUnit}"`,
			i.unitPurchaseCost.toFixed(2),
			i.totalValueAtRisk.toFixed(2),
			i.mrp.toFixed(2),
			`"${i.supplierName.replace(/"/g, '""')}"`,
			`"${i.supplierPhone || '-'}"`,
			`"${i.purchaseInvoiceNo || '-'}"`
		]);

		const csvContent =
			'data:text/csv;charset=utf-8,﻿' +
			[headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', encodedUri);
		link.setAttribute('download', `Near_Expiry_Stock_Risk_Report_${new Date().toISOString().split('T')[0]}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	function printDebitNote() {
		window.print();
	}
</script>

<svelte:head>
	<title>Near-Expiry & Expired Stock Return Radar - MedStock ERP</title>
</svelte:head>

<div class="space-y-4">
	<PageHeader
		title="Near-Expiry (<90 Days) & Expired Stock Return Report"
		subtitle="FEFO risk intelligence: monitor batches expiring within 30, 60, and 90 days, quantify capital at risk, and generate supplier return debit notes"
		backHref="/reports"
	>
		{#snippet actions()}
			<div class="flex items-center gap-2">
				<Button
					variant="secondary"
					size="sm"
					onclick={exportExpiryCsv}
					disabled={!data || data.items.length === 0}
				>
					<FileSpreadsheet size={14} class="mr-1 text-success" />
					<span>Export Expiry Risk CSV</span>
				</Button>
				<Button variant="ghost" size="sm" onclick={loadReport}>
					<RefreshCw size={14} class={loading ? 'animate-spin' : ''} />
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	<!-- Regulatory & Financial Notice -->
	<div class="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3 text-text-primary text-xs leading-relaxed">
		<AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-warning" />
		<div>
			<span class="font-bold uppercase tracking-wider text-warning">
				FEFO Stock Return Protocol &amp; Vendor Cutoff Thresholds
			</span>
			<p class="mt-0.5 text-text-secondary">
				Most pharmaceutical distributors accept near-expiry returns with 100% credit notes only if returned at least
				<strong>60 to 90 days prior to the expiration date</strong>. Once expired, disposal is statutory and subject to total capital loss.
				Initiate "Supplier Expiry Return Notes" below to reverse inventory and debit vendor accounts.
			</p>
		</div>
	</div>

	<!-- Top Metric Summary Risk Cards -->
	{#if data}
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
			<!-- Total Value at Risk -->
			<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
				<span class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total Value At Risk</span>
				<div class="mt-1">
					<span class="text-xl font-bold font-mono text-danger">
						{formatCurrency(data.summary.totalCostAtRisk)}
					</span>
				</div>
				<div class="text-[10px] text-text-muted mt-0.5">
					{data.summary.totalUnitsAtRisk.toLocaleString('en-IN')} units at cost
				</div>
			</div>

			<!-- Expired Batches -->
			<div class="rounded-xl border border-danger/30 bg-danger/5 p-3 shadow-2xs">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-bold uppercase tracking-wider text-danger">Expired Stock</span>
					<span class="rounded bg-danger-light px-1 py-0.2 text-[9px] font-black text-danger">EXPIRED</span>
				</div>
				<div class="mt-1">
					<span class="text-xl font-bold font-mono text-danger">{data.summary.expiredCount}</span>
					<span class="text-xs text-danger/80 ml-1">batches</span>
				</div>
				<div class="text-[10px] font-mono text-danger font-semibold mt-0.5">
					{formatCurrency(data.summary.expiredCost)}
				</div>
			</div>

			<!-- < 30 Days -->
			<div class="rounded-xl border border-danger/30 bg-danger/5 p-3 shadow-2xs">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-bold uppercase tracking-wider text-danger">&lt; 30 Days</span>
					<span class="rounded bg-danger-light px-1 py-0.2 text-[9px] font-bold text-danger">CRITICAL</span>
				</div>
				<div class="mt-1">
					<span class="text-xl font-bold font-mono text-danger">{data.summary.within30Count}</span>
					<span class="text-xs text-danger/80 ml-1">batches</span>
				</div>
				<div class="text-[10px] font-mono text-danger font-semibold mt-0.5">
					{formatCurrency(data.summary.within30Cost)}
				</div>
			</div>

			<!-- 30–60 Days -->
			<div class="rounded-xl border border-warning/30 bg-warning/5 p-3 shadow-2xs">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-bold uppercase tracking-wider text-warning">30–60 Days</span>
					<span class="rounded bg-warning-light px-1 py-0.2 text-[9px] font-bold text-warning">HIGH RISK</span>
				</div>
				<div class="mt-1">
					<span class="text-xl font-bold font-mono text-warning">{data.summary.within60Count}</span>
					<span class="text-xs text-warning/80 ml-1">batches</span>
				</div>
				<div class="text-[10px] font-mono text-warning font-semibold mt-0.5">
					{formatCurrency(data.summary.within60Cost)}
				</div>
			</div>

			<!-- 60–90 Days -->
			<div class="rounded-xl border border-info/30 bg-info/5 p-3 shadow-2xs">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-bold uppercase tracking-wider text-info">60–90 Days</span>
					<span class="rounded bg-info-light px-1 py-0.2 text-[9px] font-bold text-info">MODERATE</span>
				</div>
				<div class="mt-1">
					<span class="text-xl font-bold font-mono text-info">{data.summary.within90Count}</span>
					<span class="text-xs text-info/80 ml-1">batches</span>
				</div>
				<div class="text-[10px] font-mono text-info font-semibold mt-0.5">
					{formatCurrency(data.summary.within90Cost)}
				</div>
			</div>

			<!-- Total MRP Potential -->
			<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
				<span class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total MRP Value</span>
				<div class="mt-1">
					<span class="text-xl font-bold font-mono text-text-primary">
						{formatCurrency(data.summary.totalMrpAtRisk)}
					</span>
				</div>
				<div class="text-[10px] text-text-muted mt-0.5">
					Retail liquidation potential
				</div>
			</div>
		</div>
	{/if}

	<!-- Filter Controls & Search -->
	<div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 shadow-2xs text-xs">
		<!-- Expiry Window Buttons -->
		<div class="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-surface-secondary p-1">
			<button
				type="button"
				class="rounded-md px-2.5 py-1 font-medium transition-all {windowFilter === 'all'
					? 'bg-surface font-semibold text-accent shadow-2xs'
					: 'text-text-secondary hover:text-text-primary'}"
				onclick={() => {
					windowFilter = 'all';
					loadReport();
				}}
			>
				All Risk (&lt;90d + Expired)
			</button>
			<button
				type="button"
				class="rounded-md px-2.5 py-1 font-medium transition-all {windowFilter === 'expired'
					? 'bg-surface font-semibold text-danger shadow-2xs'
					: 'text-text-secondary hover:text-text-primary'}"
				onclick={() => {
					windowFilter = 'expired';
					loadReport();
				}}
			>
				Expired Only
			</button>
			<button
				type="button"
				class="rounded-md px-2.5 py-1 font-medium transition-all {windowFilter === '30'
					? 'bg-surface font-semibold text-danger shadow-2xs'
					: 'text-text-secondary hover:text-text-primary'}"
				onclick={() => {
					windowFilter = '30';
					loadReport();
				}}
			>
				&lt; 30 Days
			</button>
			<button
				type="button"
				class="rounded-md px-2.5 py-1 font-medium transition-all {windowFilter === '60'
					? 'bg-surface font-semibold text-warning shadow-2xs'
					: 'text-text-secondary hover:text-text-primary'}"
				onclick={() => {
					windowFilter = '60';
					loadReport();
				}}
			>
				30–60 Days
			</button>
			<button
				type="button"
				class="rounded-md px-2.5 py-1 font-medium transition-all {windowFilter === '90'
					? 'bg-surface font-semibold text-info shadow-2xs'
					: 'text-text-secondary hover:text-text-primary'}"
				onclick={() => {
					windowFilter = '90';
					loadReport();
				}}
			>
				60–90 Days
			</button>
		</div>

		<!-- Search Input -->
		<div class="relative w-full sm:w-72">
			<Search class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" size={13} />
			<input
				type="text"
				placeholder="Search Medicine, Batch, Supplier..."
				bind:value={searchQuery}
				oninput={handleSearchInput}
				class="w-full rounded-md border border-border bg-surface py-1 pl-8 pr-2.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
			/>
		</div>
	</div>

	<!-- Supplier Risk Aggregations (Top Vendors with Return Risk) -->
	{#if data && data.suppliersAtRisk.length > 0}
		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs space-y-2">
			<div class="flex items-center justify-between">
				<h3 class="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
					<Truck size={14} class="text-accent" />
					<span>Suppliers with Stock At Risk (Return Candidates)</span>
				</h3>
				<span class="text-[10px] text-text-muted">Grouped by Vendor</span>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
				{#each data.suppliersAtRisk.slice(0, 4) as sup}
					<div class="rounded-lg border border-border bg-surface-secondary p-2.5 text-xs flex flex-col justify-between">
						<div>
							<div class="font-bold text-text-primary line-clamp-1">{sup.supplierName}</div>
							<div class="text-[10px] text-text-muted mt-0.5">
								{sup.batchCount} near-expiry {sup.batchCount === 1 ? 'batch' : 'batches'} • {sup.totalUnits} units
							</div>
						</div>
						<div class="mt-2 flex items-baseline justify-between border-t border-border pt-2">
							<span class="text-[10px] text-text-muted font-medium">Value:</span>
							<span class="font-mono font-bold text-danger">{formatCurrency(sup.totalValue)}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Main Batches at Risk Table -->
	<div class="overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
		{#if loading}
			<div class="p-8">
				<LoadingState message="Auditing inventory batches and computing capital at risk..." />
			</div>
		{:else if !data || data.items.length === 0}
			<div class="flex flex-col items-center justify-center p-12 text-center">
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-success-light text-success">
					<CheckCircle2 size={24} />
				</div>
				<h3 class="mt-3 text-sm font-semibold text-text-primary">No Batches in Risk Window</h3>
				<p class="mt-1 text-xs text-text-muted max-w-sm">
					All active warehouse batches have safe expiration horizons exceeding the selected cutoff window.
				</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs border-collapse">
					<thead>
						<tr class="border-b border-border bg-surface-secondary text-[10px] font-bold uppercase tracking-wider text-text-muted">
							<th class="py-2.5 px-3">Medicine Name &amp; Strength</th>
							<th class="py-2.5 px-3 whitespace-nowrap">Batch No</th>
							<th class="py-2.5 px-3 whitespace-nowrap">Expiry Date</th>
							<th class="py-2.5 px-3 text-center whitespace-nowrap">Risk Window</th>
							<th class="py-2.5 px-3 text-right whitespace-nowrap">Remaining Stock</th>
							<th class="py-2.5 px-3 text-right whitespace-nowrap">Unit Purchase Cost</th>
							<th class="py-2.5 px-3 text-right whitespace-nowrap">Total Value At Risk</th>
							<th class="py-2.5 px-3">Supplier Name</th>
							<th class="py-2.5 px-3 text-center whitespace-nowrap">Statutory Action</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border font-sans">
						{#each data.items as item}
							<tr class="hover:bg-surface-hover transition-colors">
								<!-- 1. Medicine Name & Strength -->
								<td class="py-2.5 px-3 max-w-[220px]">
									<div class="flex items-center gap-1.5">
										<span class="font-semibold text-text-primary line-clamp-1">{item.productName}</span>
										{#if item.drugSchedule === 'H1'}
											<span class="inline-block rounded bg-danger-light px-1 text-[9px] font-black text-danger shrink-0">
												H1
											</span>
										{:else if item.drugSchedule === 'X'}
											<span class="inline-block rounded bg-schedule-h1-light px-1 text-[9px] font-black text-schedule-h1 shrink-0">
												X
											</span>
										{/if}
									</div>
									{#if item.genericName}
										<div class="text-[10px] text-text-muted italic line-clamp-1">{item.genericName}</div>
									{/if}
								</td>

								<!-- 2. Batch No -->
								<td class="py-2.5 px-3 font-mono font-bold text-text-primary whitespace-nowrap">
									{item.batchNo}
								</td>

								<!-- 3. Expiry Date -->
								<td class="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-text-primary">
									{item.expiryDate}
								</td>

								<!-- 4. Risk Window Badge -->
								<td class="py-2.5 px-3 text-center whitespace-nowrap">
									{#if item.category === 'expired'}
										<span class="inline-flex items-center rounded-md bg-danger-light px-2 py-0.5 text-[10px] font-black text-danger border border-danger/30">
											{item.riskLabel}
										</span>
									{:else if item.category === '30_days'}
										<span class="inline-flex items-center rounded-md bg-danger-light px-2 py-0.5 text-[10px] font-bold text-danger border border-danger/30">
											{item.riskLabel}
										</span>
									{:else if item.category === '60_days'}
										<span class="inline-flex items-center rounded-md bg-warning-light px-2 py-0.5 text-[10px] font-bold text-warning border border-warning/30">
											{item.riskLabel}
										</span>
									{:else if item.category === '90_days'}
										<span class="inline-flex items-center rounded-md bg-info-light px-2 py-0.5 text-[10px] font-bold text-info border border-info/30">
											{item.riskLabel}
										</span>
									{:else}
										<span class="inline-flex items-center rounded-md bg-surface-secondary px-2 py-0.5 text-[10px] text-text-muted">
											{item.riskLabel}
										</span>
									{/if}
								</td>

								<!-- 5. Remaining Stock -->
								<td class="py-2.5 px-3 text-right font-mono font-bold text-text-primary whitespace-nowrap">
									{item.remainingStock} <span class="text-[10px] font-normal text-text-muted">{item.baseUnit}</span>
								</td>

								<!-- 6. Unit Purchase Cost -->
								<td class="py-2.5 px-3 text-right font-mono tabular-nums text-text-secondary whitespace-nowrap">
									{formatCurrency(item.unitPurchaseCost)}
								</td>

								<!-- 7. Total Value At Risk -->
								<td class="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-danger whitespace-nowrap">
									{formatCurrency(item.totalValueAtRisk)}
								</td>

								<!-- 8. Supplier Name -->
								<td class="py-2.5 px-3 max-w-[160px] text-text-primary">
									<div class="line-clamp-1 font-medium">{item.supplierName}</div>
									{#if item.purchaseInvoiceNo}
										<div class="text-[10px] font-mono text-text-muted">GRN: {item.purchaseInvoiceNo}</div>
									{/if}
								</td>

								<!-- 9. Statutory Action -->
								<td class="py-2.5 px-3 text-center whitespace-nowrap">
									<Button
										variant="secondary"
										size="sm"
										onclick={() => openReturnModal(item)}
									>
										<RotateCcw size={12} class="mr-1 text-danger" />
										<span>Return to Supplier</span>
									</Button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<!-- SUPPLIER EXPIRY RETURN NOTE (DEBIT NOTE) MODAL -->
{#if selectedBatchForReturn}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
		<div class="w-full max-w-lg rounded-2xl border border-border bg-surface p-5 shadow-xl space-y-4">
			{#if !returnSuccessNote}
				<!-- Return Initiation Form -->
				<div class="flex items-center justify-between border-b border-border pb-3">
					<div>
						<h3 class="text-sm font-bold text-text-primary">
							Generate Supplier Expiry Return Note (Debit Note)
						</h3>
						<p class="text-xs text-text-muted">
							Return stock before supplier cutoff to issue statutory debit memo
						</p>
					</div>
					<button
						type="button"
						onclick={closeReturnModal}
						class="rounded-lg p-1 text-text-muted hover:bg-surface-secondary"
					>
						<X size={16} />
					</button>
				</div>

				<div class="space-y-3 text-xs">
					<!-- Batch summary card -->
					<div class="rounded-xl border border-border bg-surface-secondary p-3 space-y-1.5">
						<div class="flex items-center justify-between">
							<span class="font-bold text-text-primary text-sm">{selectedBatchForReturn.productName}</span>
							<span class="rounded bg-danger-light px-1.5 py-0.5 font-bold text-danger text-[10px]">
								{selectedBatchForReturn.riskLabel}
							</span>
						</div>
						<div class="grid grid-cols-2 gap-2 text-text-secondary pt-1">
							<div>Batch: <strong class="font-mono text-text-primary">{selectedBatchForReturn.batchNo}</strong></div>
							<div>Expiry: <strong class="font-mono text-text-primary">{selectedBatchForReturn.expiryDate}</strong></div>
							<div>Supplier: <strong class="text-text-primary">{selectedBatchForReturn.supplierName}</strong></div>
							<div>Unit Cost: <strong class="font-mono text-text-primary">{formatCurrency(selectedBatchForReturn.unitPurchaseCost)}</strong></div>
						</div>
					</div>

					<!-- Return quantity input -->
					<div>
						<label for="return-quantity-input" class="block font-semibold text-text-primary mb-1">
							Return Quantity (Max: {selectedBatchForReturn.remainingStock} {selectedBatchForReturn.baseUnit})
						</label>
						<input
							id="return-quantity-input"
							type="number"
							min="1"
							max={selectedBatchForReturn.remainingStock}
							bind:value={returnQuantity}
							class="w-full rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-sm text-text-primary focus:border-accent focus:outline-none"
						/>
						<div class="mt-1 flex justify-between text-[11px] text-text-muted">
							<span>Calculated Debit Note Value:</span>
							<strong class="font-mono text-danger text-xs">
								{formatCurrency(returnQuantity * selectedBatchForReturn.unitPurchaseCost)}
							</strong>
						</div>
					</div>

					<!-- Reason text -->
					<div>
						<label for="return-reason-input" class="block font-semibold text-text-primary mb-1">Return Reason / Regulatory Justification</label>
						<input
							id="return-reason-input"
							type="text"
							bind:value={returnReason}
							class="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none"
						/>
					</div>
				</div>

				<div class="flex items-center justify-end gap-2 border-t border-border pt-3">
					<Button variant="secondary" size="sm" onclick={closeReturnModal}>
						Cancel
					</Button>
					<Button
						variant="danger"
						size="sm"
						onclick={submitSupplierReturn}
						disabled={isSubmittingReturn || returnQuantity <= 0}
					>
						{#if isSubmittingReturn}
							<span>Generating Debit Note...</span>
						{:else}
							<span>Issue Supplier Debit Note</span>
						{/if}
					</Button>
				</div>
			{:else}
				<!-- Debit Note Generated Confirmation & Print View -->
				<div class="text-center space-y-2 py-2">
					<div class="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-success-light text-success">
						<CheckCircle2 size={24} />
					</div>
					<h3 class="text-base font-bold text-text-primary">
						Supplier Expiry Return Note Created!
					</h3>
					<p class="text-xs text-text-muted">
						Stock of <strong>{returnSuccessNote.quantity} units</strong> reversed from batch <strong>{returnSuccessNote.batchNo}</strong>.
						Supplier debit ledger updated.
					</p>
				</div>

				<!-- Official Debit Note Card -->
				<div class="rounded-xl border-2 border-dashed border-border p-4 bg-surface-secondary space-y-3 text-xs font-mono">
					<div class="text-center border-b border-border pb-2">
						<div class="font-bold text-sm text-text-primary">DEBIT NOTE / EXPIRY RETURN MEMO</div>
						<div class="text-[10px] text-text-muted">DN Ref: {returnSuccessNote.debitNoteId}</div>
					</div>

					<div class="space-y-1 text-[11px]">
						<div>To Distributor: <strong>{returnSuccessNote.supplierName}</strong></div>
						<div>Medicine: <strong>{returnSuccessNote.productName}</strong></div>
						<div>Batch: <strong>{returnSuccessNote.batchNo}</strong> | Expiry: <strong>{returnSuccessNote.expiryDate}</strong></div>
						<div>Quantity Returned: <strong>{returnSuccessNote.quantity}</strong></div>
						<div>Debit Rate: <strong>{formatCurrency(returnSuccessNote.rate)}</strong></div>
						<div class="text-sm font-bold text-danger pt-1 border-t border-border mt-2">
							Total Debit Amount: {formatCurrency(returnSuccessNote.totalDebitValue)}
						</div>
					</div>
				</div>

				<div class="flex items-center justify-end gap-2 pt-2">
					<Button variant="secondary" size="sm" onclick={printDebitNote}>
						<Printer size={13} class="mr-1" />
						<span>Print Debit Note</span>
					</Button>
					<Button variant="primary" size="sm" onclick={closeReturnModal}>
						<span>Done</span>
					</Button>
				</div>
			{/if}
		</div>
	</div>
{/if}
