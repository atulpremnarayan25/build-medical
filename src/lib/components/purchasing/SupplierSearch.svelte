<script lang="ts">
	import type { Supplier } from '$lib/types/supplier.js';
	import { supplierService } from '$lib/services/index.js';
	import { Truck, CheckCircle2, X } from '@lucide/svelte';

	let {
		onSelect,
		selectedSupplier = $bindable(null),
		inputRef = $bindable()
	}: {
		onSelect: (supplier: Supplier | null) => void;
		selectedSupplier?: Supplier | null;
		inputRef?: HTMLInputElement;
	} = $props();

	let searchQuery = $state('');
	let results = $state<Supplier[]>([]);
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

	// Keep query in sync if it is cleared remotely
	$effect(() => {
		if (selectedSupplier) {
			searchQuery = selectedSupplier.name;
		} else if (!isFocused && searchQuery !== '') {
			searchQuery = '';
		}
	});

	async function handleSearch() {
		if (searchQuery.length < 2) {
			results = [];
			return;
		}

		selectedSupplier = null;

		clearTimeout(timeout);
		timeout = setTimeout(async () => {
			const query = searchQuery.toLowerCase();
			const all = await supplierService.searchSuppliers(query);
			results = all.slice(0, 10);
			selectedIndex = 0;
		}, 180);
	}

	function handleSelect(supplier: Supplier | null) {
		selectedSupplier = supplier;
		searchQuery = supplier ? supplier.name : '';
		results = [];
		onSelect(supplier);
	}

	function handleClear() {
		selectedSupplier = null;
		searchQuery = '';
		results = [];
		onSelect(null);
		inputRef?.focus();
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
			handleSelect(results[selectedIndex]);
		} else if (e.key === 'Escape') {
			results = [];
		}
	}
</script>

<div class="relative w-full">
	<div class="relative flex items-center">
		<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-text-muted">
			{#if selectedSupplier}
				<CheckCircle2 size={15} class="text-accent" />
			{:else}
				<Truck size={15} class="text-text-muted" />
			{/if}
		</div>
		<input
			bind:this={inputRef}
			type="text"
			bind:value={searchQuery}
			oninput={handleSearch}
			onfocus={() => {
				isFocused = true;
				if (selectedSupplier) {
					setTimeout(() => inputRef?.select(), 10);
				}
			}}
			onblur={() => setTimeout(() => (isFocused = false), 250)}
			onkeydown={handleKeyDown}
			placeholder="Search distributor / supplier (F3)..."
			class="w-full rounded border border-border bg-surface py-1.5 pr-14 pl-8 text-xs text-text-primary placeholder:text-text-muted transition-colors focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
		/>
		<div class="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
			{#if selectedSupplier}
				<button
					type="button"
					onclick={handleClear}
					class="rounded p-0.5 text-text-muted hover:bg-surface-hover hover:text-text-primary"
					title="Clear supplier selection"
					aria-label="Clear supplier selection"
				>
					<X size={13} />
				</button>
			{/if}
			<kbd class="pointer-events-none rounded border border-border bg-surface-secondary px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
				F3
			</kbd>
		</div>
	</div>

	{#if selectedSupplier}
		<div class="mt-1 flex flex-wrap items-center justify-between rounded bg-accent/10 border border-accent/20 px-2 py-0.5 text-[11px] text-accent">
			<span class="truncate font-semibold">{selectedSupplier.name}</span>
			{#if selectedSupplier.gstNumber}
				<span class="font-mono text-[10px] text-text-muted">GST: {selectedSupplier.gstNumber}</span>
			{/if}
		</div>
	{/if}

	{#if isFocused && results.length > 0}
		<ul
			bind:this={listRef}
			class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-surface py-1 text-xs shadow-xl divide-y divide-border/60 focus:outline-none"
		>
			{#each results as supplier, i (supplier.id)}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<li
					class="relative cursor-pointer px-3 py-2 select-none {i === selectedIndex
						? 'bg-accent/15 text-accent-hover font-medium'
						: 'text-text-primary hover:bg-surface-hover'}"
					onclick={() => handleSelect(supplier)}
				>
					<div class="flex flex-col">
						<div class="font-bold text-text-primary">{supplier.name}</div>
						<div class="text-[11px] text-text-muted">
							{supplier.phone || 'No phone'} • {supplier.address || 'No location'}
							{#if supplier.gstNumber}
								<span class="ml-1 font-mono text-[10px] text-text-muted">GSTIN: {supplier.gstNumber}</span>
							{/if}
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
