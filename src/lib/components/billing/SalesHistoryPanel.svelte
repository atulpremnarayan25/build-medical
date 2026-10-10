<script lang="ts">
	let {
		productId = '',
		productName = '',
		batchNo = '',
		packSize = 10,
		customerId = '',
		saleType = 'retail'
	}: {
		productId?: string;
		productName?: string;
		batchNo?: string;
		packSize?: number;
		customerId?: string;
		saleType?: 'retail' | 'wholesale';
	} = $props();

	let history = $state<any[]>([]);
	let currentStock = $state<number | null>(null);
	let isLoading = $state(false);

	$effect(() => {
		if (productId) {
			loadHistory(productId, customerId);
		} else {
			history = [];
			currentStock = null;
		}
	});

	async function loadHistory(pId: string, cId?: string) {
		isLoading = true;
		try {
			const url = cId
				? `/api/sales/history?productId=${pId}&customerId=${cId}`
				: `/api/sales/history?productId=${pId}`;
			const res = await fetch(url);
			if (res.ok) {
				const data = await res.json();
				history = data.data?.history || data.history || [];
				currentStock = data.data?.currentStock ?? data.currentStock ?? 0;
			}
		} catch (e) {
			console.error('Failed to load sale history', e);
		} finally {
			isLoading = false;
		}
	}
</script>

{#if productId}
	<div class="border-t border-border bg-surface-muted/30 p-2 text-xs select-none">
		<!-- Inspector Header matching PKS Image 2 -->
		<div class="mb-1.5 flex items-center justify-between">
			<div class="flex items-center gap-2">
				<span class="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
					SALE HISTORY
				</span>
				<span class="font-semibold text-text-primary">
					{productName}
					<span class="text-text-muted font-normal">(1X{packSize})</span>
				</span>
				{#if batchNo}
					<span class="font-mono text-[11px] font-bold text-text-secondary">
						Batch: {batchNo}
					</span>
				{/if}
				<span class="rounded bg-accent/10 px-2 py-0.5 font-mono text-[10px] font-bold text-accent">
					{saleType === 'wholesale' ? 'Rate in P.T.R.' : 'Rate in Retail MRP'}
				</span>
			</div>

			<div class="flex items-center gap-2">
				{#if currentStock !== null}
					<span class="rounded border border-border bg-surface px-2 py-0.5 font-mono text-xs font-bold text-primary shadow-2xs">
						Stock: {currentStock.toFixed(1)}
					</span>
				{/if}
				<span class="text-[10px] font-medium text-text-muted">Customer Pricing History (Image 2)</span>
			</div>
		</div>

		<!-- Past Sales Comparison Table -->
		<div class="overflow-x-auto rounded border border-border bg-surface">
			<table class="w-full text-left text-[11px]">
				<thead class="border-b border-border bg-surface-secondary text-text-secondary">
					<tr>
						<th class="px-2 py-1">Bill No.</th>
						<th class="px-2 py-1">Date</th>
						<th class="px-2 py-1">Customer / Agency</th>
						<th class="px-2 py-1">Batch</th>
						<th class="px-2 py-1 text-right">Qty</th>
						<th class="px-2 py-1 text-center">Scheme/Deal</th>
						<th class="px-2 py-1 text-right font-semibold">Rate (₹)</th>
						<th class="px-2 py-1 text-right">Dis %</th>
						<th class="px-2 py-1 text-right">Tax %</th>
						<th class="px-2 py-1 text-right">MRP (₹)</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border/50">
					{#if isLoading}
						<tr>
							<td colspan="10" class="px-2 py-2 text-center text-text-muted">Loading past sales records...</td>
						</tr>
					{:else if history.length === 0}
						<tr>
							<td colspan="10" class="px-2 py-2 text-center text-text-muted">No prior sales recorded for this customer / product.</td>
						</tr>
					{:else}
						{#each history as rec}
							<tr class="hover:bg-surface-hover/50 font-mono">
								<td class="px-2 py-1 font-semibold text-text-primary">{rec.invoiceNumber || '-'}</td>
								<td class="px-2 py-1 text-text-secondary">{rec.createdAt?.split('T')[0] || '-'}</td>
								<td class="px-2 py-1 text-text-primary truncate max-w-[180px]" title={rec.customerName}>
									{rec.customerName || 'Walk-in Retail'}
								</td>
								<td class="px-2 py-1 text-text-secondary">{rec.batchNo || '-'}</td>
								<td class="px-2 py-1 text-right text-text-secondary">{rec.quantity}</td>
								<td class="px-2 py-1 text-center text-text-muted">{rec.schemeApplied || '-'}</td>
								<td class="px-2 py-1 text-right font-bold text-primary">₹{Number(rec.rate).toFixed(2)}</td>
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
