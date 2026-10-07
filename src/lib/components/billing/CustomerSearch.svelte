<script lang="ts">
	import type { Customer } from '$lib/types/customer.js';
	import { customerService } from '$lib/services/index.js';
	import { User, UserCheck, Phone, CreditCard, X, UserPlus, ArrowRight } from '@lucide/svelte';
	import { addToast } from '$lib/stores/toastStore.svelte.js';

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
	let isSearching = $state(false);

	// Quick On-The-Fly Customer Creation State
	let isQuickCreateMode = $state(false);
	let newCustomerName = $state('');
	let newCustomerCreditLimit = $state('0');
	let isCreatingCustomer = $state(false);
	let nameInputRef = $state<HTMLInputElement | null>(null);
	let creditInputRef = $state<HTMLInputElement | null>(null);

	let timeout: ReturnType<typeof setTimeout> | undefined;

	const isTenDigitPhone = $derived(/^\d{10}$/.test(searchQuery.trim()));

	$effect(() => {
		if (listRef && selectedIndex >= 0 && results.length > 0) {
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
			isSearching = false;
			isQuickCreateMode = false;
			return;
		}

		isSearching = true;
		clearTimeout(timeout);
		timeout = setTimeout(async () => {
			try {
				const all = await customerService.searchCustomers(query);
				results = all.slice(0, 10);
				selectedIndex = 0;

				// Check if 10-digit mobile number not found in DB
				if (isTenDigitPhone) {
					const exactMatch = results.find((c) => c.phone === query);
					if (!exactMatch) {
						isQuickCreateMode = true;
						setTimeout(() => nameInputRef?.focus(), 50);
					} else {
						isQuickCreateMode = false;
					}
				} else {
					isQuickCreateMode = false;
				}
			} catch (e) {
				console.error(e);
				results = [];
				if (isTenDigitPhone) {
					isQuickCreateMode = true;
					setTimeout(() => nameInputRef?.focus(), 50);
				}
			} finally {
				isSearching = false;
			}
		}, 140);

		return () => {
			clearTimeout(timeout);
		};
	});

	function handleSelect(customer: Customer | null) {
		selectedCustomer = customer;
		searchQuery = customer ? customer.name : '';
		results = [];
		isQuickCreateMode = false;
		onSelect(customer);
	}

	function handleClear() {
		selectedCustomer = null;
		searchQuery = '';
		results = [];
		isQuickCreateMode = false;
		onSelect(null);
		inputRef?.focus();
	}

	async function submitQuickCreate() {
		const name = newCustomerName.trim();
		const phone = searchQuery.trim();
		if (!name) {
			addToast('error', 'Please enter customer name');
			nameInputRef?.focus();
			return;
		}

		isCreatingCustomer = true;
		try {
			const created = await customerService.createCustomer({
				name,
				phone,
				creditLimit: Math.max(0, Number(newCustomerCreditLimit) || 0),
				active: true
			});
			addToast('success', `Customer ${created.name} created and attached!`);
			handleSelect(created);
			newCustomerName = '';
			newCustomerCreditLimit = '0';
			isQuickCreateMode = false;
		} catch (e: any) {
			console.error(e);
			addToast('error', e.message || 'Failed to create customer');
		} finally {
			isCreatingCustomer = false;
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (isQuickCreateMode) return;
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
			if (isTenDigitPhone) {
				isQuickCreateMode = true;
				setTimeout(() => nameInputRef?.focus(), 50);
			} else {
				handleSelect(null);
			}
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
			onblur={() => setTimeout(() => {
				if (!isQuickCreateMode) isFocused = false;
			}, 250)}
			onkeydown={handleKeyDown}
			placeholder="Search customer by Name / Phone (F3)..."
			class="w-full rounded-md border border-border bg-surface py-2 pr-16 pl-9 text-xs font-medium text-text-primary placeholder:text-text-muted transition-colors focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
		/>
		<div class="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
			{#if isSearching}
				<span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent"></span>
			{/if}
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

	<!-- ON-THE-FLY CUSTOMER CREATION PROMPT (TASK 4) -->
	{#if isQuickCreateMode}
		<div
			class="absolute z-50 mt-1 w-full rounded-lg border-2 border-accent bg-surface p-3 text-xs shadow-2xl ring-1 ring-black/10 focus:outline-none animate-in fade-in duration-150"
		>
			<div class="flex items-center justify-between pb-2 mb-2 border-b border-border">
				<div class="flex items-center gap-1.5 font-bold text-accent">
					<UserPlus size={14} />
					<span>New Customer Detected:</span>
					<span class="font-mono bg-accent-light px-1.5 py-0.5 rounded text-accent font-semibold">{searchQuery}</span>
				</div>
				<button
					type="button"
					onclick={() => {
						isQuickCreateMode = false;
						inputRef?.focus();
					}}
					class="text-text-muted hover:text-text-primary text-[10px]"
				>
					✕ Esc
				</button>
			</div>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					submitQuickCreate();
				}}
				class="space-y-2.5"
			>
				<div>
					<label for="new-customer-name" class="block text-[11px] font-semibold text-text-muted mb-0.5">Customer Name *</label>
					<input
						id="new-customer-name"
						bind:this={nameInputRef}
						type="text"
						bind:value={newCustomerName}
						placeholder="e.g. Ramesh Kumar"
						class="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
						onkeydown={(e) => {
							if (e.key === 'Escape') {
								isQuickCreateMode = false;
								inputRef?.focus();
							}
						}}
					/>
				</div>

				<div>
					<label for="new-customer-credit" class="block text-[11px] font-semibold text-text-muted mb-0.5">Credit Limit (₹)</label>
					<input
						id="new-customer-credit"
						bind:this={creditInputRef}
						type="number"
						bind:value={newCustomerCreditLimit}
						placeholder="0"
						min="0"
						step="500"
						class="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-xs font-mono text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
						onkeydown={(e) => {
							if (e.key === 'Escape') {
								isQuickCreateMode = false;
								inputRef?.focus();
							}
						}}
					/>
				</div>

				<div class="flex items-center justify-between pt-1">
					<span class="text-[10px] text-text-muted">Press Enter to save</span>
					<button
						type="submit"
						disabled={isCreatingCustomer}
						class="inline-flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-accent-hover focus:outline-none disabled:opacity-50"
					>
						{#if isCreatingCustomer}
							<span class="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
							<span>Saving...</span>
						{:else}
							<span>Create & Attach</span>
							<ArrowRight size={12} />
						{/if}
					</button>
				</div>
			</form>
		</div>

	<!-- REGULAR SEARCH DROPDOWN -->
	{:else if isFocused && (results.length > 0 || searchQuery.length > 1)}
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

			{#if isTenDigitPhone && results.length === 0 && !isSearching}
				<div class="p-3 text-center">
					<button
						type="button"
						onclick={() => {
							isQuickCreateMode = true;
							setTimeout(() => nameInputRef?.focus(), 50);
						}}
						class="w-full inline-flex items-center justify-center gap-1.5 rounded bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover"
					>
						<UserPlus size={13} />
						<span>Create Customer for {searchQuery}</span>
					</button>
				</div>
			{/if}
		</ul>
	{/if}
</div>
