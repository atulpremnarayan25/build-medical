<script lang="ts">
	import type { Supplier } from '$lib/types/supplier.js';
	import { supplierService } from '$lib/services/index.js';

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
		}, 200);
	}

	function handleSelect(supplier: Supplier | null) {
		selectedSupplier = supplier;
		searchQuery = supplier ? supplier.name : '';
		results = [];
		onSelect(supplier);
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
	<input
		bind:this={inputRef}
		type="text"
		bind:value={searchQuery}
		oninput={handleSearch}
		onfocus={() => (isFocused = true)}
		onblur={() => setTimeout(() => (isFocused = false), 200)}
		onkeydown={handleKeyDown}
		placeholder="Search distributor / supplier (F3)..."
		class="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
	/>

	{#if isFocused && results.length > 0}
		<ul
			bind:this={listRef}
			class="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-surface py-1 text-xs shadow-xl divide-y divide-border/60 focus:outline-none"
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
