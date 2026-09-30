<script lang="ts">
	import { onMount } from 'svelte';
	import { batchService } from '$lib/services';
	import type { Batch } from '$lib/types';
	import { LoadingState, EmptyState, Badge, Button } from '$lib/components/common';
	import DataTable from '$lib/components/tables/DataTable.svelte';
	import Pagination from '$lib/components/tables/Pagination.svelte';
	import ExpiryBadge from '$lib/components/inventory/ExpiryBadge.svelte';
	import StockBadge from '$lib/components/inventory/StockBadge.svelte';
	import {
		Search,
		Plus,
		AlertTriangle,
		Clock,
		PackageOpen,
		CheckCircle2,
		Layers,
		ArrowUpRight,
		SlidersHorizontal,
		Eye,
		RotateCcw,
		Printer,
		Undo2,
		DollarSign,
		ShieldAlert
	} from '@lucide/svelte';
	import { goto } from '$app/navigation';

	let loading = $state(true);
	let error = $state<string | null>(null);
	let batches = $state<Batch[]>([]);

	let searchQuery = $state('');
	let statusFilter = $state<string>('all');
	let sortBy = $state<'expiry_asc' | 'expiry_desc' | 'stock_asc' | 'stock_desc' | 'val_desc'>('expiry_asc');

	// Pagination
	let currentPage = $state(1);
	const itemsPerPage = 15;

	// Metrics
	let totalBatches = $derived(batches.length);
	let healthyBatches = $derived(
		batches.filter((b) => {
			const diffDays = Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
			return diffDays > 90 && b.quantity > 10;
		}).length
	);
	let nearExpiryBatches = $derived(
		batches.filter((b) => {
			const diffDays = Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
			return diffDays >= 0 && diffDays <= 90;
		}).length
	);
	let expiredBatches = $derived(
		batches.filter((b) => {
			const diffDays = Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
			return diffDays < 0;
		}).length
	);
	let lowStockBatches = $derived(
		batches.filter((b) => b.quantity > 0 && b.quantity <= 10).length
	);

	let totalStockValuation = $derived(
		batches.reduce((sum, b) => sum + (b.quantity || 0) * (b.purchaseRate || 0), 0)
	);
	let totalMrpValuation = $derived(
		batches.reduce((sum, b) => sum + (b.quantity || 0) * (b.mrp || 0), 0)
	);

	let filteredBatches = $derived.by(() => {
		let list = batches;
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			list = list.filter(
				(b) =>
					b.productName.toLowerCase().includes(query) ||
					b.batchNumber.toLowerCase().includes(query) ||
					(b.supplierName && b.supplierName.toLowerCase().includes(query))
			);
		}

		if (statusFilter !== 'all') {
			const now = Date.now();
			list = list.filter((b) => {
				const diffDays = Math.ceil((new Date(b.expiryDate).getTime() - now) / (1000 * 60 * 60 * 24));
				if (statusFilter === 'expired') return diffDays < 0;
				if (statusFilter === 'near-expiry') return diffDays >= 0 && diffDays <= 90;
				if (statusFilter === 'low-stock') return b.quantity > 0 && b.quantity <= 10;
				if (statusFilter === 'out-of-stock') return b.quantity <= 0;
				if (statusFilter === 'healthy') return diffDays > 90 && b.quantity > 10;
				return true;
			});
		}

		// Sorting
		return list.slice().sort((a, b) => {
			if (sortBy === 'expiry_asc') {
				return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
			} else if (sortBy === 'expiry_desc') {
				return new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime();
			} else if (sortBy === 'stock_asc') {
				return a.quantity - b.quantity;
			} else if (sortBy === 'stock_desc') {
				return b.quantity - a.quantity;
			} else if (sortBy === 'val_desc') {
				return (b.quantity * b.purchaseRate) - (a.quantity * a.purchaseRate);
			}
			return 0;
		});
	});

	let paginatedBatches = $derived(
		filteredBatches.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
	);

	let totalPages = $derived(Math.ceil(filteredBatches.length / itemsPerPage));

	async function loadBatches() {
		loading = true;
		error = null;
		try {
			batches = await batchService.getBatches();
		} catch (e) {
			console.error(e);
			error = 'Failed to load batches master inventory.';
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		await loadBatches();
	});

	$effect(() => {
		if (searchQuery !== undefined || statusFilter !== undefined || sortBy !== undefined) {
			currentPage = 1;
		}
	});
</script>

<svelte:head>
	<title>Batch Inventory & FEFO Expiry Tracking - MedStock ERP</title>
</svelte:head>

<div class="space-y-4">
	<!-- Page Header -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-xl font-bold text-text-primary">Batch Inventory & Expiry Tracking</h1>
			<p class="text-xs text-text-muted">FEFO-driven stock control, shelf-life monitoring, and supplier traceability</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<Button variant="secondary" size="sm" onclick={loadBatches}>
				<RotateCcw size={14} class="mr-1.5" />
				<span>Refresh</span>
			</Button>
			<Button variant="secondary" size="sm" onclick={() => window.print()}>
				<Printer size={14} class="mr-1.5" />
				<span>Print Audit Sheet</span>
			</Button>
			<Button variant="primary" size="sm" onclick={() => goto('/inventory/stock-adjustments/new')}>
				<SlidersHorizontal size={14} class="mr-1.5" />
				<span>Stocktake & Adjustments (F2)</span>
			</Button>
		</div>
	</div>

	<!-- Metric summary cards -->
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
		<div class="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
			<div>
				<div class="text-[11px] font-semibold text-text-muted uppercase">Total Batches</div>
				<div class="mt-1 font-mono text-xl font-bold text-text-primary tabular-nums">{totalBatches}</div>
				<div class="text-[10px] text-text-muted">Inward inventory</div>
			</div>
			<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-light text-accent">
				<Layers size={16} />
			</div>
		</div>

		<div class="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
			<div>
				<div class="text-[11px] font-semibold text-success uppercase">Healthy Stock</div>
				<div class="mt-1 font-mono text-xl font-bold text-success tabular-nums">{healthyBatches}</div>
				<div class="text-[10px] text-text-muted">&gt;90d expiry &gt;10 qty</div>
			</div>
			<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-success-light text-success">
				<CheckCircle2 size={16} />
			</div>
		</div>

		<div class="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
			<div>
				<div class="text-[11px] font-semibold text-warning uppercase">Near Expiry</div>
				<div class="mt-1 font-mono text-xl font-bold text-warning tabular-nums">{nearExpiryBatches}</div>
				<div class="text-[10px] text-text-muted">&lt;90 days to expiry</div>
			</div>
			<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-light text-warning">
				<Clock size={16} />
			</div>
		</div>

		<div class="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
			<div>
				<div class="text-[11px] font-semibold text-danger uppercase">Expired Batches</div>
				<div class="mt-1 font-mono text-xl font-bold text-danger tabular-nums">{expiredBatches}</div>
				<div class="text-[10px] text-text-muted">Disposal / Return required</div>
			</div>
			<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-danger-light text-danger">
				<AlertTriangle size={16} />
			</div>
		</div>

		<div class="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 shadow-2xs col-span-2 sm:col-span-1">
			<div>
				<div class="text-[11px] font-semibold text-accent uppercase">Stock Valuation</div>
				<div class="mt-1 font-mono text-xl font-bold text-accent tabular-nums">₹{totalStockValuation.toFixed(0)}</div>
				<div class="text-[10px] text-text-muted">MRP: ₹{totalMrpValuation.toFixed(0)}</div>
			</div>
			<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-light text-accent">
				<DollarSign size={16} />
			</div>
		</div>
	</div>

	<!-- Toolbar & Filters -->
	<div class="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
		<div class="relative w-full sm:max-w-md">
			<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
				<Search size={15} />
			</div>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search by product name, batch code, or supplier..."
				class="w-full rounded-lg border border-border bg-surface py-2 pr-4 pl-9 text-xs font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
			/>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<!-- Status Filter -->
			<select
				bind:value={statusFilter}
				class="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
			>
				<option value="all">All Batches ({totalBatches})</option>
				<option value="healthy">Healthy Stock ({healthyBatches})</option>
				<option value="near-expiry">Near Expiry &lt;90d ({nearExpiryBatches})</option>
				<option value="expired">Expired Batches ({expiredBatches})</option>
				<option value="low-stock">Low Stock &le;10 ({lowStockBatches})</option>
				<option value="out-of-stock">Out of Stock</option>
			</select>

			<!-- Sort Order -->
			<select
				bind:value={sortBy}
				class="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
			>
				<option value="expiry_asc">Expiry (Earliest / FEFO First)</option>
				<option value="expiry_desc">Expiry (Latest First)</option>
				<option value="val_desc">Stock Valuation (Highest First)</option>
				<option value="stock_desc">Stock Qty (Highest First)</option>
				<option value="stock_asc">Stock Qty (Lowest First)</option>
			</select>
		</div>
	</div>

	<!-- Main Batches Table -->
	{#if loading}
		<LoadingState message="Loading batch records..." />
	{:else if error}
		<EmptyState title="Error Loading Batches" message={error} />
	{:else if batches.length === 0}
		<EmptyState title="No Batches Found" message="Batches will be automatically logged when you record inward purchases." />
	{:else if filteredBatches.length === 0}
		<EmptyState title="No Matching Batches" message="No batches match your search and filter criteria." />
	{:else}
		<DataTable
			items={paginatedBatches}
			columns={[
				{ header: 'Product / Item', align: 'left' },
				{ header: 'Batch No', align: 'left' },
				{ header: 'Expiry Status (FEFO)', align: 'center' },
				{ header: 'Stock Qty', align: 'right' },
				{ header: 'MRP (₹)', align: 'right' },
				{ header: 'Purchase (₹)', align: 'right' },
				{ header: 'Holding Value', align: 'right' },
				{ header: 'Supplier Source', align: 'left' },
				{ header: 'Actions', align: 'right' }
			]}
		>
			{#snippet row(batch)}
				<!-- Product Name -->
				<td class="px-4 py-2.5 font-medium whitespace-nowrap">
					<a
						href="/inventory/products/{batch.productId}"
						class="flex items-center gap-1.5 font-semibold text-text-primary hover:text-accent group"
					>
						<span>{batch.productName}</span>
						<ArrowUpRight size={12} class="opacity-0 group-hover:opacity-100 transition-opacity text-accent" />
					</a>
				</td>

				<!-- Batch No -->
				<td class="px-4 py-2.5 font-mono text-xs font-bold text-text-primary whitespace-nowrap">
					{batch.batchNumber}
				</td>

				<!-- Expiry Badge -->
				<td class="px-4 py-2.5 text-center">
					<ExpiryBadge
						date={batch.expiryDate}
						status={batch.status === 'out-of-stock' ||
						batch.status === 'low-stock' ||
						batch.status === 'healthy'
							? undefined
							: batch.status}
					/>
				</td>

				<!-- Stock Quantity Badge -->
				<td class="px-4 py-2.5 text-right">
					<StockBadge
						quantity={batch.quantity}
						status={batch.status === 'out-of-stock' || batch.status === 'low-stock'
							? batch.status
							: undefined}
					/>
				</td>

				<!-- MRP -->
				<td class="px-4 py-2.5 text-right font-mono text-xs text-text-muted tabular-nums">
					₹{batch.mrp?.toFixed(2) || '0.00'}
				</td>

				<!-- Purchase Rate -->
				<td class="px-4 py-2.5 text-right font-mono text-xs font-bold text-text-primary tabular-nums">
					₹{batch.purchaseRate?.toFixed(2) || '0.00'}
				</td>

				<!-- Line Stock Valuation -->
				<td class="px-4 py-2.5 text-right font-mono text-xs font-bold text-accent tabular-nums">
					₹{((batch.quantity || 0) * (batch.purchaseRate || 0)).toFixed(2)}
				</td>

				<!-- Supplier Source -->
				<td class="max-w-[140px] truncate px-4 py-2.5 text-xs text-text-secondary">
					{batch.supplierName || 'Direct / Opening'}
				</td>

				<!-- Actions -->
				<td class="px-4 py-2.5 text-right">
					<div class="flex items-center justify-end gap-1">
						<button
							type="button"
							onclick={() => goto(`/inventory/stock-adjustments/new?productId=${batch.productId}&batchId=${batch.id}`)}
							class="rounded p-1 text-text-muted hover:bg-surface-hover hover:text-accent transition-colors"
							title="Adjust Stock / Count Variance"
						>
							<SlidersHorizontal size={14} />
						</button>
						<button
							type="button"
							onclick={() => goto('/returns/new')}
							class="rounded p-1 text-text-muted hover:bg-surface-hover hover:text-danger transition-colors"
							title="Return to Supplier (Debit Note)"
						>
							<Undo2 size={14} />
						</button>
						<button
							type="button"
							onclick={() => goto(`/inventory/products/${batch.productId}`)}
							class="rounded p-1 text-text-muted hover:bg-surface-hover hover:text-text-primary transition-colors"
							title="View parent product"
						>
							<Eye size={14} />
						</button>
					</div>
				</td>
			{/snippet}
		</DataTable>

		<div class="mt-3">
			<Pagination
				{currentPage}
				{totalPages}
				totalItems={filteredBatches.length}
				{itemsPerPage}
				onPageChange={(page) => (currentPage = page)}
			/>
		</div>
	{/if}
</div>
