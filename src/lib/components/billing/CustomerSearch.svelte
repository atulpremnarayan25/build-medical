<script lang="ts">
	import type { Customer } from '$lib/types/customer.js';
	import { customerService } from '$lib/services/index.js';
	import { User, UserCheck, AlertCircle, Phone, CreditCard, X } from '@lucide/svelte';

	let {
		onSelect,
		selectedCustomer = $bindable(null),
		inputRef = $bindable()
	}: {
		onSelect: (customer: Customer | null) => void;
		selectedCustomer?: Customer | null;
		inputRef?: HTMLInputElement;
	} = $props();

	let searchQuery = $state('');
	let results = $state<Customer[]>([]);
	let selectedIndex = $state(0);
	let isFocused = $state(false);
	let listRef = $state<HTMLUListElement | null>(null);

	let timeout: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		if (listRef && selectedIndex >= 0 && results.length > 0) {
			// +1 because of static 'Walk-in Customer' row
			const activeItem = listRef.children[selectedIndex + 1] as HTMLElement | undefined;
			if (activeItem) {
				activeItem.scrollIntoView({ block: 'nearest' });
			}
		}
	});

	$effect(() => {
		if (selectedCustomer) {
			searchQuery = selectedCustomer.name;
		} else if (!isFocused && searchQuery !== '') {
			searchQuery = '';
		}
	});

	$effect(() => {
		const query = searchQuery.trim().toLowerCase();
		if (query.length < 2) {
			results = [];
			return;
		}

		clearTimeout(timeout);
		timeout = setTimeout(async () => {
			try {
				const all = await customerService.searchCustomers(query);
				results = all.slice(0, 10);
				selectedIndex = 0;
			} catch (e) {
				console.error(e);
				results = [];
			}
		}, 150);

		return () => {
			clearTimeout(timeout);
		};
	});

	function handleSelect(customer: Customer | null) {
		selectedCustomer = customer;
		searchQuery = customer ? customer.name : '';
		results = [];
		onSelect(customer);
	}

	function handleClear() {
		selectedCustomer = null;
		searchQuery = '';
		results = [];
		onSelect(null);
		inputRef?.focus();
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (!isFocused) return;

		if (results.length > 0) {
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, 0);
			} else if (e.key === 'Enter') {
				e.preventDefault();
				if (selectedIndex >= 0 && selectedIndex < results.length) {
					handleSelect(results[selectedIndex]);
				} else {
					handleSelect(null);
				}
			} else if (e.key === 'Escape') {
				results = [];
			}
		} else if (e.key === 'Enter') {
			e.preventDefault();
			handleSelect(null);
		}
	}
</script>

<div class="relative w-full">
	<div class="relative flex items-center">
		<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
			{#if selectedCustomer}
				<UserCheck size={16} class="text-accent" />
			{:else}
				<User size={16} class="text-text-muted" />
			{/if}
		</div>
		<input
			bind:this={inputRef}
			type="text"
			bind:value={searchQuery}
			onfocus={() => (isFocused = true)}
			onblur={() => setTimeout(() => (isFocused = false), 220)}
			onkeydown={handleKeyDown}
			placeholder="Search customer (F3) or Walk-in..."
			class="w-full rounded-md border border-border bg-surface py-2 pr-16 pl-9 text-xs font-medium text-text-primary placeholder:text-text-muted transition-colors focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
		/>
		<div class="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
			{#if selectedCustomer}
				<button
					type="button"
					onclick={handleClear}
					class="rounded p-1 text-text-muted hover:bg-surface-hover hover:text-text-primary"
					title="Clear customer selection"
				>
					<X size={13} />
				</button>
			{/if}
			<kbd class="pointer-events-none rounded border border-border-strong bg-surface-secondary px-1.5 py-0.5 font-mono text-[10px] font-semibold text-text-muted shadow-2xs">
				F3
			</kbd>
		</div>
	</div>

	<!-- Credit Alert Badge if customer has high outstanding -->
	{#if selectedCustomer && selectedCustomer.outstandingBalance > 0}
		<div class="mt-1 flex items-center justify-between rounded bg-warning-light border border-warning/20 px-2 py-0.5 text-[11px] text-warning">
			<span class="flex items-center gap-1">
				<CreditCard size={12} />
				<span>Outstanding: <strong>₹{selectedCustomer.outstandingBalance.toFixed(2)}</strong></span>
			</span>
			{#if selectedCustomer.creditLimit > 0}
				<span>Limit: ₹{selectedCustomer.creditLimit.toFixed(2)}</span>
			{/if}
		</div>
	{/if}

	{#if isFocused && (results.length > 0 || searchQuery.length > 1)}
		<ul
			bind:this={listRef}
			class="absolute z-50 mt-1 max-h-64 w-full min-w-[280px] overflow-y-auto rounded-lg border border-border bg-surface py-1 text-xs shadow-xl ring-1 ring-black/5 focus:outline-none"
			role="listbox"
		>
			<!-- Walk-in Customer Option -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<li
				class="cursor-pointer border-b border-border-subtle px-3 py-2 text-text-muted italic select-none hover:bg-surface-hover hover:text-text-primary flex items-center justify-between"
				onclick={() => handleSelect(null)}
				role="option"
				aria-selected={!selectedCustomer}
			>
				<span class="flex items-center gap-1.5 font-medium">
					<User size={14} />
					<span>Default Walk-in (Cash Sale)</span>
				</span>
				<kbd class="font-mono text-[10px] text-text-muted border border-border rounded px-1">Enter</kbd>
			</li>

			{#each results as customer, i (customer.id)}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<li
					class="cursor-pointer border-b border-border-subtle px-3 py-2 select-none last:border-0 transition-colors {i ===
					selectedIndex
						? 'bg-accent-light/60 text-text-primary font-medium'
						: 'text-text-primary hover:bg-surface-hover'}"
					onclick={() => handleSelect(customer)}
					role="option"
					aria-selected={i === selectedIndex}
				>
					<div class="flex items-center justify-between">
						<div>
							<div class="font-semibold text-text-primary">{customer.name}</div>
							<div class="flex items-center gap-2 text-[11px] text-text-muted mt-0.5">
								{#if customer.phone}
									<span class="flex items-center gap-0.5">
										<Phone size={10} />
										<span>{customer.phone}</span>
									</span>
								{/if}
								{#if customer.gstin}
									<span>GSTIN: {customer.gstin}</span>
								{/if}
							</div>
						</div>

						{#if customer.outstandingBalance > 0}
							<div class="text-right">
								<div class="font-mono text-[11px] font-bold text-warning">
									₹{customer.outstandingBalance.toFixed(0)}
								</div>
								<div class="text-[9px] text-text-muted">Due</div>
							</div>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
