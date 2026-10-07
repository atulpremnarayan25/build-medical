<script lang="ts">
	import { onMount } from 'svelte';
	import { supplierService } from '$lib/services/index.js';
	import type { Supplier } from '$lib/types/index.js';
	import {
		LoadingState,
		EmptyState,
		Badge,
		Button
	} from '$lib/components/common/index.js';
	import DataTable from '$lib/components/tables/DataTable.svelte';
	import Pagination from '$lib/components/tables/Pagination.svelte';
	import { Search, Plus, Truck, CreditCard, CheckCircle2, ArrowUpRight, Eye } from '@lucide/svelte';
	import { goto } from '$app/navigation';

	let loading = $state(true);
	let error = $state<string | null>(null);
	let suppliers = $state<Supplier[]>([]);

	let searchQuery = $state('');
	let statusFilter = $state<string>('all');

	let currentPage = $state(1);
	const itemsPerPage = 15;

	// Metrics
	let totalSuppliersCount = $derived(suppliers.length);
	let activeSuppliersCount = $derived(suppliers.filter((s) => s.active).length);
	let totalPayables = $derived(
		suppliers.reduce((acc, s) => acc + (s.outstandingBalance || 0), 0)
	);

	let filteredSuppliers = $derived.by(() => {
		let list = suppliers;
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			list = list.filter(
				(s) =>
					s.name.toLowerCase().includes(query) ||
					(s.code && s.code.toLowerCase().includes(query)) ||
					(s.phone && s.phone.includes(query)) ||
					(s.gstin && s.gstin.toLowerCase().includes(query)) ||
					(s.email && s.email.toLowerCase().includes(query))
			);
		}
		if (statusFilter !== 'all') {
			const isActive = statusFilter === 'active';
			list = list.filter((s) => s.active === isActive);
		}
		return list;
	});

	let paginatedSuppliers = $derived(
		filteredSuppliers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
	);

	let totalPages = $derived(Math.ceil(filteredSuppliers.length / itemsPerPage));

	onMount(async () => {
		try {
			suppliers = await supplierService.getSuppliers();
			loading = false;
		} catch (e) {
			console.error(e);
			error = 'Failed to load supplier accounts.';
			loading = false;
		}
	});

	$effect(() => {
		if (searchQuery !== undefined || statusFilter !== undefined) {
			currentPage = 1;
		}
	});

	function handleRowClick(supplier: Supplier) {
		goto(`/suppliers/${supplier.id}`);
	}
</script>

<div class="space-y-5">
	<!-- Page Header -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<div class="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200/80 mb-1.5">
				<Truck size={12} class="text-blue-600" />
				<span>Axiscare Vendor Directory</span>
			</div>
			<h1 class="text-2xl font-extrabold tracking-tight text-slate-900">Suppliers & Distributors</h1>
			<p class="text-xs text-slate-500">Pharma manufacturers, carrying & forwarding agents, and supplier payables</p>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="royal" onclick={() => goto('/suppliers/new')}>
				<Plus size={16} class="mr-1.5" />
				<span>+ New Supplier</span>
			</Button>
		</div>
	</div>

	<!-- Metric summary cards -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		<div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Vendors</span>
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
					<Truck size={18} />
				</div>
			</div>
			<div class="mt-3 font-mono text-2xl font-extrabold text-slate-900 tabular-nums">{totalSuppliersCount}</div>
			<div class="mt-1 text-xs text-slate-500 font-medium">Registered medicine distributors</div>
		</div>

		<div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active Suppliers</span>
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
					<CheckCircle2 size={18} />
				</div>
			</div>
			<div class="mt-3 font-mono text-2xl font-extrabold text-emerald-600 tabular-nums">{activeSuppliersCount}</div>
			<div class="mt-1 text-xs text-emerald-600 font-medium">Active trade accounts</div>
		</div>

		<div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold text-amber-600 uppercase tracking-wider">Total Payables Due</span>
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
					<CreditCard size={18} />
				</div>
			</div>
			<div class="mt-3 font-mono text-2xl font-extrabold text-amber-600 tabular-nums">
				₹{totalPayables.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
			</div>
			<div class="mt-1 text-xs text-amber-600 font-medium">Payables outstanding to distributors</div>
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
				placeholder="Search by vendor name, code, phone, GSTIN..."
				class="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-4 pl-10 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all"
			/>
		</div>

		<div class="flex flex-wrap items-center gap-2.5">
			<!-- Status Filter -->
			<select
				bind:value={statusFilter}
				class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all shadow-2xs cursor-pointer"
			>
				<option value="all">All Suppliers</option>
				<option value="active">Active Only</option>
				<option value="inactive">Inactive Only</option>
			</select>
		</div>
	</div>

	<!-- Main Suppliers Table -->
	{#if loading}
		<LoadingState message="Loading suppliers..." />
	{:else if error}
		<EmptyState title="Error" message={error} />
	{:else if suppliers.length === 0}
		<EmptyState title="No suppliers found" message="Get started by adding your first supplier.">
			{#snippet action()}
				<Button variant="primary" onclick={() => goto('/suppliers/new')}>+ New Supplier</Button>
			{/snippet}
		</EmptyState>
	{:else if filteredSuppliers.length === 0}
		<EmptyState title="No results" message="No suppliers match your search query." />
	{:else}
		<DataTable
			items={paginatedSuppliers}
			columns={[
				{ header: 'Vendor Code', align: 'left' },
				{ header: 'Supplier / Distributor', align: 'left' },
				{ header: 'Phone / Contact', align: 'left' },
				{ header: 'GSTIN', align: 'left' },
				{ header: 'Payable Due (₹)', align: 'right' },
				{ header: 'Status', align: 'center' },
				{ header: 'Actions', align: 'right' }
			]}
		>
			{#snippet row(supplier)}
				<!-- Code -->
				<td class="px-4 py-2.5 font-mono text-xs font-semibold text-text-muted whitespace-nowrap">
					{supplier.code || '-'}
				</td>

				<!-- Name -->
				<td class="px-4 py-2.5 font-medium whitespace-nowrap">
					<a
						href="/suppliers/{supplier.id}"
						class="flex items-center gap-1.5 font-semibold text-text-primary hover:text-accent group"
					>
						<span>{supplier.name}</span>
						<ArrowUpRight size={12} class="opacity-0 group-hover:opacity-100 transition-opacity text-accent" />
					</a>
				</td>

				<!-- Phone -->
				<td class="px-4 py-2.5 text-xs text-text-secondary whitespace-nowrap">
					{supplier.phone || supplier.email || '-'}
				</td>

				<!-- GSTIN -->
				<td class="px-4 py-2.5 font-mono text-xs text-text-secondary whitespace-nowrap">
					{supplier.gstin || '-'}
				</td>

				<!-- Outstanding Balance -->
				<td
					class="px-4 py-2.5 text-right font-mono text-xs font-bold tabular-nums {supplier.outstandingBalance > 0
						? 'text-warning'
						: 'text-text-primary'}"
				>
					₹{supplier.outstandingBalance?.toFixed(2) || '0.00'}
				</td>

				<!-- Status -->
				<td class="px-4 py-2.5 text-center">
					<Badge variant={supplier.active ? 'success' : 'neutral'} size="sm">
						{supplier.active ? 'Active' : 'Inactive'}
					</Badge>
				</td>

				<!-- Actions -->
				<td class="px-4 py-2.5 text-right">
					<button
						type="button"
						onclick={() => goto(`/suppliers/${supplier.id}`)}
						class="rounded p-1 text-text-muted hover:bg-surface-hover hover:text-text-primary"
						title="View supplier ledger and profile"
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
				totalItems={filteredSuppliers.length}
				{itemsPerPage}
				onPageChange={(page) => (currentPage = page)}
			/>
		</div>
	{/if}
</div>
