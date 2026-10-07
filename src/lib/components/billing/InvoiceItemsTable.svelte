<script lang="ts">
	import type { CreateSaleItemInput } from '$lib/types/sale.js';
	import { Trash2, Pill, ShieldAlert, AlertTriangle } from '@lucide/svelte';

	let {
		items = $bindable(),
		onRemoveItem,
		onFocusSearch,
		activeIndex = $bindable(0)
	}: {
		items: (CreateSaleItemInput & {
			uiKey: number;
			drugSchedule?: string;
			availableStock?: number;
			genericName?: string;
			rackLocation?: string;
			hsnCode?: string;
		})[];
		onRemoveItem: (index: number) => void;
		onFocusSearch?: () => void;
		activeIndex?: number;
	} = $props();

	function handleQtyKeyDown(e: KeyboardEvent, index: number) {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (onFocusSearch) {
				onFocusSearch();
			} else {
				const searchInput = document.querySelector(
					'input[placeholder*="Search medicine"]'
				) as HTMLInputElement;
				if (searchInput) {
					searchInput.focus();
					searchInput.select();
				}
			}
		} else if (e.key === 'ArrowDown') {
			if (index < items.length - 1) {
				e.preventDefault();
				activeIndex = index + 1;
				const nextQty = document.querySelector(`.qty-input-${index + 1}`) as HTMLInputElement;
				if (nextQty) {
					nextQty.focus();
					nextQty.select();
				}
			}
		} else if (e.key === 'ArrowUp') {
			if (index > 0) {
				e.preventDefault();
				activeIndex = index - 1;
				const prevQty = document.querySelector(`.qty-input-${index - 1}`) as HTMLInputElement;
				if (prevQty) {
					prevQty.focus();
					prevQty.select();
				}
			}
		} else if ((e.ctrlKey || e.metaKey) && (e.key === 'Delete' || e.key === 'Backspace')) {
			e.preventDefault();
			onRemoveItem(index);
		}
	}

	function handleRateKeyDown(e: KeyboardEvent, index: number) {
		if (e.key === 'Enter') {
			e.preventDefault();
			const disInput = document.querySelector(`.dis-input-${index}`) as HTMLInputElement;
			if (disInput) {
				disInput.focus();
				disInput.select();
			}
		} else if ((e.ctrlKey || e.metaKey) && (e.key === 'Delete' || e.key === 'Backspace')) {
			e.preventDefault();
			onRemoveItem(index);
		}
	}

	function handleDiscountKeyDown(e: KeyboardEvent, index: number) {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (onFocusSearch) {
				onFocusSearch();
			} else {
				const searchInput = document.querySelector(
					'input[placeholder*="Search medicine"]'
				) as HTMLInputElement;
				if (searchInput) {
					searchInput.focus();
					searchInput.select();
				}
			}
		} else if ((e.ctrlKey || e.metaKey) && (e.key === 'Delete' || e.key === 'Backspace')) {
			e.preventDefault();
			onRemoveItem(index);
		}
	}

	function formatExpiry(dateStr?: string) {
		if (!dateStr) return '-';
		try {
			const d = new Date(dateStr);
			return d.toLocaleDateString('en-IN', { month: '2-digit', year: '2-digit' });
		} catch {
			return dateStr.substring(0, 7);
		}
	}
</script>

<div class="flex-1 overflow-auto border-x border-border bg-surface select-none">
	<table class="w-full text-left align-middle text-xs border-collapse">
		<thead class="sticky top-0 z-10 border-b border-border bg-surface-secondary text-[11px] font-semibold text-text-muted uppercase tracking-wider shadow-2xs h-7">
			<tr>
				<th class="w-8 px-2 py-1 text-center">#</th>
				<th class="px-2.5 py-1">Medicine Description</th>
				<th class="w-24 px-2 py-1">Batch</th>
				<th class="w-16 px-1.5 py-1 text-center">Exp</th>
				<th class="w-20 px-1.5 py-1 text-right">Qty</th>
				<th class="w-20 px-2 py-1 text-right">MRP (₹)</th>
				<th class="w-20 px-1.5 py-1 text-right">Rate (₹)</th>
				<th class="w-16 px-1.5 py-1 text-right">Dis %</th>
				<th class="w-14 px-1.5 py-1 text-right">GST %</th>
				<th class="w-24 px-2.5 py-1 text-right">Net (₹)</th>
				<th class="w-8 px-1.5 py-1 text-center"></th>
			</tr>
		</thead>
		<tbody class="divide-y divide-border-subtle">
			{#if items.length === 0}
				<tr>
					<td colspan="11" class="px-4 py-16 text-center text-text-muted">
						<div class="mx-auto flex max-w-sm flex-col items-center justify-center">
							<div class="flex h-10 w-10 items-center justify-center rounded-full bg-accent-light/40 text-accent mb-2">
								<Pill size={20} />
							</div>
							<p class="font-semibold text-text-primary text-xs">Line Items Grid Ready</p>
							<p class="text-[11px] text-text-muted mt-1">
								Press <kbd class="rounded border border-border-strong bg-surface-secondary px-1 py-0.2 font-mono text-[10px] font-bold text-accent shadow-2xs">F2</kbd> to search products, or scan a barcode to add line items.
							</p>
						</div>
					</td>
				</tr>
			{:else}
				{#each items as item, index (item.uiKey)}
					{@const isStockShortage = item.availableStock !== undefined && item.quantity > item.availableStock}
					{@const isSelected = activeIndex === index}
					<!-- 28px compact row height -->
					<tr
						class="h-[28px] max-h-[28px] transition-colors group cursor-pointer
							{isSelected ? 'bg-accent-light/50 font-medium' : 'hover:bg-surface-hover/70'}
							{isStockShortage ? 'bg-danger-light/25' : ''}"
						onclick={() => (activeIndex = index)}
					>
						<!-- Index -->
						<td class="px-2 py-0.5 text-center font-mono text-[11px] font-semibold text-text-muted">
							{index + 1}
						</td>

						<!-- Product Name & Schedule Tag -->
						<td class="px-2.5 py-0.5">
							<div class="flex items-center gap-1.5 truncate">
								<span class="truncate font-semibold text-text-primary max-w-[240px]">{item.productName}</span>
								{#if item.drugSchedule && item.drugSchedule !== 'none'}
									<span class="inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-0.2 text-[9px] font-bold uppercase tracking-wider
										{item.drugSchedule === 'H1' || item.drugSchedule === 'X'
											? 'bg-danger-light text-danger border border-danger/20'
											: 'bg-warning-light text-warning border border-warning/20'}">
										<ShieldAlert size={9} />
										<span>{item.drugSchedule}</span>
									</span>
								{/if}
							</div>
						</td>

						<!-- Batch -->
						<td class="px-2 py-0.5">
							<span class="inline-block rounded border border-border-strong bg-surface px-1.5 py-0.2 font-mono text-[10px] font-bold text-text-primary truncate max-w-[90px]">
								{item.batchNumber}
							</span>
						</td>

						<!-- Expiry -->
						<td class="px-1.5 py-0.5 text-center">
							<span class="font-mono text-[11px] text-text-muted font-medium">
								{formatExpiry(item.expiryDate)}
							</span>
						</td>

						<!-- Quantity (Interactive 28px height input) -->
						<td class="px-1.5 py-0.5 text-right">
							<div class="relative w-full flex items-center justify-end">
								<input
									type="number"
									bind:value={item.quantity}
									min="1"
									onfocus={() => (activeIndex = index)}
									class="qty-input qty-input-{index} h-6 w-16 rounded border px-1 py-0 text-right font-mono text-xs font-bold tabular-nums transition-colors
										{isStockShortage
											? 'border-danger bg-danger-light/30 text-danger ring-1 ring-danger'
											: 'border-border bg-surface text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none'}"
									onkeydown={(e) => handleQtyKeyDown(e, index)}
								/>
							</div>
						</td>

						<!-- MRP -->
						<td class="px-2 py-0.5 text-right font-mono text-[11px] text-text-muted tabular-nums">
							₹{item.mrp.toFixed(2)}
						</td>

						<!-- Rate (Interactive) -->
						<td class="px-1.5 py-0.5 text-right">
							<input
								type="number"
								bind:value={item.rate}
								step="0.01"
								onfocus={() => (activeIndex = index)}
								class="rate-input-{index} h-6 w-16 rounded border border-border bg-surface px-1 py-0 text-right font-mono text-xs font-medium text-text-primary tabular-nums focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
								onkeydown={(e) => handleRateKeyDown(e, index)}
							/>
						</td>

						<!-- Discount % (Interactive) -->
						<td class="px-1.5 py-0.5 text-right">
							<input
								type="number"
								bind:value={item.discount}
								step="0.5"
								min="0"
								max="100"
								onfocus={() => (activeIndex = index)}
								class="dis-input-{index} h-6 w-12 rounded border border-border bg-surface px-1 py-0 text-right font-mono text-xs font-medium text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
								onkeydown={(e) => handleDiscountKeyDown(e, index)}
							/>
						</td>

						<!-- GST % -->
						<td class="px-1.5 py-0.5 text-right font-mono text-[11px] text-text-muted tabular-nums">
							{item.gstRate}%
						</td>

						<!-- Net Amount -->
						<td class="px-2.5 py-0.5 text-right font-mono text-xs font-bold text-text-primary tabular-nums">
							₹{(item.quantity * item.rate * (1 - item.discount / 100)).toFixed(2)}
						</td>

						<!-- Remove Action -->
						<td class="px-1.5 py-0.5 text-center">
							<button
								type="button"
								class="rounded p-0.5 text-text-muted hover:bg-danger-light hover:text-danger"
								onclick={(e) => {
									e.stopPropagation();
									onRemoveItem(index);
								}}
								aria-label="Remove item"
								title="Remove item (Ctrl+Del)"
							>
								<Trash2 size={13} />
							</button>
						</td>
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>
