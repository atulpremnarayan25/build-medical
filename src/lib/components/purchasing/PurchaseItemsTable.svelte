<script lang="ts">
	import type { CreatePurchaseItemInput } from '$lib/types/purchase.js';
	import { Trash2 } from '@lucide/svelte';

	let {
		items = $bindable(),
		onRemoveItem,
		onItemUpdated
	}: {
		items: (CreatePurchaseItemInput & { uiKey: number })[];
		onRemoveItem: (index: number) => void;
		onItemUpdated?: () => void;
	} = $props();

	function handleRowKeyDown(e: KeyboardEvent, index: number, field: string) {
		if (e.key === 'Enter') {
			e.preventDefault();

			const row = (e.target as HTMLElement).closest('tr');
			if (!row) return;

			let nextSelectorMap: Record<string, string> = {
				batchNumber: '.expiry-input',
				expiryDate: '.qty-input',
				quantity: '.free-qty-input',
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
</script>

<div class="flex-1 overflow-auto border-r border-l border-border bg-surface">
	<table class="w-full text-left align-top text-xs">
		<thead class="sticky top-0 z-10 border-b border-border bg-surface-secondary text-[11px] font-semibold text-text-muted uppercase shadow-2xs">
			<tr>
				<th class="w-10 px-2.5 py-2.5 text-center">#</th>
				<th class="px-2.5 py-2.5">PRODUCT</th>
				<th class="w-32 px-2 py-2.5">BATCH NO*</th>
				<th class="w-36 px-2 py-2.5">EXPIRY*</th>
				<th class="w-20 px-2 py-2.5 text-right">QTY*</th>
				<th class="w-16 px-2 py-2.5 text-right">FREE</th>
				<th class="w-24 px-2 py-2.5 text-right">PUR.RATE*</th>
				<th class="w-24 px-2 py-2.5 text-right">MRP*</th>
				<th class="w-16 px-2 py-2.5 text-right">DIS%</th>
				<th class="w-16 px-2 py-2.5 text-right">GST%</th>
				<th class="w-28 px-2.5 py-2.5 text-right">AMOUNT</th>
				<th class="w-10 px-2 py-2.5"></th>
			</tr>
		</thead>
		<tbody class="divide-y divide-border/60">
			{#if items.length === 0}
				<tr>
					<td colspan="12" class="px-4 py-16 text-center text-xs text-text-muted">
						Search and select a product (or press <kbd class="rounded border border-border bg-surface-secondary px-1.5 py-0.5 font-mono text-[10px] text-accent font-bold">F2</kbd>) to add inward items to this purchase voucher.
					</td>
				</tr>
			{:else}
				{#each items as item, index (item.uiKey)}
					<tr class="hover:bg-surface-hover/50 transition-colors">
						<td class="px-2.5 py-2 text-center font-mono text-xs text-text-muted tabular-nums">{index + 1}</td>
						<td class="px-2.5 py-2 font-medium text-text-primary">
							<div class="truncate max-w-[220px] font-semibold text-text-primary">{item.productName}</div>
						</td>
						<td class="px-2 py-1.5">
							<input
								type="text"
								bind:value={item.batchNumber}
								placeholder="BAT-01"
								class="batch-input w-full rounded border bg-surface px-2 py-1.5 font-mono text-xs uppercase text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none transition-colors {!item.batchNumber?.trim() ? 'border-amber-500/40' : 'border-border'}"
								onkeydown={(e) => handleRowKeyDown(e, index, 'batchNumber')}
							/>
						</td>
						<td class="px-2 py-1.5">
							<input
								type="date"
								bind:value={item.expiryDate}
								class="expiry-input w-full rounded border bg-surface px-2 py-1.5 font-mono text-xs text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none transition-colors {!item.expiryDate ? 'border-amber-500/40' : 'border-border'}"
								onkeydown={(e) => handleRowKeyDown(e, index, 'expiryDate')}
							/>
						</td>
						<td class="px-2 py-1.5 text-right">
							<input
								type="number"
								bind:value={item.quantity}
								min="1"
								class="qty-input w-full rounded border border-border bg-surface px-2 py-1.5 text-right font-mono text-xs font-semibold text-text-primary tabular-nums focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
								onkeydown={(e) => handleRowKeyDown(e, index, 'quantity')}
							/>
						</td>
						<td class="px-2 py-1.5 text-right">
							<input
								type="number"
								bind:value={item.freeQuantity}
								min="0"
								class="free-qty-input w-full rounded border border-border bg-surface px-1.5 py-1 text-right font-mono text-xs text-text-primary tabular-nums focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
								onkeydown={(e) => handleRowKeyDown(e, index, 'freeQuantity')}
							/>
						</td>
						<td class="px-2 py-1.5 text-right">
							<input
								type="number"
								bind:value={item.purchaseRate}
								class="rate-input w-full rounded border border-border bg-surface px-1.5 py-1 text-right font-mono text-xs text-text-primary tabular-nums focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
								step="0.01"
								min="0"
								onkeydown={(e) => handleRowKeyDown(e, index, 'purchaseRate')}
							/>
						</td>
						<td class="px-2 py-1.5 text-right">
							<input
								type="number"
								bind:value={item.mrp}
								class="mrp-input w-full rounded border border-border bg-surface px-1.5 py-1 text-right font-mono text-xs text-text-primary tabular-nums focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
								step="0.01"
								min="0"
								onkeydown={(e) => handleRowKeyDown(e, index, 'mrp')}
							/>
						</td>
						<td class="px-2 py-1.5 text-right">
							<input
								type="number"
								bind:value={item.discount}
								class="discount-input w-full rounded border border-border bg-surface px-1.5 py-1 text-right font-mono text-xs text-text-primary tabular-nums focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
								step="0.1"
								min="0"
								onkeydown={(e) => handleRowKeyDown(e, index, 'discount')}
							/>
						</td>
						<td class="px-2 py-2 text-right font-mono text-xs text-text-secondary tabular-nums">{item.gstRate}%</td>
						<td class="px-2.5 py-2 text-right font-mono text-xs font-bold text-text-primary tabular-nums">
							₹{(item.quantity * item.purchaseRate * (1 - item.discount / 100)).toFixed(2)}
						</td>
						<td class="px-2 py-1.5 text-center">
							<button
								class="rounded p-1 text-text-muted hover:bg-red-500/10 hover:text-danger"
								onclick={() => onRemoveItem(index)}
								aria-label="Remove item"
								title="Delete row"
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
