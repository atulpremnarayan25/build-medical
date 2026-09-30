<script lang="ts">
	import { onMount } from 'svelte';
	import { customerService } from '$lib/services/index.js';
	import type { Customer } from '$lib/types/index.js';
	import {
		LoadingState,
		EmptyState,
		Badge,
		Button
	} from '$lib/components/common/index.js';
	import DataTable from '$lib/components/tables/DataTable.svelte';
	import Pagination from '$lib/components/tables/Pagination.svelte';
	import { Search, Plus, Users, CreditCard, CheckCircle2, ArrowUpRight, Eye } from '@lucide/svelte';
	import { goto } from '$app/navigation';

	let loading = $state(true);
	let error = $state<string | null>(null);
	let customers = $state<Customer[]>([]);

	let searchQuery = $state('');
	let statusFilter = $state<string>('all');

	let currentPage = $state(1);
	const itemsPerPage = 15;

	// Metrics
	let totalCustomersCount = $derived(customers.length);
	let activeCustomersCount = $derived(customers.filter((c) => c.active).length);
	let totalOutstanding = $derived(
		customers.reduce((acc, c) => acc + (c.outstandingBalance || 0), 0)
	);

	let filteredCustomers = $derived.by(() => {
		let list = customers;
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			list = list.filter(
				(c) =>
					c.name.toLowerCase().includes(query) ||
					(c.code && c.code.toLowerCase().includes(query)) ||
					(c.phone && c.phone.includes(query)) ||
					(c.gstin && c.gstin.toLowerCase().includes(query))
			);
		}
		if (statusFilter !== 'all') {
			const isActive = statusFilter === 'active';
			list = list.filter((c) => c.active === isActive);
		}
		return list;
	});

	let paginatedCustomers = $derived(
		filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
	);

	let totalPages = $derived(Math.ceil(filteredCustomers.length / itemsPerPage));

	onMount(async () => {
		try {
			customers = await customerService.getCustomers();
			loading = false;
		} catch (e) {
			console.error(e);
			error = 'Failed to load customer accounts.';
			loading = false;
		}
	});

	$effect(() => {
		if (searchQuery !== undefined || statusFilter !== undefined) {
			currentPage = 1;
		}
	});

	function handleRowClick(customer: Customer) {
		goto(`/customers/${customer.id}`);
	}
</script>

<div class="space-y-4">
	<!-- Page Header -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-xl font-bold text-text-primary">Customer & Patient Directory</h1>
			<p class="text-xs text-text-muted">Customer accounts, credit limits, contact directory, and ledger balances</p>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="primary" size="sm" onclick={() => goto('/customers/new')}>
				<Plus size={14} class="mr-1" />
				<span>+ New Customer</span>
			</Button>
		</div>
	</div>

	<!-- Metric summary cards -->
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
		<div class="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
			<div>
				<div class="text-[11px] font-semibold text-text-muted uppercase">Total Accounts</div>
				<div class="mt-1 font-mono text-xl font-bold text-text-primary tabular-nums">{totalCustomersCount}</div>
			</div>
			<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-light text-accent">
				<Users size={16} />
			</div>
		</div>

		<div class="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
			<div>
				<div class="text-[11px] font-semibold text-text-muted uppercase">Active Customers</div>
				<div class="mt-1 font-mono text-xl font-bold text-success tabular-nums">{activeCustomersCount}</div>
			</div>
			<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-success-light text-success">
				<CheckCircle2 size={16} />
			</div>
		</div>

		<div class="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
			<div>
				<div class="text-[11px] font-semibold text-text-muted uppercase">Total Receivables (₹)</div>
				<div class="mt-1 font-mono text-xl font-bold text-warning tabular-nums">
					₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
				</div>
			</div>
			<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-light text-warning">
				<CreditCard size={16} />
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
				placeholder="Search by customer name, account code, phone, GSTIN..."
				class="w-full rounded-lg border border-border bg-surface py-2 pr-4 pl-9 text-xs font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
			/>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<!-- Status Filter -->
			<select
				bind:value={statusFilter}
				class="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
			>
				<option value="all">All Accounts</option>
				<option value="active">Active Only</option>
				<option value="inactive">Inactive Only</option>
			</select>
		</div>
	</div>

	<!-- Main Customers Table -->
	{#if loading}
		<LoadingState message="Loading customers..." />
	{:else if error}
		<EmptyState title="Error" message={error} />
	{:else if customers.length === 0}
		<EmptyState title="No customers found" message="Get started by adding your first customer account.">
			{#snippet action()}
				<Button variant="primary" onclick={() => goto('/customers/new')}>+ New Customer</Button>
			{/snippet}
		</EmptyState>
	{:else if filteredCustomers.length === 0}
		<EmptyState title="No results" message="No customers match your search query." />
	{:else}
		<DataTable
			items={paginatedCustomers}
			columns={[
				{ header: 'Account Code', align: 'left' },
				{ header: 'Customer / Patient Name', align: 'left' },
				{ header: 'Phone / Contact', align: 'left' },
				{ header: 'Credit Limit (₹)', align: 'right' },
				{ header: 'Outstanding Due (₹)', align: 'right' },
				{ header: 'Status', align: 'center' },
				{ header: 'Actions', align: 'right' }
			]}
		>
			{#snippet row(customer)}
				<!-- Code -->
				<td class="px-4 py-2.5 font-mono text-xs font-semibold text-text-muted whitespace-nowrap">
					{customer.code || '-'}
				</td>

				<!-- Name -->
				<td class="px-4 py-2.5 font-medium whitespace-nowrap">
					<a
						href="/customers/{customer.id}"
						class="flex items-center gap-1.5 font-semibold text-text-primary hover:text-accent group"
					>
						<span>{customer.name}</span>
						<ArrowUpRight size={12} class="opacity-0 group-hover:opacity-100 transition-opacity text-accent" />
					</a>
				</td>

				<!-- Phone -->
				<td class="px-4 py-2.5 text-xs text-text-secondary whitespace-nowrap">
					{customer.phone || '-'}
				</td>

				<!-- Credit Limit -->
				<td class="px-4 py-2.5 text-right font-mono text-xs text-text-muted tabular-nums">
					₹{customer.creditLimit?.toFixed(2) || '0.00'}
				</td>

				<!-- Outstanding Balance -->
				<td
					class="px-4 py-2.5 text-right font-mono text-xs font-bold tabular-nums {customer.outstandingBalance > 0
						? 'text-warning'
						: 'text-text-primary'}"
				>
					₹{customer.outstandingBalance?.toFixed(2) || '0.00'}
				</td>

				<!-- Status -->
				<td class="px-4 py-2.5 text-center">
					<Badge variant={customer.active ? 'success' : 'neutral'} size="sm">
						{customer.active ? 'Active' : 'Inactive'}
					</Badge>
				</td>

				<!-- Actions -->
				<td class="px-4 py-2.5 text-right">
					<button
						type="button"
						onclick={() => goto(`/customers/${customer.id}`)}
						class="rounded p-1 text-text-muted hover:bg-surface-hover hover:text-text-primary"
						title="View customer ledger and details"
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
				totalItems={filteredCustomers.length}
				{itemsPerPage}
				onPageChange={(page) => (currentPage = page)}
			/>
		</div>
	{/if}
</div>
