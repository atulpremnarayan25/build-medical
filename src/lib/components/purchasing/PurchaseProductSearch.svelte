<script lang="ts">
	import type { Product } from '$lib/types/product.js';
	import { productService } from '$lib/services/index.js';
	import { Search } from '@lucide/svelte';

	let {
		onSelect,
		inputRef = $bindable()
	}: {
		onSelect: (product: Product) => void;
		inputRef?: HTMLInputElement;
	} = $props();

	let searchQuery = $state('');
	let results = $state<Product[]>([]);
	let selectedIndex = $state(0);
	let isFocused = $state(false);
	let listRef = $state<HTMLUListElement | null>(null);

	let timeout: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		if (listRef && selectedIndex >= 0 && results.length > 0) {
			const activeItem = listRef.children[selectedIndex] as HTMLElement | undefined;
			if (activeItem) {
				activeItem.scrollIntoView({ block: 'nearest' });
			}
		}
	});

	async function handleSearch() {
		if (searchQuery.length < 2) {
			results = [];
			return;
		}
		clearTimeout(timeout);
		timeout = setTimeout(async () => {
			const query = searchQuery.toLowerCase();
			const all = await productService.searchProducts(query);
			results = all.slice(0, 10);
			selectedIndex = 0;
		}, 200);
	}

	function selectProduct(product: Product) {
		onSelect(product);
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
			selectProduct(results[selectedIndex]);
		} else if (e.key === 'Escape') {
			results = [];
			searchQuery = '';
		}
	}
</script>

<div class="relative w-full">
	<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
		<Search size={16} />
	</div>
	<input
		bind:this={inputRef}
		type="text"
		bind:value={searchQuery}
		oninput={handleSearch}
		onfocus={() => (isFocused = true)}
		onblur={() => setTimeout(() => (isFocused = false), 200)}
		onkeydown={handleKeyDown}
		placeholder="Search product by brand, generic, or scan barcode (Press F2)..."
		class="block w-full rounded-lg border-2 border-accent/40 bg-surface py-2.5 pr-10 pl-9.5 text-xs font-semibold text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
	/>
	<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
		<kbd class="rounded border border-border bg-surface-secondary px-1.5 py-0.5 font-mono text-[10px] text-text-muted">F2</kbd>
	</div>

	{#if isFocused && results.length > 0}
		<ul
			bind:this={listRef}
			class="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-surface py-1 text-xs shadow-xl divide-y divide-border/60 focus:outline-none"
		>
			{#each results as product, i (product.id)}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<li
					class="relative cursor-pointer px-3 py-2 select-none {i === selectedIndex
						? 'bg-accent/15 text-accent-hover font-medium'
						: 'text-text-primary hover:bg-surface-hover'}"
					onclick={() => selectProduct(product)}
				>
					<div class="flex items-center justify-between">
						<div>
							<div class="font-bold text-text-primary">{product.name}</div>
							<div class="text-[11px] text-text-muted">
								{product.genericName || 'No salt specified'} • <span class="font-medium text-text-secondary">{product.manufacturer || 'General'}</span>
								{#if product.hsnCode}
									<span class="ml-1 font-mono text-[10px] text-text-muted">HSN: {product.hsnCode}</span>
								{/if}
							</div>
						</div>
						<div class="flex flex-col items-end text-right">
							<div class="font-mono text-xs font-bold text-text-primary tabular-nums">MRP ₹{product.mrp.toFixed(2)}</div>
							<div class="font-mono text-[10px] text-text-muted tabular-nums">GST {product.gstRate}%</div>
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
