<script lang="ts">
	import { onMount } from 'svelte';
	import { productService } from '$lib/services';
	import type { Product } from '$lib/types';
	import { LoadingState, EmptyState, Badge, Button } from '$lib/components/common';
	import DataTable from '$lib/components/tables/DataTable.svelte';
	import Pagination from '$lib/components/tables/Pagination.svelte';
	import {
		Search,
		Plus,
		Pill,
		ShieldAlert,
		Package,
		Layers,
		CheckCircle2,
		Eye,
		ArrowUpRight,
		SlidersHorizontal
	} from '@lucide/svelte';
	import { goto } from '$app/navigation';

	let loading = $state(true);
	let error = $state<string | null>(null);
	let products = $state<Product[]>([]);

	let searchQuery = $state('');
	let scheduleFilter = $state<string>('all');
	let statusFilter = $state<string>('all');

	// Pagination
	let currentPage = $state(1);
	const itemsPerPage = 15;

	// Metrics
	let totalProducts = $derived(products.length);
	let activeProducts = $derived(products.filter((p) => p.active).length);
	let h1Products = $derived(products.filter((p) => p.drugSchedule === 'H1' || p.drugSchedule === 'X').length);

	let filteredProducts = $derived.by(() => {
		let list = products;
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			list = list.filter(
				(p) =>
					p.name.toLowerCase().includes(query) ||
					(p.genericName && p.genericName.toLowerCase().includes(query)) ||
					(p.manufacturer && p.manufacturer.toLowerCase().includes(query)) ||
					(p.category && p.category.toLowerCase().includes(query))
			);
		}
		if (scheduleFilter !== 'all') {
			list = list.filter((p) => (p.drugSchedule || 'none') === scheduleFilter);
		}
		if (statusFilter !== 'all') {
			const isActive = statusFilter === 'active';
			list = list.filter((p) => p.active === isActive);
		}
		return list;
	});

	let paginatedProducts = $derived(
		filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
	);

	let totalPages = $derived(Math.ceil(filteredProducts.length / itemsPerPage));

	onMount(async () => {
		try {
			products = await productService.getProducts();
			loading = false;
		} catch (e) {
			console.error(e);
			error = 'Failed to load products master directory.';
			loading = false;
		}
	});

	$effect(() => {
		if (searchQuery !== undefined || scheduleFilter !== undefined || statusFilter !== undefined) {
			currentPage = 1;
		}
	});
</script>

<div class="space-y-5">
	<!-- Page Header -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<div class="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-0.5 text-[11px] font-bold text-teal-700 border border-teal-200/80 mb-1.5">
				<Pill size={12} class="text-teal-600" />
				<span>Axiscare Formulary Directory</span>
			</div>
			<h1 class="text-2xl font-extrabold tracking-tight text-slate-900">Medicine & Product Catalog</h1>
			<p class="text-xs text-slate-500">Master formulary, pricing, drug schedules, and packaging details</p>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="royal" onclick={() => goto('/inventory/products/new')}>
				<Plus size={16} class="mr-1.5" />
				<span>+ New Medicine / Product</span>
			</Button>
		</div>
	</div>

	<!-- Metric summary cards -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		<div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Formulary Items</span>
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
					<Pill size={18} />
				</div>
			</div>
			<div class="mt-3 font-mono text-2xl font-extrabold text-slate-900 tabular-nums">{totalProducts}</div>
			<div class="mt-1 text-xs text-slate-500 font-medium">Distinct medicine formulations</div>
		</div>

		<div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active SKU Listings</span>
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
					<CheckCircle2 size={18} />
				</div>
			</div>
			<div class="mt-3 font-mono text-2xl font-extrabold text-emerald-600 tabular-nums">{activeProducts}</div>
			<div class="mt-1 text-xs text-emerald-600 font-medium">Available for billing & sales</div>
		</div>

		<div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Controlled / Sch H1 & X</span>
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700 border border-purple-100">
					<ShieldAlert size={18} />
				</div>
			</div>
			<div class="mt-3 font-mono text-2xl font-extrabold text-purple-700 tabular-nums">{h1Products}</div>
			<div class="mt-1 text-xs text-purple-600 font-medium">Statutory prescriber logs required</div>
		</div>
	</div>

	<!-- Toolbar & Filters -->
	<div class="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
		<div class="relative w-full sm:max-w-md">
			<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
				<Search size={16} />
			</div>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search by brand name, generic composition, manufacturer..."
				class="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-4 pl-10 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all"
			/>
		</div>

		<div class="flex flex-wrap items-center gap-2.5">
			<!-- Drug Schedule Filter -->
			<select
				bind:value={scheduleFilter}
				class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all shadow-2xs cursor-pointer"
			>
				<option value="all">All Drug Schedules</option>
				<option value="H1">Schedule H1</option>
				<option value="H">Schedule H</option>
				<option value="X">Schedule X (Narcotics)</option>
				<option value="G">Schedule G</option>
				<option value="none">General / OTC</option>
			</select>

			<!-- Active Status Filter -->
			<select
				bind:value={statusFilter}
				class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all shadow-2xs cursor-pointer"
			>
				<option value="all">All Statuses</option>
				<option value="active">Active Only</option>
				<option value="inactive">Inactive Only</option>
			</select>
		</div>
	</div>

	<!-- Main Products Table -->
	{#if loading}
		<LoadingState message="Loading catalog..." />
	{:else if error}
		<EmptyState title="Error Loading Products" message={error} />
	{:else if products.length === 0}
		<EmptyState title="No Products Found" message="Create your first medicine entry to build your formulary.">
			{#snippet action()}
				<Button variant="primary" onclick={() => goto('/inventory/products/new')}>+ New Product</Button>
			{/snippet}
		</EmptyState>
	{:else if filteredProducts.length === 0}
		<EmptyState title="No Matching Products" message="No medicines found matching your search filter." />
	{:else}
		<DataTable
			items={paginatedProducts}
			columns={[
				{ header: 'Medicine / Brand', align: 'left' },
				{ header: 'Generic Composition', align: 'left' },
				{ header: 'Manufacturer', align: 'left' },
				{ header: 'Schedule', align: 'center' },
				{ header: 'MRP (₹)', align: 'right' },
				{ header: 'Rate (₹)', align: 'right' },
				{ header: 'GST %', align: 'center' },
				{ header: 'Status', align: 'center' },
				{ header: 'Actions', align: 'right' }
			]}
		>
			{#snippet row(product)}
				<!-- Product Name -->
				<td class="px-4 py-2.5 font-medium whitespace-nowrap">
					<a
						href="/inventory/products/{product.id}"
						class="flex items-center gap-1.5 font-semibold text-text-primary hover:text-accent group"
					>
						<span>{product.name}</span>
						<ArrowUpRight size={12} class="opacity-0 group-hover:opacity-100 transition-opacity text-accent" />
					</a>
					{#if product.packSize && product.packSize > 1}
						<span class="text-[11px] text-text-muted">Pack: {product.packSize} units</span>
					{/if}
				</td>

				<!-- Generic -->
				<td class="max-w-[220px] truncate px-4 py-2.5 text-text-secondary text-xs">
					{product.genericName || '-'}
				</td>

				<!-- Manufacturer -->
				<td class="max-w-[160px] truncate px-4 py-2.5 text-text-secondary text-xs">
					{product.manufacturer || '-'}
				</td>

				<!-- Drug Schedule -->
				<td class="px-4 py-2.5 text-center">
					{#if product.drugSchedule && product.drugSchedule !== 'none'}
						<span
							class="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider
								{product.drugSchedule === 'H1' || product.drugSchedule === 'X'
								? 'bg-schedule-h1-light text-schedule-h1 border border-schedule-h1/20'
								: 'bg-warning-light text-warning border border-warning/20'}"
						>
							<ShieldAlert size={10} />
							<span>Sch {product.drugSchedule}</span>
						</span>
					{:else}
						<span class="text-[11px] font-medium text-text-muted">OTC</span>
					{/if}
				</td>

				<!-- MRP -->
				<td class="px-4 py-2.5 text-right font-mono text-text-muted tabular-nums">
					₹{product.mrp?.toFixed(2) || '0.00'}
				</td>

				<!-- Rate -->
				<td class="px-4 py-2.5 text-right font-mono font-bold text-accent tabular-nums">
					₹{product.sellingRate.toFixed(2)}
				</td>

				<!-- GST -->
				<td class="px-4 py-2.5 text-center font-mono text-xs text-text-secondary">
					{product.gstRate}%
				</td>

				<!-- Status -->
				<td class="px-4 py-2.5 text-center">
					<Badge variant={product.active ? 'success' : 'neutral'} size="sm">
						{product.active ? 'Active' : 'Inactive'}
					</Badge>
				</td>

				<!-- Actions -->
				<td class="px-4 py-2.5 text-right">
					<button
						type="button"
						onclick={() => goto(`/inventory/products/${product.id}`)}
						class="rounded p-1 text-text-muted hover:bg-surface-hover hover:text-text-primary"
						title="View product details & batch stock"
					>
						<Eye size={14} />
					</button>
				</td>
			{/snippet}
		</DataTable>

		<div class="mt-3">
			<Pagination
				{currentPage}
				{totalPages}
				totalItems={filteredProducts.length}
				{itemsPerPage}
				onPageChange={(page) => (currentPage = page)}
			/>
		</div>
	{/if}
</div>
