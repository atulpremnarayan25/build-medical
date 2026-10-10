<script lang="ts">
	let {
		productId = '',
		productName = '',
		currentRate = 0
	}: {
		productId?: string;
		productName?: string;
		currentRate?: number;
	} = $props();

	let history = $state<any[]>([]);
	let currentStock = $state<number | null>(null);
	let isLoading = $state(false);

	$effect(() => {
		if (productId) {
			loadHistory(productId);
		} else {
			history = [];
			currentStock = null;
		}
	});

	async function loadHistory(id: string) {
		isLoading = true;
		try {
			const res = await fetch(`/api/purchases/history?productId=${id}`);
			if (res.ok) {
				const data = await res.json();
				history = data.data?.history || data.history || [];
				currentStock = data.data?.currentStock ?? data.currentStock ?? 0;
			}
		} catch (e) {
			console.error('Failed to load purchase history', e);
		} finally {
			isLoading = false;
		}
	}

	let lastRate = $derived(history.length > 0 ? Number(history[0].purchaseRate) : null);
	let isRateHigher = $derived(
		lastRate !== null && currentRate > 0 && currentRate > lastRate
	);
</script>

{#if productId}
	<div class="border-t border-border bg-surface-muted/30 p-2.5 text-xs">
		<!-- Inspector Header matching PKS Image 1 -->
		<div class="mb-2 flex items-center justify-between">
			<div class="flex items-center gap-2">
				<span class="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
					{history[0]?.hsnCode ? `HSN: ${history[0].hsnCode}` : 'ITEM'}
				</span>
				<span class="font-semibold text-text-primary">
					{productName}
					{#if history[0]?.packSize}
						<span class="text-text-muted font-normal">({history[0].packSize}/pack)</span>
					{/if}
				</span>
				{#if isRateHigher}
					<span class="rounded bg-danger/10 px-2 py-0.5 text-[10px] font-semibold text-danger">
						⚠️ Rate Higher: +₹{(currentRate - (lastRate || 0)).toFixed(2)} vs Last Pur (₹{lastRate?.toFixed(2)})
					</span>
				{/if}
			</div>

			<div class="flex items-center gap-2">
				{#if currentStock !== null}
					<span class="rounded-md border border-border bg-surface px-2.5 py-0.5 font-mono text-xs font-bold text-primary shadow-2xs">
						Live Stock: {currentStock.toFixed(1)}
					</span>
				{/if}
				<span class="text-[11px] font-medium text-text-muted">Past Purchase Comparison (Image 1)</span>
			</div>
		</div>

		<!-- Past Purchases Comparison Table -->
		<div class="overflow-x-auto rounded border border-border bg-surface">
			<table class="w-full text-left text-[11px]">
				<thead class="border-b border-border bg-surface-secondary text-text-secondary">
					<tr>
						<th class="px-2 py-1">Inv No.</th>
						<th class="px-2 py-1">Date</th>
						<th class="px-2 py-1">Supplier / City</th>
						<th class="px-2 py-1 text-right">Qty</th>
						<th class="px-2 py-1 text-right font-semibold">Pur. Rate (₹)</th>
						<th class="px-2 py-1 text-right">Dis %</th>
						<th class="px-2 py-1 text-right">GST %</th>
						<th class="px-2 py-1 text-right">MRP (₹)</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border/50">
					{#if isLoading}
						<tr>
							<td colspan="8" class="px-2 py-2 text-center text-text-muted">Loading purchase history...</td>
						</tr>
					{:else if history.length === 0}
						<tr>
							<td colspan="8" class="px-2 py-2 text-center text-text-muted">No previous purchases on record for this product.</td>
						</tr>
					{:else}
						{#each history as rec}
							<tr class="hover:bg-surface-hover/50 font-mono">
								<td class="px-2 py-1 font-semibold text-text-primary">{rec.invoiceNo || '-'}</td>
								<td class="px-2 py-1 text-text-secondary">{rec.invoiceDate || rec.createdAt?.split('T')[0] || '-'}</td>
								<td class="px-2 py-1 text-text-primary truncate max-w-[200px]" title={rec.supplierName}>
									{rec.supplierName} {rec.supplierCity ? `(${rec.supplierCity})` : ''}
								</td>
								<td class="px-2 py-1 text-right text-text-secondary">{rec.quantity}</td>
								<td class="px-2 py-1 text-right font-bold text-primary">₹{Number(rec.purchaseRate).toFixed(2)}</td>
								<td class="px-2 py-1 text-right text-text-secondary">{rec.discount ? `${rec.discount}%` : '0%'}</td>
								<td class="px-2 py-1 text-right text-text-secondary">{rec.gstRate ? `${rec.gstRate}%` : '0%'}</td>
								<td class="px-2 py-1 text-right text-text-secondary">₹{Number(rec.mrp).toFixed(2)}</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
{/if}
