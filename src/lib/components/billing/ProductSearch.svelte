<script lang="ts">
	import type { Product } from '$lib/types/product.js';
	import { productService, batchService } from '$lib/services/index.js';
	import type { Batch } from '$lib/types/batch.js';
	import { Search, Pill, ShieldAlert, Sparkles, AlertCircle } from '@lucide/svelte';

	let {
		onSelect,
		inputRef = $bindable()
	}: {
		onSelect: (product: Product, batches: Batch[]) => void;
		inputRef?: HTMLInputElement;
	} = $props();

	let searchQuery = $state('');
	let results = $state<Product[]>([]);
	let selectedIndex = $state(0);
	let isFocused = $state(false);
	let listRef = $state<HTMLUListElement | null>(null);
	let isLoading = $state(false);

	let timeout: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		if (listRef && selectedIndex >= 0 && results.length > 0) {
			const activeItem = listRef.children[selectedIndex] as HTMLElement | undefined;
			if (activeItem) {
				activeItem.scrollIntoView({ block: 'nearest' });
			}
		}
	});

	$effect(() => {
		const query = searchQuery.trim().toLowerCase();
		if (query.length < 2) {
			results = [];
			isLoading = false;
			return;
		}

		isLoading = true;
		clearTimeout(timeout);
		timeout = setTimeout(async () => {
			try {
				const all = await productService.searchProducts(query);
				results = all.slice(0, 12);
				selectedIndex = 0;
			} catch (e) {
				console.error(e);
				results = [];
			} finally {
				isLoading = false;
			}
		}, 150);

		return () => {
			clearTimeout(timeout);
		};
	});

	async function selectProduct(product: Product) {
		try {
			const productBatches = await batchService.getBatchesByProduct(product.id);
			onSelect(product, productBatches);
		} catch (e) {
			console.error(e);
		}
		searchQuery = '';
		results = [];
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (!isFocused || results.length === 0) return;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, 0);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (results[selectedIndex]) {
				selectProduct(results[selectedIndex]);
			}
		} else if (e.key === 'Escape') {
			results = [];
			searchQuery = '';
		}
	}
</script>

<div class="relative w-full">
	<div class="relative flex items-center">
		<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-muted">
			<Search size={18} class="text-accent" />
		</div>
		<input
			bind:this={inputRef}
			type="text"
			bind:value={searchQuery}
			onfocus={() => (isFocused = true)}
			onblur={() => setTimeout(() => (isFocused = false), 220)}
			onkeydown={handleKeyDown}
			placeholder="Search medicine by Brand, Composition, Generic or Barcode (F2)..."
			class="block w-full rounded-lg border border-border bg-surface py-2.5 pr-20 pl-11 text-sm font-medium text-text-primary placeholder:text-text-muted transition-all duration-150 ease-in-out focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none"
		/>
		<div class="absolute inset-y-0 right-0 flex items-center pr-3 gap-1.5 pointer-events-none">
			{#if isLoading}
				<span class="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent"></span>
			{/if}
			<kbd class="hidden sm:inline-flex items-center rounded border border-border-strong bg-surface-secondary px-2 py-0.5 font-mono text-[11px] font-semibold text-text-muted shadow-2xs">
				F2
			</kbd>
		</div>
	</div>

	{#if (isFocused || searchQuery.trim().length >= 2) && results.length > 0}
		<ul
			bind:this={listRef}
			class="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-surface py-1 text-sm shadow-xl ring-1 ring-black/5 focus:outline-none"
			role="listbox"
		>
			{#each results as product, i (product.id)}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<li
					class="group relative cursor-pointer border-b border-border-subtle px-3.5 py-2.5 select-none last:border-0 transition-colors {i ===
					selectedIndex
						? 'bg-accent-light/60 text-text-primary'
						: 'text-text-primary hover:bg-surface-hover'}"
					onclick={() => selectProduct(product)}
					role="option"
					aria-selected={i === selectedIndex}
				>
					<div class="flex items-center justify-between gap-3">
						<!-- Left details -->
						<div class="flex min-w-0 items-start gap-2.5">
							<div class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md {i === selectedIndex ? 'bg-accent text-white' : 'bg-surface-secondary text-text-muted group-hover:bg-accent/10 group-hover:text-accent'}">
								<Pill size={15} />
							</div>
							<div class="min-w-0">
								<div class="flex items-center gap-2">
									<span class="truncate font-semibold text-text-primary">{product.name}</span>
									{#if product.drugSchedule && product.drugSchedule !== 'none'}
										<span class="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider
											{product.drugSchedule === 'H1' || product.drugSchedule === 'X'
												? 'bg-danger-light text-danger border border-danger/20'
												: 'bg-warning-light text-warning border border-warning/20'}">
											<ShieldAlert size={11} />
											<span>Sch {product.drugSchedule}</span>
										</span>
									{/if}
									{#if product.category}
										<span class="hidden rounded bg-surface-secondary px-1.5 py-0.5 text-[11px] font-medium text-text-muted sm:inline-block">
											{product.category}
										</span>
									{/if}
								</div>
								<div class="truncate text-xs text-text-muted">
									{product.genericName || 'No Generic'} • {product.manufacturer || 'General'}
									{#if product.packSize && product.packSize > 1}
										<span class="font-medium text-text-secondary">({product.packSize}/pack)</span>
									{/if}
								</div>
							</div>
						</div>

						<!-- Right pricing & stock -->
						<div class="flex shrink-0 items-center gap-4 text-right">
							<div class="hidden sm:block text-right">
								<div class="text-[11px] text-text-muted">MRP ₹{product.mrp?.toFixed(2) || '0.00'}</div>
								<div class="text-[11px] text-text-muted">GST {product.gstRate}%</div>
							</div>
							<div>
								<div class="font-mono text-sm font-bold text-accent tabular-nums">
									₹{product.sellingRate.toFixed(2)}
								</div>
								<div class="text-[11px] text-text-muted">Rate</div>
							</div>
						</div>
					</div>
				</li>
			{/each}

			<div class="flex items-center justify-between border-t border-border bg-surface-secondary px-3 py-1.5 text-[11px] text-text-muted">
				<span>Showing top {results.length} matches</span>
				<span class="flex items-center gap-1.5">
					<kbd class="rounded border border-border-strong bg-surface px-1 text-[11px] font-mono">↑↓</kbd> navigate
					<kbd class="rounded border border-border-strong bg-surface px-1 text-[11px] font-mono">Enter</kbd> select
					<kbd class="rounded border border-border-strong bg-surface px-1 text-[11px] font-mono">Esc</kbd> dismiss
				</span>
			</div>
		</ul>
	{:else if isFocused && searchQuery.trim().length >= 2 && results.length === 0 && !isLoading}
		<div class="absolute z-50 mt-1 w-full rounded-lg border border-border bg-surface p-4 text-center text-sm text-text-muted shadow-xl">
			<AlertCircle size={20} class="mx-auto mb-1 text-text-muted" />
			<p>No products found matching "<span class="font-semibold text-text-primary">{searchQuery}</span>"</p>
			<p class="text-xs mt-1">Check the spelling or add as a new product in Inventory.</p>
		</div>
	{/if}
</div>
