<script lang="ts">
	import type { CreatePurchaseItemInput } from '$lib/types/purchase.js';
	import { Trash2, Truck } from '@lucide/svelte';
	import { toPaise, percentOf, paiseToRupees } from '$lib/utils/money.js';
	import { calculateDeal } from '$lib/utils/dealScheme.js';

	let {
		items = $bindable(),
		activeRowIndex = $bindable(0),
		onRemoveItem,
		onItemUpdated,
		onRowFocused,
		disabled = false,
		onFocusSupplier
	}: {
		items: (CreatePurchaseItemInput & { uiKey: number })[];
		activeRowIndex?: number;
		onRemoveItem: (index: number) => void;
		onItemUpdated?: () => void;
		onRowFocused?: (item: CreatePurchaseItemInput, index: number) => void;
		disabled?: boolean;
		onFocusSupplier?: () => void;
	} = $props();

	function handleDealInput(item: CreatePurchaseItemInput) {
		if (item.dealScheme) {
			const res = calculateDeal(Number(item.quantity) || 0, item.dealScheme);
			item.freeQuantity = res.freeQty;
		}
		if (onItemUpdated) {
			onItemUpdated();
		}
	}

	function handleFocus(item: CreatePurchaseItemInput, index: number) {
		activeRowIndex = index;
		if (onRowFocused) {
			onRowFocused(item, index);
		}
	}

	function handleRowKeyDown(e: KeyboardEvent, index: number, field: string) {
		if (e.key === 'Enter') {
			e.preventDefault();

			const row = (e.target as HTMLElement).closest('tr');
			if (!row) return;

			const nextSelectorMap: Record<string, string> = {
				batchNumber: '.expiry-input',
				expiryDate: '.pack-size-input',
				packSize: '.qty-input',
				quantity: '.deal-input',
				dealScheme: '.free-qty-input',
				freeQuantity: '.rate-input',
				purchaseRate: '.mrp-input',
				mrp: '.discount-input',
				discount: '.batch-input'
			};

			if (field === 'discount') {
				const searchInput = document.querySelector(
					'input[placeholder*="Search product"]'
				) as HTMLInputElement;
				if (searchInput) searchInput.focus();
				return;
			}

			const nextSelector = nextSelectorMap[field];
			if (nextSelector) {
				const nextInput = row.querySelector(nextSelector) as HTMLInputElement;
				if (nextInput) {
					nextInput.focus();
					nextInput.select();
				}
			}
		}

		if (onItemUpdated) {
			onItemUpdated();
		}
	}

	function computeRowFinancials(item: CreatePurchaseItemInput) {
		const qty = Number(item.quantity) || 0;
		const freeQty = Number(item.freeQuantity) || 0;
		const packSize = Number(item.packSize) || 1;
		const baseQty = (qty + freeQty) * packSize;

		const ratePaise = toPaise(item.purchaseRate || 0);
		const grossPaise = qty * ratePaise;
		const discountPaise = percentOf(grossPaise, item.discount || 0);
		const taxablePaise = grossPaise - discountPaise;
		const gstPaise = percentOf(taxablePaise, item.gstRate || 0);
		const lineTotalPaise = taxablePaise + gstPaise;

		const effectiveStripCost =
			baseQty > 0
				? paiseToRupees(lineTotalPaise) / baseQty
				: (Number(item.purchaseRate || 0) / packSize);

		return {
			baseQty,
			lineTotal: paiseToRupees(lineTotalPaise),
			effectiveStripCost
		};
	}
</script>

<div class="flex-1 overflow-auto border-r border-l border-border bg-surface">
	<table class="w-full text-left align-top text-xs">
		<thead class="sticky top-0 z-10 border-b border-border bg-surface-secondary text-[11px] font-semibold text-text-secondary uppercase shadow-2xs">
			<tr>
				<th class="w-8 px-2 py-2 text-center">#</th>
				<th class="px-2.5 py-2">Product Name</th>
				<th class="w-24 px-1.5 py-2">Batch No*</th>
				<th class="w-28 px-1.5 py-2">Expiry*</th>
				<th class="w-16 px-1.5 py-2 text-right" title="Strips / Base units per Box">Pack Sz</th>
				<th class="w-16 px-1.5 py-2 text-right">Qty (Box)*</th>
				<th class="w-20 px-1.5 py-2 text-center" title="Pharma Scheme e.g. 89+1, 10+1">Deal</th>
				<th class="w-14 px-1.5 py-2 text-right">Free</th>
				<th class="w-16 px-1.5 py-2 text-right text-accent font-semibold" title="Total Inward Units (Qty + Free) * Pack Sz">Total Base</th>
				<th class="w-20 px-1.5 py-2 text-right">Pur.Rate (₹)*</th>
				<th class="w-20 px-1.5 py-2 text-right text-success font-semibold" title="Effective Landing Cost per base retail strip">Eff. Cost (₹)</th>
				<th class="w-20 px-1.5 py-2 text-right">MRP (₹)*</th>
				<th class="w-14 px-1.5 py-2 text-right">Dis%</th>
				<th class="w-14 px-1.5 py-2 text-right">GST%</th>
				<th class="w-24 px-2 py-2 text-right">Amount (₹)</th>
				<th class="w-8 px-1 py-2"></th>
			</tr>
		</thead>
		<tbody class="divide-y divide-border/60">
			{#if items.length === 0}
				<tr>
					<td colspan="16" class="px-4 py-16 text-center text-xs text-text-muted">
						<div class="mx-auto flex max-w-sm flex-col items-center justify-center">
							{#if disabled}
								<div class="flex h-10 w-10 items-center justify-center rounded-full bg-surface-secondary text-text-muted mb-2">
									<Truck size={20} />
								</div>
								<p class="font-bold text-text-primary text-xs">Supplier Selection Required</p>
								<p class="text-[11px] text-text-muted mt-1 max-w-[280px]">
									Select a distributor or supplier (F3) before adding medicines to this purchase voucher.
								</p>
								{#if onFocusSupplier}
									<button
										type="button"
										onclick={onFocusSupplier}
										class="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-accent-hover active:scale-95 transition-all"
									>
										<Truck size={13} />
										<span>Select Supplier (F3)</span>
									</button>
								{/if}
							{:else}
								<p class="font-semibold text-text-primary text-xs">Line Items Grid Ready</p>
								<p class="text-[11px] text-text-muted mt-1">
									Search and select a medicine (or press <kbd class="rounded border border-border bg-surface-secondary px-1 py-0.5 font-mono text-[10px] text-accent">F2</kbd>) to add inward items to this purchase voucher.
								</p>
							{/if}
						</div>
					</td>
				</tr>
			{:else}
				{#each items as item, index (item.uiKey)}
					{@const financials = computeRowFinancials(item)}
					<tr class={`hover:bg-surface-hover/50 ${activeRowIndex === index ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : ''}`}>
						<td class="px-2 py-2 text-center font-mono text-xs text-text-muted tabular-nums">{index + 1}</td>
						<td class="px-2.5 py-2 font-medium text-text-primary">
							<div class="truncate max-w-[180px] font-semibold" title={item.productName}>{item.productName}</div>
						</td>
						<td class="px-1.5 py-1.5">
							<input
								type="text"
								bind:value={item.batchNumber}
								placeholder="BAT-01"
								class="batch-input w-full rounded border border-border bg-surface px-1.5 py-1 font-mono text-xs uppercase text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
								onfocus={() => handleFocus(item, index)}
								onkeydown={(e) => handleRowKeyDown(e, index, 'batchNumber')}
							/>
						</td>
						<td class="px-1.5 py-1.5">
							<input
								type="date"
								bind:value={item.expiryDate}
								class="expiry-input w-full rounded border border-border bg-surface px-1 py-1 font-mono text-xs text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
								onfocus={() => handleFocus(item, index)}
								onkeydown={(e) => handleRowKeyDown(e, index, 'expiryDate')}
							/>
						</td>
						<td class="px-1.5 py-1.5 text-right">
							<input
								type="number"
								bind:value={item.packSize}
								min="1"
								class="pack-size-input w-full rounded border border-border bg-surface px-1 py-1 text-right font-mono text-xs text-text-primary tabular-nums focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
								onfocus={() => handleFocus(item, index)}
								onkeydown={(e) => handleRowKeyDown(e, index, 'packSize')}
							/>
						</td>
						<td class="px-1.5 py-1.5 text-right">
							<input
								type="number"
								bind:value={item.quantity}
								min="1"
								class="qty-input w-full rounded border border-border bg-surface px-1 py-1 text-right font-mono text-xs font-semibold text-text-primary tabular-nums focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
								onfocus={() => handleFocus(item, index)}
								oninput={() => handleDealInput(item)}
								onkeydown={(e) => handleRowKeyDown(e, index, 'quantity')}
							/>
						</td>
						<td class="px-1.5 py-1.5">
							<input
								type="text"
								bind:value={item.dealScheme}
								placeholder="89+1"
								class="deal-input w-full rounded border border-border bg-surface px-1.5 py-1 text-center font-mono text-xs text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
								onfocus={() => handleFocus(item, index)}
								oninput={() => handleDealInput(item)}
								onkeydown={(e) => handleRowKeyDown(e, index, 'dealScheme')}
							/>
						</td>
						<td class="px-1.5 py-1.5 text-right">
							<input
								type="number"
								bind:value={item.freeQuantity}
								min="0"
								class="free-qty-input w-full rounded border border-border bg-surface px-1 py-1 text-right font-mono text-xs text-text-primary tabular-nums focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
								onfocus={() => handleFocus(item, index)}
								onkeydown={(e) => handleRowKeyDown(e, index, 'freeQuantity')}
							/>
						</td>
						<td class="px-1.5 py-2 text-right font-mono text-xs font-bold text-accent tabular-nums" title="Strips Inwarded">
							{financials.baseQty}
						</td>
						<td class="px-1.5 py-1.5 text-right">
							<input
								type="number"
								bind:value={item.purchaseRate}
								class="rate-input w-full rounded border border-border bg-surface px-1 py-1 text-right font-mono text-xs text-text-primary tabular-nums focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
								step="0.01"
								min="0"
								onfocus={() => handleFocus(item, index)}
								onkeydown={(e) => handleRowKeyDown(e, index, 'purchaseRate')}
							/>
						</td>
						<td class="px-1.5 py-2 text-right font-mono text-xs font-semibold text-success tabular-nums" title="Landing Cost / Strip">
							₹{financials.effectiveStripCost.toFixed(2)}
						</td>
						<td class="px-1.5 py-1.5 text-right">
							<input
								type="number"
								bind:value={item.mrp}
								class="mrp-input w-full rounded border border-border bg-surface px-1 py-1 text-right font-mono text-xs text-text-primary tabular-nums focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
								step="0.01"
								min="0"
								onfocus={() => handleFocus(item, index)}
								onkeydown={(e) => handleRowKeyDown(e, index, 'mrp')}
							/>
						</td>
						<td class="px-1.5 py-1.5 text-right">
							<input
								type="number"
								bind:value={item.discount}
								class="discount-input w-full rounded border border-border bg-surface px-1 py-1 text-right font-mono text-xs text-text-primary tabular-nums focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
								step="0.1"
								min="0"
								onfocus={() => handleFocus(item, index)}
								onkeydown={(e) => handleRowKeyDown(e, index, 'discount')}
							/>
						</td>
						<td class="px-1.5 py-2 text-right font-mono text-xs text-text-secondary tabular-nums">{item.gstRate}%</td>
						<td class="px-2 py-2 text-right font-mono text-xs font-bold text-text-primary tabular-nums">
							₹{financials.lineTotal.toFixed(2)}
						</td>
						<td class="px-1 py-1.5 text-center">
							<button
								class="rounded p-1 text-text-muted hover:bg-red-500/10 hover:text-danger"
								onclick={() => onRemoveItem(index)}
								aria-label="Remove item"
								title="Delete row"
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
