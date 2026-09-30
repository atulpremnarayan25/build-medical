<script lang="ts">
	import { Modal, Button } from '$lib/components/common';
	import ExpiryBadge from '$lib/components/inventory/ExpiryBadge.svelte';
	import type { Batch, Product } from '$lib/types';
	import { onMount } from 'svelte';
	import { Layers, AlertTriangle, Check, ShieldAlert } from '@lucide/svelte';

	let {
		open = $bindable(),
		product,
		batches,
		onSelect,
		onCancel
	}: {
		open: boolean;
		product: Product | null;
		batches: Batch[];
		onSelect: (batch: Batch) => void;
		onCancel: () => void;
	} = $props();

	let selectedIndex = $state(0);

	// Sort by Expiry Date ascending (FEFO - First Expiry First Out)
	let activeBatches = $derived.by(() => {
		return batches
			.filter((b) => b.quantity > 0 && b.status !== 'expired')
			.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
	});

	let listRef = $state<HTMLTableSectionElement | null>(null);

	onMount(() => {
		if (open) selectedIndex = 0;
	});

	$effect(() => {
		if (open) {
			selectedIndex = 0;
		}
	});

	$effect(() => {
		if (open && listRef && selectedIndex >= 0 && activeBatches.length > 0) {
			const activeItem = listRef.children[selectedIndex] as HTMLElement | undefined;
			if (activeItem) {
				activeItem.scrollIntoView({ block: 'nearest' });
			}
		}
	});

	function handleKeyDown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, activeBatches.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, 0);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (activeBatches[selectedIndex]) {
				onSelect(activeBatches[selectedIndex]);
			}
		} else if (e.key === 'Escape') {
			e.preventDefault();
			onCancel();
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<Modal {open} title="Select Batch (FEFO Ranked)" size="lg" onclose={onCancel}>
	<div class="space-y-3">
		<!-- Product Context Header -->
		{#if product}
			<div class="flex items-center justify-between rounded-lg border border-border bg-surface-secondary p-3">
				<div>
					<div class="flex items-center gap-2">
						<span class="font-bold text-text-primary">{product.name}</span>
						{#if product.drugSchedule && product.drugSchedule !== 'none'}
							<span class="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider {product.drugSchedule === 'H1' || product.drugSchedule === 'X' ? 'bg-danger-light text-danger border border-danger/20' : 'bg-warning-light text-warning border border-warning/20'}">
								Sch {product.drugSchedule}
							</span>
						{/if}
					</div>
					<div class="text-xs text-text-muted">
						{product.genericName || 'No Generic'} • {product.manufacturer || 'General'}
					</div>
				</div>
				<div class="text-right">
					<span class="text-xs font-semibold text-accent">FEFO Auto-Sorted</span>
					<div class="text-[11px] text-text-muted">First Expiry First Out</div>
				</div>
			</div>
		{/if}

		<!-- Keyboard helper -->
		<div class="flex items-center justify-between text-xs text-text-muted">
			<span>Available Batches in Inventory:</span>
			<span class="flex items-center gap-1">
				Use <kbd class="rounded border border-border-strong bg-surface px-1 font-mono text-[10px]">↑↓</kbd> and
				<kbd class="rounded border border-border-strong bg-surface px-1 font-mono text-[10px]">Enter</kbd> to pick.
			</span>
		</div>

		{#if activeBatches.length === 0}
			<div class="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-center">
				<AlertTriangle size={28} class="mb-2 text-warning" />
				<p class="font-semibold text-text-primary">No available active stock</p>
				<p class="text-xs text-text-muted mt-1">All batches for this item are either out of stock or expired.</p>
			</div>
		{:else}
			<div class="overflow-x-auto rounded-lg border border-border">
				<table class="w-full text-left text-sm">
					<thead class="border-b border-border bg-surface-secondary text-[11px] font-semibold text-text-muted uppercase tracking-wider">
						<tr>
							<th class="px-3.5 py-2.5">Batch #</th>
							<th class="px-3.5 py-2.5 text-center">Expiry (FEFO)</th>
							<th class="px-3.5 py-2.5 text-right">Available Qty</th>
							<th class="px-3.5 py-2.5 text-right">MRP</th>
							<th class="px-3.5 py-2.5 text-right">Selling Rate</th>
							<th class="w-12 px-2 py-2.5 text-center"></th>
						</tr>
					</thead>
					<tbody bind:this={listRef}>
						{#each activeBatches as batch, index (batch.id)}
							<tr
								class="cursor-pointer border-b border-border-subtle transition-colors last:border-0 {index ===
								selectedIndex
									? 'bg-accent-light/60 text-text-primary font-medium'
									: 'hover:bg-surface-hover text-text-primary'}"
								onclick={() => onSelect(batch)}
							>
								<td class="px-3.5 py-2.5">
									<span class="rounded bg-surface-secondary px-2 py-0.5 font-mono text-xs font-bold text-text-primary border border-border">
										{batch.batchNumber}
									</span>
								</td>
								<td class="px-3.5 py-2.5 text-center">
									<ExpiryBadge
										date={batch.expiryDate}
										status={batch.status === 'out-of-stock' ||
										batch.status === 'low-stock' ||
										batch.status === 'healthy'
											? undefined
											: batch.status}
									/>
								</td>
								<td class="px-3.5 py-2.5 text-right tabular-nums">
									<span class="font-bold {batch.quantity <= 10 ? 'text-warning' : 'text-text-primary'}">
										{batch.quantity}
									</span>
									<span class="text-xs text-text-muted">units</span>
								</td>
								<td class="px-3.5 py-2.5 text-right font-mono text-xs text-text-muted tabular-nums">
									₹{batch.mrp.toFixed(2)}
								</td>
								<td class="px-3.5 py-2.5 text-right font-mono text-sm font-bold text-accent tabular-nums">
									₹{batch.sellingRate.toFixed(2)}
								</td>
								<td class="px-2 py-2.5 text-center">
									{#if index === selectedIndex}
										<span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
											<Check size={12} />
										</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	{#snippet footer()}
		<Button variant="secondary" size="sm" onclick={onCancel}>Cancel (Esc)</Button>
		{#if activeBatches[selectedIndex]}
			<Button variant="primary" size="sm" onclick={() => onSelect(activeBatches[selectedIndex])}>
				Select Batch (Enter)
			</Button>
		{/if}
	{/snippet}
</Modal>
