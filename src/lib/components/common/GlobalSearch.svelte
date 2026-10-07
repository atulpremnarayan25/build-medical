<script lang="ts">
	import {
		Search,
		X,
		Loader2,
		Package,
		Users,
		Truck,
		FileText,
		Receipt,
		Warehouse,
		ShieldAlert,
		CornerDownLeft,
		SlidersHorizontal
	} from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import type { Component } from 'svelte';
	import {
		customerService,
		supplierService,
		productService,
		saleService,
		purchaseService
	} from '$lib/services/index.js';

	let open = $state(false);
	let query = $state('');
	let loading = $state(false);
	let selectedIndex = $state(0);
	let activeCategory = $state<'All' | 'Product' | 'Customer' | 'Supplier' | 'Sale' | 'Purchase'>('All');

	let resultsContainerRef = $state<HTMLDivElement | null>(null);

	interface SearchResult {
		type: 'Product' | 'Customer' | 'Supplier' | 'Sale' | 'Purchase';
		title: string;
		subtitle: string;
		href: string;
		icon: Component;
		meta?: string;
	}

	let results = $state<SearchResult[]>([]);

	let filteredResults = $derived(
		activeCategory === 'All'
			? results
			: results.filter((r) => r.type === activeCategory)
	);

	const quickLinks = [
		{
			title: 'New Sales Bill',
			subtitle: 'Open high-speed counter billing terminal (F2)',
			href: '/sales/new',
			icon: Receipt,
			badge: 'Quick Action',
			badgeColor: 'bg-blue-500/10 text-blue-600 border-blue-500/20'
		},
		{
			title: 'Inward Purchase Invoice',
			subtitle: 'Record distributor shipment & stock GRN (F3)',
			href: '/purchases/new',
			icon: Package,
			badge: 'Inward GRN',
			badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
		},
		{
			title: 'Batch Inventory & Expiry Monitor',
			subtitle: 'Audit stock, expiring batches, and rack locations',
			href: '/inventory/batches',
			icon: Warehouse,
			badge: 'Inventory',
			badgeColor: 'bg-amber-500/10 text-amber-600 border-amber-500/20'
		},
		{
			title: 'Customer Directory & Ledgers',
			subtitle: 'Manage chemists, clinics, and outstanding credit balances',
			href: '/customers',
			icon: Users,
			badge: 'Parties',
			badgeColor: 'bg-purple-500/10 text-purple-600 border-purple-500/20'
		},
		{
			title: 'Schedule H1 Compliance Register',
			subtitle: 'Prescription logs for controlled and restricted pharmaceuticals',
			href: '/reports/schedule-h1',
			icon: ShieldAlert,
			badge: 'Compliance',
			badgeColor: 'bg-rose-500/10 text-rose-600 border-rose-500/20'
		}
	];

	const categories: Array<{ id: typeof activeCategory; label: string }> = [
		{ id: 'All', label: 'All' },
		{ id: 'Product', label: 'Medicines' },
		{ id: 'Customer', label: 'Customers' },
		{ id: 'Supplier', label: 'Suppliers' },
		{ id: 'Sale', label: 'Invoices' },
		{ id: 'Purchase', label: 'Purchases' }
	];

	function toggleSearch() {
		open = !open;
		if (open) {
			query = '';
			results = [];
			selectedIndex = 0;
			activeCategory = 'All';
			tick().then(() => {
				document.getElementById('global-search-input')?.focus();
			});
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			toggleSearch();
			return;
		}

		if (!open) return;

		if (e.key === 'Escape') {
			e.preventDefault();
			open = false;
			return;
		}

		const list = query.length >= 2 ? filteredResults : quickLinks;
		if (list.length === 0) return;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % list.length;
			scrollToSelected();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = (selectedIndex - 1 + list.length) % list.length;
			scrollToSelected();
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (list[selectedIndex]) {
				selectResult(list[selectedIndex].href);
			}
		}
	}

	function scrollToSelected() {
		tick().then(() => {
			if (!resultsContainerRef) return;
			const selectedEl = resultsContainerRef.querySelector('[data-selected="true"]') as HTMLElement;
			if (selectedEl) {
				selectedEl.scrollIntoView({ block: 'nearest' });
			}
		});
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});

	let debounceTimer: ReturnType<typeof setTimeout>;

	async function performSearch() {
		if (query.trim().length < 2) {
			results = [];
			selectedIndex = 0;
			return;
		}

		loading = true;
		try {
			const q = query.trim().toLowerCase();
			const [customers, suppliers, products, sales, purchases] = await Promise.all([
				customerService.searchCustomers(q).catch(() => []),
				supplierService.searchSuppliers(q).catch(() => []),
				productService.searchProducts(q).catch(() => []),
				saleService
					.getSales()
					.then((res) =>
						res.filter(
							(s) =>
								s.invoiceNumber.toLowerCase().includes(q) ||
								s.customerName.toLowerCase().includes(q)
						)
					)
					.catch(() => []),
				purchaseService
					.getPurchases()
					.then((res) =>
						res.filter(
							(p) =>
								p.invoiceNumber.toLowerCase().includes(q) ||
								p.supplierName.toLowerCase().includes(q)
						)
					)
					.catch(() => [])
			]);

			const combined: SearchResult[] = [
				...products.slice(0, 6).map((p) => ({
					type: 'Product' as const,
					title: p.name,
					subtitle: p.genericName ? `${p.genericName} • ${p.manufacturer || 'General'}` : p.manufacturer || 'Pharmaceutical Product',
					href: `/inventory/products/${p.id}`,
					icon: Package,
					meta: p.mrp ? `MRP ₹${p.mrp.toFixed(2)}` : undefined
				})),
				...customers.slice(0, 5).map((c) => ({
					type: 'Customer' as const,
					title: c.name,
					subtitle: c.phone ? `Ph: ${c.phone}` : c.address || 'Wholesale Client',
					href: `/customers/${c.id}`,
					icon: Users,
					meta: c.gstin ? `GST: ${c.gstin.slice(0, 6)}...` : undefined
				})),
				...suppliers.slice(0, 5).map((s) => ({
					type: 'Supplier' as const,
					title: s.name,
					subtitle: s.phone ? `Ph: ${s.phone}` : s.address || 'Pharmaceutical Supplier',
					href: `/suppliers/${s.id}`,
					icon: Truck,
					meta: s.gstin ? `GST: ${s.gstin.slice(0, 6)}...` : undefined
				})),
				...sales.slice(0, 5).map((s) => ({
					type: 'Sale' as const,
					title: s.invoiceNumber,
					subtitle: `Customer: ${s.customerName} • ₹${s.grandTotal?.toFixed(2) ?? '0.00'}`,
					href: `/sales/${s.id}`,
					icon: Receipt,
					meta: s.paymentStatus?.toUpperCase()
				})),
				...purchases.slice(0, 5).map((p) => ({
					type: 'Purchase' as const,
					title: p.invoiceNumber,
					subtitle: `Supplier: ${p.supplierName} • ₹${p.grandTotal?.toFixed(2) ?? '0.00'}`,
					href: `/purchases/${p.id}`,
					icon: FileText,
					meta: p.paymentStatus?.toUpperCase()
				}))
			];

			results = combined;
			selectedIndex = 0;
		} catch (e) {
			console.error('Search error:', e);
		} finally {
			loading = false;
		}
	}

	function onInput() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(performSearch, 200);
	}

	function selectResult(href: string) {
		open = false;
		goto(href);
	}

	const typeBadgeStyles: Record<SearchResult['type'], { color: string; label: string }> = {
		Product: { color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', label: 'Medicine' },
		Customer: { color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', label: 'Customer' },
		Supplier: { color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', label: 'Supplier' },
		Sale: { color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20', label: 'Sale Bill' },
		Purchase: { color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20', label: 'Inward GRN' }
	};
</script>

<!-- Sleek Navbar Search Trigger -->
<button
	type="button"
	class="group relative flex h-9 w-full items-center gap-2.5 rounded-lg border border-border/80 bg-surface-secondary/70 px-3 text-xs text-text-muted transition-all duration-150 hover:border-border-strong hover:bg-surface hover:text-text-secondary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none shadow-2xs"
	onclick={toggleSearch}
	aria-label="Search ERP database (Ctrl+K)"
>
	<Search size={15} class="shrink-0 text-text-muted transition-colors group-hover:text-accent" />
	
	<span class="truncate text-left text-text-muted group-hover:text-text-secondary">
		<span class="hidden xl:inline">Search medicines, batches, customers, invoices...</span>
		<span class="hidden sm:inline xl:hidden">Search medicines, bills...</span>
		<span class="sm:hidden">Search ERP...</span>
	</span>

	<div class="ml-auto hidden items-center gap-1 sm:flex">
		<kbd
			class="inline-flex items-center gap-0.5 rounded-md border border-border/80 bg-surface px-1.5 py-0.5 font-mono text-[10px] font-semibold text-text-muted shadow-2xs group-hover:border-border-strong"
		>
			<span class="text-[9px]">⌘</span>K
		</kbd>
	</div>
</button>

<!-- Command Palette Modal -->
{#if open}
	<div
		class="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-3 sm:px-4"
		role="dialog"
		aria-modal="true"
		aria-label="Global ERP Search"
	>
		<!-- Backdrop -->
		<button
			type="button"
			class="fixed inset-0 cursor-default appearance-none bg-black/60 backdrop-blur-xs transition-opacity outline-none"
			onclick={toggleSearch}
			aria-label="Close search"
		></button>

		<!-- Dialog Container -->
		<div
			class="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl ring-1 ring-black/10 transition-all duration-200"
		>
			<!-- Input Header -->
			<div class="flex items-center gap-3 border-b border-border/70 px-4 py-3 bg-surface">
				<Search size={18} class="text-accent shrink-0" />
				<input
					id="global-search-input"
					type="text"
					bind:value={query}
					oninput={onInput}
					class="flex-1 bg-transparent text-sm font-medium text-text-primary placeholder:text-text-muted focus:outline-none"
					placeholder="Search medicines, generic salt, batch, customer, supplier, invoice..."
					autocomplete="off"
					spellcheck="false"
				/>

				{#if loading}
					<Loader2 size={16} class="animate-spin text-accent shrink-0" />
				{:else if query}
					<button
						onclick={() => {
							query = '';
							results = [];
						}}
						class="rounded p-1 text-text-muted hover:bg-surface-hover hover:text-text-primary transition-colors"
						aria-label="Clear query"
					>
						<X size={16} />
					</button>
				{/if}

				<button
					onclick={toggleSearch}
					class="hidden sm:inline-flex items-center rounded-md border border-border bg-surface-secondary px-1.5 py-0.5 font-mono text-[10px] font-semibold text-text-muted hover:bg-surface-hover transition-colors"
				>
					ESC
				</button>
			</div>

			<!-- Filter Chips (Visible when searching or has results) -->
			{#if results.length > 0}
				<div class="flex items-center gap-1.5 overflow-x-auto border-b border-border/60 bg-surface-secondary/40 px-4 py-2 text-xs no-scrollbar">
					<SlidersHorizontal size={13} class="text-text-muted mr-1 shrink-0" />
					{#each categories as cat}
						<button
							type="button"
							class="rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all shrink-0
								{activeCategory === cat.id
								? 'bg-accent text-white shadow-2xs'
								: 'bg-surface border border-border text-text-secondary hover:bg-surface-hover hover:text-text-primary'}"
							onclick={() => {
								activeCategory = cat.id;
								selectedIndex = 0;
							}}
						>
							{cat.label}
							{#if cat.id === 'All'}
								<span class="ml-1 opacity-70">({results.length})</span>
							{:else}
								{@const count = results.filter((r) => r.type === cat.id).length}
								{#if count > 0}
									<span class="ml-1 opacity-70">({count})</span>
								{/if}
							{/if}
						</button>
					{/each}
				</div>
			{/if}

			<!-- Results Body -->
			<div
				bind:this={resultsContainerRef}
				class="max-h-[380px] overflow-y-auto p-2 focus:outline-none"
			>
				{#if query.trim().length > 0 && query.trim().length < 2}
					<div class="px-4 py-8 text-center text-xs text-text-muted">
						Type at least <span class="font-semibold text-text-primary">2 characters</span> to search products, customers, suppliers, and bills...
					</div>
				{:else if query.trim().length >= 2 && !loading && filteredResults.length === 0}
					<div class="px-4 py-10 text-center">
						<div class="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-secondary text-text-muted mb-2.5">
							<Search size={18} />
						</div>
						<p class="text-xs font-semibold text-text-primary">No results found for "{query}"</p>
						<p class="mt-1 text-[11px] text-text-muted">
							Try searching by brand name, generic composition, customer phone, or bill number.
						</p>
					</div>
				{:else if filteredResults.length > 0}
					<div class="space-y-1">
						{#each filteredResults as result, i (result.href + i)}
							{@const isSelected = i === selectedIndex}
							{@const badgeInfo = typeBadgeStyles[result.type]}
							<button
								type="button"
								data-selected={isSelected}
								class="group flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-all duration-100
									{isSelected
									? 'bg-accent/10 border border-accent/30 shadow-2xs'
									: 'hover:bg-surface-hover border border-transparent'}"
								onclick={() => selectResult(result.href)}
								onmouseenter={() => (selectedIndex = i)}
							>
								<!-- Icon Badge -->
								<div
									class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow-2xs transition-colors
									{badgeInfo.color}"
								>
									<result.icon size={18} />
								</div>

								<!-- Title and Subtitle -->
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2">
										<h4 class="truncate text-xs font-semibold text-text-primary group-hover:text-accent transition-colors">
											{result.title}
										</h4>
										<span class="rounded px-1.5 py-0.2 text-[9px] font-bold uppercase border {badgeInfo.color}">
											{badgeInfo.label}
										</span>
									</div>
									<p class="truncate text-[11px] text-text-muted mt-0.5">
										{result.subtitle}
									</p>
								</div>

								<!-- Meta tag or Action Arrow -->
								<div class="flex items-center gap-2 shrink-0">
									{#if result.meta}
										<span class="hidden sm:inline-block font-mono text-[10px] font-semibold text-text-muted bg-surface-secondary px-1.5 py-0.5 rounded border border-border">
											{result.meta}
										</span>
									{/if}
									<CornerDownLeft
										size={14}
										class="transition-opacity {isSelected ? 'opacity-100 text-accent' : 'opacity-0'}"
									/>
								</div>
							</button>
						{/each}
					</div>
				{:else}
					<!-- Default Command Palette Quick Links -->
					<div class="p-2">
						<div class="px-3 py-1.5 text-[11px] font-bold text-text-muted uppercase tracking-wider">
							Quick Actions & Modules
						</div>
						<div class="mt-1 space-y-1">
							{#each quickLinks as link, i}
								{@const isSelected = i === selectedIndex}
								<button
									type="button"
									data-selected={isSelected}
									class="group flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-all duration-100
										{isSelected
										? 'bg-accent/10 border border-accent/30 shadow-2xs'
										: 'hover:bg-surface-hover border border-transparent'}"
									onclick={() => selectResult(link.href)}
									onmouseenter={() => (selectedIndex = i)}
								>
									<div
										class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow-2xs {link.badgeColor}"
									>
										<link.icon size={18} />
									</div>
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2">
											<span class="text-xs font-semibold text-text-primary group-hover:text-accent transition-colors">
												{link.title}
											</span>
											<span class="rounded px-1.5 py-0.2 text-[9px] font-bold uppercase border {link.badgeColor}">
												{link.badge}
											</span>
										</div>
										<p class="text-[11px] text-text-muted mt-0.5 truncate">
											{link.subtitle}
										</p>
									</div>
									<CornerDownLeft
										size={14}
										class="transition-opacity shrink-0 {isSelected ? 'opacity-100 text-accent' : 'opacity-0'}"
									/>
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Footer Helper Bar -->
			<div class="flex items-center justify-between border-t border-border/70 bg-surface-secondary/50 px-4 py-2 text-[11px] text-text-muted">
				<div class="flex items-center gap-3">
					<span class="flex items-center gap-1">
						<kbd class="rounded border border-border bg-surface px-1 py-0.5 font-mono text-[9px]">↑</kbd>
						<kbd class="rounded border border-border bg-surface px-1 py-0.5 font-mono text-[9px]">↓</kbd>
						<span class="hidden sm:inline">Navigate</span>
					</span>
					<span class="flex items-center gap-1">
						<kbd class="rounded border border-border bg-surface px-1 py-0.5 font-mono text-[9px]">↵</kbd>
						<span class="hidden sm:inline">Select</span>
					</span>
					<span class="flex items-center gap-1">
						<kbd class="rounded border border-border bg-surface px-1 py-0.5 font-mono text-[9px]">ESC</kbd>
						<span class="hidden sm:inline">Close</span>
					</span>
				</div>
				<div class="font-medium text-text-muted">
					{#if results.length > 0}
						{filteredResults.length} matches
					{:else}
						MedStock ERP
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
