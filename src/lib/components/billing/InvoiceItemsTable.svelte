<script lang="ts">
	import type { CreateSaleItemInput } from '$lib/types/sale.js';
	import { Trash2, Pill, ShieldAlert, AlertTriangle } from '@lucide/svelte';

	let {
		items = $bindable(),
		onRemoveItem
	}: {
		items: (CreateSaleItemInput & { uiKey: number; drugSchedule?: string; availableStock?: number })[];
		onRemoveItem: (index: number) => void;
	} = $props();

	function handleQtyKeyDown(e: KeyboardEvent, index: number) {
		if (e.key === 'Enter') {
			e.preventDefault();
			const rateInput = document.querySelector(`.rate-input-${index}`) as HTMLInputElement;
			if (rateInput) {
				rateInput.focus();
				rateInput.select();
			}
		} else if (e.key === 'ArrowDown') {
			if (index < items.length - 1) {
				e.preventDefault();
				const nextQty = document.querySelector(`.qty-input-${index + 1}`) as HTMLInputElement;
				if (nextQty) {
					nextQty.focus();
					nextQty.select();
				}
			}
		} else if (e.key === 'ArrowUp') {
			if (index > 0) {
				e.preventDefault();
				const prevQty = document.querySelector(`.qty-input-${index - 1}`) as HTMLInputElement;
				if (prevQty) {
					prevQty.focus();
					prevQty.select();
				}
			}
		} else if ((e.ctrlKey || e.metaKey) && e.key === 'Delete') {
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
		} else if (e.key === 'ArrowDown') {
			if (index < items.length - 1) {
				e.preventDefault();
				const nextRate = document.querySelector(`.rate-input-${index + 1}`) as HTMLInputElement;
				if (nextRate) {
					nextRate.focus();
					nextRate.select();
				}
			}
		} else if (e.key === 'ArrowUp') {
			if (index > 0) {
				e.preventDefault();
				const prevRate = document.querySelector(`.rate-input-${index - 1}`) as HTMLInputElement;
				if (prevRate) {
					prevRate.focus();
					prevRate.select();
				}
			}
		}
	}

	function handleDiscountKeyDown(e: KeyboardEvent, index: number) {
		if (e.key === 'Enter') {
			e.preventDefault();
			const searchInput = document.querySelector(
				'input[placeholder*="Search medicine"]'
			) as HTMLInputElement;
			if (searchInput) {
				searchInput.focus();
				searchInput.select();
			}
		} else if (e.key === 'ArrowDown') {
			if (index < items.length - 1) {
				e.preventDefault();
				const nextDis = document.querySelector(`.dis-input-${index + 1}`) as HTMLInputElement;
				if (nextDis) {
					nextDis.focus();
					nextDis.select();
				}
			}
		} else if (e.key === 'ArrowUp') {
			if (index > 0) {
				e.preventDefault();
				const prevDis = document.querySelector(`.dis-input-${index - 1}`) as HTMLInputElement;
				if (prevDis) {
					prevDis.focus();
					prevDis.select();
				}
			}
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

<div class="flex-1 overflow-auto border-x border-border bg-surface">
	<table class="w-full text-left align-top text-xs">
		<thead class="sticky top-0 z-10 border-b border-border bg-surface-secondary text-[11px] font-semibold text-text-muted uppercase tracking-wider shadow-2xs">
			<tr>
				<th class="w-10 px-3 py-2 text-center">#</th>
				<th class="px-3 py-2">Medicine / Drug Description</th>
				<th class="w-28 px-3 py-2">Batch No</th>
				<th class="w-20 px-3 py-2 text-center">Expiry</th>
				<th class="w-24 px-2 py-2 text-right">Qty</th>
				<th class="w-24 px-3 py-2 text-right">MRP (₹)</th>
				<th class="w-24 px-2 py-2 text-right">Rate (₹)</th>
				<th class="w-20 px-2 py-2 text-right">Dis %</th>
				<th class="w-16 px-2 py-2 text-right">GST %</th>
				<th class="w-28 px-3 py-2 text-right">Net Amount</th>
				<th class="w-10 px-2 py-2 text-center"></th>
			</tr>
		</thead>
		<tbody class="divide-y divide-border-subtle">
			{#if items.length === 0}
				<tr>
					<td colspan="11" class="px-4 py-16 text-center text-text-muted">
						<div class="mx-auto flex max-w-sm flex-col items-center justify-center">
							<div class="flex h-12 w-12 items-center justify-center rounded-full bg-accent-light/40 text-accent mb-3">
								<Pill size={24} />
							</div>
							<p class="font-semibold text-text-primary text-sm">Billing Grid Ready</p>
							<p class="text-xs text-text-muted mt-1">
								Press <kbd class="rounded border border-border-strong bg-surface-secondary px-1.5 py-0.5 font-mono text-[11px] font-bold text-accent shadow-2xs">F2</kbd> to search products, or scan a barcode to add line items.
							</p>
						</div>
					</td>
				</tr>
			{:else}
				{#each items as item, index (item.uiKey)}
					{@const isStockShortage = item.availableStock !== undefined && item.quantity > item.availableStock}
					<tr class="transition-colors hover:bg-surface-hover/70 group {isStockShortage ? 'bg-danger-light/20' : ''}">
						<!-- Index -->
						<td class="px-3 py-2 text-center font-mono text-xs font-semibold text-text-muted">
							{index + 1}
						</td>

						<!-- Product Name & Schedule Tag -->
						<td class="px-3 py-2">
							<div class="flex items-center gap-1.5">
								<span class="font-semibold text-text-primary">{item.productName}</span>
								{#if item.drugSchedule && item.drugSchedule !== 'none'}
									<span class="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider
										{item.drugSchedule === 'H1' || item.drugSchedule === 'X'
											? 'bg-danger-light text-danger border border-danger/20'
											: 'bg-warning-light text-warning border border-warning/20'}">
										<ShieldAlert size={11} />
										<span>{item.drugSchedule}</span>
									</span>
								{/if}
							</div>
						</td>

						<!-- Batch -->
						<td class="px-3 py-1.5">
							<span class="inline-block rounded border border-border-strong bg-surface-secondary px-2 py-0.5 font-mono text-[11px] font-bold text-text-primary">
								{item.batchNumber}
							</span>
						</td>

						<!-- Expiry -->
						<td class="px-3 py-2 text-center">
							<span class="font-mono text-xs text-text-muted font-medium">
								{formatExpiry(item.expiryDate)}
							</span>
						</td>

						<!-- Quantity (Interactive) with Stock Shortage Feedback -->
						<td class="px-2 py-1.5 text-right">
							<div class="flex flex-col items-end gap-0.5">
								<div class="relative w-full">
									<input
										type="number"
										bind:value={item.quantity}
										min="1"
										class="qty-input qty-input-{index} w-full rounded border px-1.5 py-1 text-right font-mono text-xs font-bold tabular-nums transition-colors
											{isStockShortage
												? 'border-danger bg-danger-light/20 text-danger ring-1 ring-danger focus:border-danger focus:ring-danger'
												: 'border-border bg-surface text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none'}"
										onkeydown={(e) => handleQtyKeyDown(e, index)}
									/>
								</div>
								{#if isStockShortage}
									<span class="inline-flex items-center gap-0.5 text-[11px] font-bold text-danger">
										<AlertTriangle size={10} />
										<span>Max: {item.availableStock}</span>
									</span>
								{:else if item.availableStock !== undefined}
									<span class="text-[11px] text-text-muted">
										Avail: {item.availableStock}
									</span>
								{/if}
							</div>
						</td>

						<!-- MRP -->
						<td class="px-3 py-2 text-right font-mono text-xs text-text-muted tabular-nums">
							₹{item.mrp.toFixed(2)}
						</td>

						<!-- Rate (Interactive) -->
						<td class="px-2 py-1.5 text-right">
							<input
								type="number"
								bind:value={item.rate}
								step="0.01"
								class="rate-input-{index} w-full rounded border border-border bg-surface px-1.5 py-1 text-right font-mono text-xs font-medium text-text-primary tabular-nums focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
								onkeydown={(e) => handleRateKeyDown(e, index)}
							/>
						</td>

						<!-- Discount % (Interactive) -->
						<td class="px-2 py-1.5 text-right">
							<input
								type="number"
								bind:value={item.discount}
								step="0.1"
								min="0"
								max="100"
								class="dis-input-{index} w-full rounded border border-border bg-surface px-1.5 py-1 text-right font-mono text-xs font-medium text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
								onkeydown={(e) => handleDiscountKeyDown(e, index)}
							/>
						</td>

						<!-- GST % -->
						<td class="px-2 py-2 text-right font-mono text-xs text-text-muted tabular-nums">
							{item.gstRate}%
						</td>

						<!-- Net Amount -->
						<td class="px-3 py-2 text-right font-mono text-xs font-bold text-text-primary tabular-nums">
							₹{(item.quantity * item.rate * (1 - item.discount / 100)).toFixed(2)}
						</td>

						<!-- Remove Action -->
						<td class="px-2 py-2 text-center">
							<button
								type="button"
								class="rounded p-1 text-text-muted transition-colors hover:bg-danger-light hover:text-danger"
								onclick={() => onRemoveItem(index)}
								aria-label="Remove item"
								title="Remove item (Ctrl+Del)"
							>
								<Trash2 size={14} />
							</button>
						</td>
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>
