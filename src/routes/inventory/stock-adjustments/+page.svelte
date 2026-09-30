<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		PageHeader,
		Button,
		Badge,
		LoadingState,
		EmptyState
	} from '$lib/components/common/index.js';
	import {
		Plus,
		Search,
		RotateCcw,
		ArrowDown,
		ArrowUp,
		SlidersHorizontal,
		Filter,
		PackageCheck,
		FileText,
		Calendar,
		User,
		Printer
	} from '@lucide/svelte';

	interface AdjustmentRecord {
		id: string;
		batchId: string;
		delta: number;
		eventType: string;
		reason: string;
		createdAt: string;
		batchNo: string;
		expiryDate: string;
		mrp: number;
		currentRemaining: number;
		productId: string;
		productName: string;
		productCode: string;
		userName: string;
	}

	let adjustments = $state<AdjustmentRecord[]>([]);
	let loading = $state(true);
	let searchQuery = $state('');
	let filterType = $state<'all' | 'additions' | 'reductions'>('all');

	onMount(async () => {
		await loadAdjustments();
	});

	async function loadAdjustments() {
		loading = true;
		try {
			const res = await fetch('/api/inventory/adjustments');
			if (res.ok) {
				adjustments = await res.json();
			}
		} catch (err) {
			console.error('Failed to load adjustments:', err);
		} finally {
			loading = false;
		}
	}

	// Filtered adjustments
	let filtered = $derived.by(() => {
		return adjustments.filter((a) => {
			if (filterType === 'additions' && a.delta <= 0) return false;
			if (filterType === 'reductions' && a.delta >= 0) return false;
			if (!searchQuery.trim()) return true;

			const q = searchQuery.toLowerCase();
			const matchName = a.productName?.toLowerCase().includes(q) || false;
			const matchCode = a.productCode?.toLowerCase().includes(q) || false;
			const matchBatch = a.batchNo?.toLowerCase().includes(q) || false;
			const matchReason = a.reason?.toLowerCase().includes(q) || false;
			const matchUser = a.userName?.toLowerCase().includes(q) || false;

			return matchName || matchCode || matchBatch || matchReason || matchUser;
		});
	});

	// Metrics
	let totalAdjustmentsCount = $derived(adjustments.length);
	let additionsUnits = $derived(
		adjustments.filter((a) => a.delta > 0).reduce((sum, a) => sum + a.delta, 0)
	);
	let reductionsUnits = $derived(
		adjustments.filter((a) => a.delta < 0).reduce((sum, a) => sum + Math.abs(a.delta), 0)
	);
	let netStockChange = $derived(additionsUnits - reductionsUnits);
</script>

<svelte:head>
	<title>Stock Adjustments & Variance Audit Log - MedStock ERP</title>
</svelte:head>

<div class="space-y-4">
	<!-- Page Header -->
	<PageHeader
		title="Stock Adjustments & Variance Audit Log"
		subtitle="Append-only regulatory log of physical inventory counts, write-offs, and batch reconciliation movements"
	>
		{#snippet actions()}
			<Button variant="secondary" onclick={loadAdjustments}>
				<RotateCcw size={14} class="mr-1.5" />
				<span>Refresh</span>
			</Button>
			<Button variant="primary" onclick={() => goto('/inventory/stock-adjustments/new')}>
				<Plus size={14} class="mr-1.5" />
				<span>New Adjustment / Stocktake (F2)</span>
			</Button>
		{/snippet}
	</PageHeader>

	<!-- KPI Summary Metrics -->
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		<div class="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
			<div class="flex items-center justify-between text-[11px] font-semibold text-text-muted uppercase">
				<span>Logged Adjustments</span>
				<FileText size={16} />
			</div>
			<div class="mt-1.5 font-mono text-2xl font-black text-text-primary tabular-nums">
				{totalAdjustmentsCount}
			</div>
			<div class="mt-0.5 text-[11px] text-text-muted">Total variance events</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
			<div class="flex items-center justify-between text-[11px] font-semibold text-success uppercase">
				<span>Units Added (+)</span>
				<ArrowUp size={16} />
			</div>
			<div class="mt-1.5 font-mono text-2xl font-black text-success tabular-nums">
				+{additionsUnits}
			</div>
			<div class="mt-0.5 text-[11px] text-text-muted">Surplus inventory restocked</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
			<div class="flex items-center justify-between text-[11px] font-semibold text-danger uppercase">
				<span>Units Reduced (-)</span>
				<ArrowDown size={16} />
			</div>
			<div class="mt-1.5 font-mono text-2xl font-black text-danger tabular-nums">
				-{reductionsUnits}
			</div>
			<div class="mt-0.5 text-[11px] text-text-muted">Damaged / expired / missing</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
			<div class="flex items-center justify-between text-[11px] font-semibold text-accent uppercase">
				<span>Net Stock Shift</span>
				<SlidersHorizontal size={16} />
			</div>
			<div class="mt-1.5 font-mono text-2xl font-black tabular-nums {netStockChange >= 0 ? 'text-success' : 'text-danger'}">
				{netStockChange >= 0 ? '+' : ''}{netStockChange} units
			</div>
			<div class="mt-0.5 text-[11px] text-text-muted">Overall physical delta</div>
		</div>
	</div>

	<!-- Controls / Filter Bar -->
	<div
		class="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between"
	>
		<!-- Search Input -->
		<div class="relative flex-1 max-w-md">
			<Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search by Product, Code, Batch, Reason, or User..."
				class="w-full rounded-lg border border-border bg-surface-secondary py-1.5 pl-8 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:bg-surface focus:outline-none"
			/>
		</div>

		<!-- Type Filter Pills -->
		<div class="flex items-center gap-1 rounded-lg border border-border bg-surface-secondary p-1">
			<button
				type="button"
				class="rounded px-2.5 py-1 text-xs font-semibold transition-colors {filterType === 'all'
					? 'bg-surface text-text-primary shadow-xs'
					: 'text-text-muted hover:text-text-primary'}"
				onclick={() => (filterType = 'all')}
			>
				All Adjustments
			</button>
			<button
				type="button"
				class="rounded px-2.5 py-1 text-xs font-semibold transition-colors {filterType === 'additions'
					? 'bg-success-light text-success font-bold shadow-xs'
					: 'text-text-muted hover:text-text-primary'}"
				onclick={() => (filterType = 'additions')}
			>
				Additions (+)
			</button>
			<button
				type="button"
				class="rounded px-2.5 py-1 text-xs font-semibold transition-colors {filterType === 'reductions'
					? 'bg-danger-light text-danger font-bold shadow-xs'
					: 'text-text-muted hover:text-text-primary'}"
				onclick={() => (filterType = 'reductions')}
			>
				Reductions (-)
			</button>
		</div>
	</div>

	<!-- Adjustments Table Area -->
	{#if loading}
		<LoadingState message="Loading stock adjustment audit records..." />
	{:else if filtered.length === 0}
		<EmptyState
			title="No stock adjustments found"
			message={searchQuery || filterType !== 'all'
				? 'No records match your search or filter criteria.'
				: 'No physical stock adjustments or reconciliation records have been posted yet.'}
		>
			{#snippet action()}
				<Button variant="primary" onclick={() => goto('/inventory/stock-adjustments/new')}>
					<Plus size={14} class="mr-1.5" />
					<span>Issue First Stock Adjustment</span>
				</Button>
			{/snippet}
		</EmptyState>
	{:else}
		<div class="overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead
						class="border-b border-border bg-surface-secondary text-[11px] font-semibold text-text-secondary uppercase"
					>
						<tr>
							<th class="w-8 px-3 py-2.5 text-center">#</th>
							<th class="px-3 py-2.5">Date & Time</th>
							<th class="px-3 py-2.5">Product & Code</th>
							<th class="px-3 py-2.5">Batch / Expiry</th>
							<th class="px-3 py-2.5 text-right">Batch MRP</th>
							<th class="px-3 py-2.5 text-right">Current Stock</th>
							<th class="px-3 py-2.5 text-right">Adjustment Delta</th>
							<th class="px-3 py-2.5">Audit Reason / Memo</th>
							<th class="px-3 py-2.5">Authorized By</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border/60">
						{#each filtered as a, index (a.id)}
							<tr class="hover:bg-surface-hover/60 transition-colors">
								<td class="px-3 py-2.5 text-center font-mono text-text-muted tabular-nums">
									{index + 1}
								</td>
								<td class="px-3 py-2.5">
									<div class="font-mono text-text-primary">
										{new Date(a.createdAt).toLocaleDateString('en-IN', {
											day: '2-digit',
											month: 'short',
											year: 'numeric'
										})}
									</div>
									<div class="text-[10px] text-text-muted">
										{new Date(a.createdAt).toLocaleTimeString('en-IN', {
											hour: '2-digit',
											minute: '2-digit'
										})}
									</div>
								</td>
								<td class="px-3 py-2.5">
									<div class="font-bold text-text-primary">{a.productName || 'Unknown'}</div>
									<div class="font-mono text-[11px] text-text-muted">{a.productCode || '-'}</div>
								</td>
								<td class="px-3 py-2.5">
									<div class="font-mono font-bold text-text-primary uppercase">
										{a.batchNo || 'N/A'}
									</div>
									{#if a.expiryDate}
										<div class="font-mono text-[11px] text-text-muted">
											EXP: {a.expiryDate.substring(0, 7)}
										</div>
									{/if}
								</td>
								<td class="px-3 py-2.5 text-right font-mono text-text-secondary tabular-nums">
									₹{a.mrp.toFixed(2)}
								</td>
								<td class="px-3 py-2.5 text-right font-mono font-bold text-text-primary tabular-nums">
									{a.currentRemaining}
								</td>
								<td class="px-3 py-2.5 text-right">
									{#if a.delta > 0}
										<span
											class="inline-flex items-center gap-1 rounded bg-success-light px-2 py-0.5 font-mono text-xs font-bold text-success tabular-nums"
										>
											<ArrowUp size={12} />
											+{a.delta}
										</span>
									{:else}
										<span
											class="inline-flex items-center gap-1 rounded bg-danger-light px-2 py-0.5 font-mono text-xs font-bold text-danger tabular-nums"
										>
											<ArrowDown size={12} />
											{a.delta}
										</span>
									{/if}
								</td>
								<td class="px-3 py-2.5">
									<div class="max-w-[220px] truncate font-medium text-text-primary" title={a.reason}>
										{a.reason || 'General Adjustment'}
									</div>
								</td>
								<td class="px-3 py-2.5">
									<div class="flex items-center gap-1.5 text-text-secondary">
										<User size={12} class="text-text-muted" />
										<span>{a.userName || 'Admin'}</span>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
