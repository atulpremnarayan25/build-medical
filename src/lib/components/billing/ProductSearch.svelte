<script lang="ts">
	import type { Product } from '$lib/types/product.js';
	import { productService, batchService } from '$lib/services/index.js';
	import type { Batch } from '$lib/types/batch.js';
	import { Search, Pill, ShieldAlert, AlertTriangle, ArrowLeft, Check, AlertCircle } from '@lucide/svelte';
	import { addToast } from '$lib/stores/toastStore.svelte.js';

	let {
		onSelectBatch,
		onSelect,
		inputRef = $bindable()
	}: {
		onSelectBatch?: (product: Product, batch: Batch) => void;
		onSelect?: (product: Product, batches: Batch[]) => void;
		inputRef?: HTMLInputElement;
	} = $props();

	let searchQuery = $state('');
	let results = $state<Product[]>([]);
	let selectedIndex = $state(0);
	let isFocused = $state(false);
	let listRef = $state<HTMLUListElement | null>(null);
	let batchListRef = $state<HTMLTableSectionElement | null>(null);
	let isLoading = $state(false);

	// Batch selection sub-dropdown state
	let selectionMode = $state<'products' | 'batches'>('products');
	let activeProduct = $state<Product | null>(null);
	let candidateBatches = $state<Batch[]>([]);
	let selectedBatchIndex = $state(0);

	let timeout: ReturnType<typeof setTimeout> | undefined;

	function isExpired(expiryDate: string): boolean {
		try {
			const expiry = new Date(expiryDate).getTime();
			const today = new Date().setHours(0, 0, 0, 0);
			return expiry <= today;
		} catch {
			return false;
		}
	}

	function getDaysToExpiry(expiryDate: string): number {
		try {
			const expiry = new Date(expiryDate).getTime();
			const today = new Date().setHours(0, 0, 0, 0);
			return Math.round((expiry - today) / (1000 * 60 * 60 * 24));
		} catch {
			return 999;
		}
	}

	function formatExpiryDate(dateStr: string): string {
		try {
			const d = new Date(dateStr);
			return d.toLocaleDateString('en-IN', { month: '2-digit', year: '2-digit' });
		} catch {
			return dateStr.substring(0, 7);
		}
	}

	$effect(() => {
		if (selectionMode === 'products' && listRef && selectedIndex >= 0 && results.length > 0) {
			const activeItem = listRef.children[selectedIndex] as HTMLElement | undefined;
			if (activeItem) {
				activeItem.scrollIntoView({ block: 'nearest' });
			}
		}
	});

	$effect(() => {
		if (selectionMode === 'batches' && batchListRef && selectedBatchIndex >= 0 && candidateBatches.length > 0) {
			const activeItem = batchListRef.children[selectedBatchIndex] as HTMLElement | undefined;
			if (activeItem) {
				activeItem.scrollIntoView({ block: 'nearest' });
			}
		}
	});

	$effect(() => {
		if (selectionMode === 'batches') return;

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
		}, 120);

		return () => {
			clearTimeout(timeout);
		};
	});

	async function selectProduct(product: Product) {
		isLoading = true;
		try {
			const allBatches = await batchService.getBatchesByProduct(product.id);
			// Sort FEFO (earliest expiry first)
			const sorted = allBatches.sort(
				(a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
			);

			// Active batches: quantity > 0 and not expired
			const active = sorted.filter((b) => b.quantity > 0 && !isExpired(b.expiryDate));

			if (active.length === 1 && onSelectBatch) {
				// Rule 2: If only 1 active batch exists, auto-select it immediately
				onSelectBatch(product, active[0]);
				onSelect?.(product, allBatches);
				resetSearch();
			} else if (sorted.length > 0) {
				if (!onSelectBatch && onSelect) {
					onSelect(product, sorted);
					resetSearch();
					return;
				}
				// Rule 2: Multiple batches exist -> render inline sub-dropdown
				activeProduct = product;
				candidateBatches = sorted;
				selectionMode = 'batches';
				// Point to first selectable batch
				const firstSelectable = sorted.findIndex((b) => b.quantity > 0 && !isExpired(b.expiryDate));
				selectedBatchIndex = firstSelectable >= 0 ? firstSelectable : 0;
			} else {
				addToast('error', `No stock available in any batch for ${product.name}`);
				resetSearch();
			}
		} catch (e) {
			console.error(e);
			addToast('error', 'Failed to load batches');
		} finally {
			isLoading = false;
		}
	}

	function selectBatch(batch: Batch) {
		if (!activeProduct) return;
		if (isExpired(batch.expiryDate) || batch.status === 'expired') {
			addToast('error', 'Expired batch cannot be billed! Select an active batch.');
			return;
		}
		if (batch.quantity <= 0) {
			addToast('error', 'Batch has 0 available units in stock.');
			return;
		}

		onSelectBatch?.(activeProduct, batch);
		onSelect?.(activeProduct, candidateBatches);
		resetSearch();
	}

	function resetSearch() {
		searchQuery = '';
		results = [];
		candidateBatches = [];
		activeProduct = null;
		selectionMode = 'products';
		selectedIndex = 0;
		selectedBatchIndex = 0;
		isFocused = false;
	}

	function backToProductSearch() {
		selectionMode = 'products';
		candidateBatches = [];
		activeProduct = null;
		selectedBatchIndex = 0;
		inputRef?.focus();
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (selectionMode === 'batches') {
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				selectedBatchIndex = Math.min(selectedBatchIndex + 1, candidateBatches.length - 1);
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				selectedBatchIndex = Math.max(selectedBatchIndex - 1, 0);
			} else if (e.key === 'Enter') {
				e.preventDefault();
				if (candidateBatches[selectedBatchIndex]) {
					selectBatch(candidateBatches[selectedBatchIndex]);
				}
			} else if (e.key === 'Escape') {
				e.preventDefault();
				backToProductSearch();
			}
			return;
		}

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
			e.preventDefault();
			resetSearch();
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
			onfocus={() => {
				isFocused = true;
				if (selectionMode === 'batches') selectionMode = 'products';
			}}
			onblur={() => setTimeout(() => {
				if (selectionMode === 'products') isFocused = false;
			}, 250)}
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

	<!-- SUB-DROPDOWN: Mode 2 - INLINE CANDIDATE BATCHES TABLE -->
	{#if selectionMode === 'batches' && activeProduct}
		<div
			class="absolute z-50 mt-1 max-h-80 w-full overflow-hidden rounded-lg border-2 border-accent bg-surface text-xs shadow-2xl ring-1 ring-black/10 focus:outline-none animate-in fade-in slide-in-from-top-1 duration-150"
		>
			<!-- Batch Selection Header -->
			<div class="flex items-center justify-between border-b border-border bg-accent/10 px-3.5 py-2">
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={backToProductSearch}
						class="flex items-center gap-1 rounded bg-surface border border-border px-1.5 py-0.5 text-[11px] font-semibold text-text-secondary hover:bg-surface-hover hover:text-text-primary"
						title="Back to product search (Esc)"
					>
						<ArrowLeft size={12} />
						<span>Esc</span>
					</button>
					<span class="font-bold text-text-primary text-sm">{activeProduct.name}</span>
					{#if activeProduct.drugSchedule && activeProduct.drugSchedule !== 'none'}
						<span class="rounded px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-wider
							{activeProduct.drugSchedule === 'H1' || activeProduct.drugSchedule === 'X'
								? 'bg-danger-light text-danger border border-danger/20'
								: 'bg-warning-light text-warning border border-warning/20'}">
							Sch {activeProduct.drugSchedule}
						</span>
					{/if}
					<span class="text-[11px] text-text-muted">
						({candidateBatches.length} {candidateBatches.length === 1 ? 'batch' : 'batches'} found)
					</span>
				</div>
				<div class="flex items-center gap-2 text-[11px] font-semibold text-accent">
					<span>FEFO Ranked</span>
					<kbd class="font-mono text-[10px] bg-surface px-1 py-0.5 rounded border border-border text-text-muted">↑↓ to navigate</kbd>
					<kbd class="font-mono text-[10px] bg-surface px-1 py-0.5 rounded border border-border text-text-muted">Enter to select</kbd>
				</div>
			</div>

			<!-- Inline Batches Table -->
			<div class="max-h-60 overflow-y-auto">
				<table class="w-full text-left text-xs">
					<thead class="sticky top-0 border-b border-border bg-surface-secondary text-[11px] font-semibold text-text-muted uppercase tracking-wider">
						<tr>
							<th class="px-3.5 py-2">Batch No</th>
							<th class="px-3 py-2 text-center">Expiry Date</th>
							<th class="px-3 py-2 text-right">Stock Units</th>
							<th class="px-3 py-2 text-right">MRP (₹)</th>
							<th class="px-3.5 py-2 text-right">Sale Rate (₹)</th>
							<th class="w-12 px-2 py-2 text-center">Status</th>
						</tr>
					</thead>
					<tbody bind:this={batchListRef} class="divide-y divide-border-subtle">
						{#each candidateBatches as batch, bIdx (batch.id)}
							{@const expired = isExpired(batch.expiryDate) || batch.status === 'expired'}
							{@const daysToExpiry = getDaysToExpiry(batch.expiryDate)}
							{@const nearExpiry = !expired && daysToExpiry <= 90}
							{@const isSelected = bIdx === selectedBatchIndex}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<tr
								class="cursor-pointer select-none transition-colors
									{isSelected ? 'bg-accent-light/80 text-text-primary font-medium ring-1 ring-accent inset-0' : 'hover:bg-surface-hover/80'}
									{expired ? 'bg-danger-light/10 text-danger/80 cursor-not-allowed opacity-75' : ''}"
								onclick={() => selectBatch(batch)}
							>
								<!-- Batch No -->
								<td class="px-3.5 py-2">
									<div class="flex items-center gap-1.5 font-mono font-bold {expired ? 'line-through text-danger' : 'text-text-primary'}">
										<span>{batch.batchNumber}</span>
									</div>
								</td>

								<!-- Expiry Date with Color Coding -->
								<td class="px-3 py-2 text-center font-mono">
									{#if expired}
										<span class="inline-flex items-center gap-1 rounded bg-danger-light border border-danger/30 px-1.5 py-0.5 text-[11px] font-bold text-danger">
											<AlertCircle size={10} />
											<span>{formatExpiryDate(batch.expiryDate)} (EXPIRED)</span>
										</span>
									{:else if nearExpiry}
										<span class="inline-flex items-center gap-1 rounded bg-warning-light border border-warning/30 px-1.5 py-0.5 text-[11px] font-bold text-warning">
											<AlertTriangle size={10} />
											<span>{formatExpiryDate(batch.expiryDate)} ({daysToExpiry}d left)</span>
										</span>
									{:else}
										<span class="text-text-primary font-medium">{formatExpiryDate(batch.expiryDate)}</span>
									{/if}
								</td>

								<!-- Stock Units -->
								<td class="px-3 py-2 text-right font-mono font-bold tabular-nums">
									<span class="{batch.quantity <= 0 ? 'text-danger' : 'text-text-primary'}">
										{batch.quantity}
									</span>
								</td>

								<!-- MRP -->
								<td class="px-3 py-2 text-right font-mono text-text-muted tabular-nums">
									₹{batch.mrp.toFixed(2)}
								</td>

								<!-- Sale Rate -->
								<td class="px-3.5 py-2 text-right font-mono font-bold text-accent tabular-nums">
									₹{batch.sellingRate.toFixed(2)}
								</td>

								<!-- Status / Select Action -->
								<td class="px-2 py-2 text-center">
									{#if expired}
										<span class="rounded bg-danger text-white px-1 py-0.2 text-[9px] font-black uppercase">
											Blocked
										</span>
									{:else if isSelected}
										<span class="inline-flex items-center justify-center rounded-full bg-accent text-white h-4 w-4">
											<Check size={11} />
										</span>
									{:else}
										<span class="text-[10px] text-text-muted font-mono">Pick</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="flex items-center justify-between border-t border-border bg-surface-secondary px-3 py-1.5 text-[11px] text-text-muted">
				<span class="text-danger font-semibold">
					{#if candidateBatches.some((b) => isExpired(b.expiryDate))}
						⚠️ Expired batches cannot be dispensed (Statutory Drug Rules).
					{:else}
						FEFO order: earliest expiry dispensed first.
					{/if}
				</span>
				<button type="button" onclick={backToProductSearch} class="text-accent hover:underline font-medium">
					← Return to search (Esc)
				</button>
			</div>
		</div>

	<!-- SUB-DROPDOWN: Mode 1 - MEDICINE SEARCH RESULTS -->
	{:else if selectionMode === 'products' && (isFocused || searchQuery.trim().length >= 2) && results.length > 0}
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
					<kbd class="rounded border border-border-strong bg-surface px-1 text-[11px] font-mono">Enter</kbd> pick / see batches
					<kbd class="rounded border border-border-strong bg-surface px-1 text-[11px] font-mono">Esc</kbd> dismiss
				</span>
			</div>
		</ul>
	{:else if selectionMode === 'products' && isFocused && searchQuery.trim().length >= 2 && results.length === 0 && !isLoading}
		<div class="absolute z-50 mt-1 w-full rounded-lg border border-border bg-surface p-4 text-center text-sm text-text-muted shadow-xl">
			<AlertCircle size={20} class="mx-auto mb-1 text-text-muted" />
			<p>No products found matching "<span class="font-semibold text-text-primary">{searchQuery}</span>"</p>
			<p class="text-xs mt-1">Check the spelling or add as a new product in Inventory.</p>
		</div>
	{/if}
</div>
