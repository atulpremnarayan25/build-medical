<script lang="ts">
	let {
		itemCount,
		subtotal,
		discountTotal,
		taxableTotal,
		gstTotal,
		roundOff,
		grandTotal
	}: {
		itemCount: number;
		subtotal: number;
		discountTotal: number;
		taxableTotal: number;
		gstTotal: number;
		roundOff: number;
		grandTotal: number;
	} = $props();
</script>

<div
	class="flex flex-col items-center justify-between gap-4 rounded-b-xl border-x border-b border-border bg-surface-secondary p-3.5 shadow-2xs md:flex-row"
>
	<div class="flex items-center gap-2 text-xs text-text-muted">
		<span class="font-mono font-semibold text-text-primary tabular-nums">{itemCount}</span> items in voucher
		<span class="text-border-strong">•</span>
		<span><kbd class="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] text-text-primary">F2</kbd> Product</span>
		<span><kbd class="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] text-text-primary">Ctrl+S</kbd> / <kbd class="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] text-text-primary">F10</kbd> Save</span>
	</div>

	<div class="flex w-full items-center gap-6 overflow-x-auto text-xs md:w-auto">
		<div class="min-w-[130px] space-y-1">
			<div class="flex justify-between gap-3 text-text-secondary">
				<span>Subtotal:</span>
				<span class="font-mono font-medium text-text-primary tabular-nums">₹{subtotal.toFixed(2)}</span>
			</div>
			<div class="flex justify-between gap-3 text-text-secondary">
				<span>Trade Dis:</span>
				<span class="font-mono font-medium text-danger tabular-nums">-₹{discountTotal.toFixed(2)}</span>
			</div>
		</div>

		<div class="min-w-[130px] space-y-1">
			<div class="flex justify-between gap-3 text-text-secondary">
				<span>Taxable Base:</span>
				<span class="font-mono font-medium text-text-primary tabular-nums">₹{taxableTotal.toFixed(2)}</span>
			</div>
			<div class="flex justify-between gap-3 text-text-secondary">
				<span>GST Total:</span>
				<span class="font-mono font-medium text-accent tabular-nums">+₹{gstTotal.toFixed(2)}</span>
			</div>
			<div class="flex justify-between gap-3 text-text-secondary">
				<span>Round Off:</span>
				<span class="font-mono font-medium text-text-muted tabular-nums">{roundOff >= 0 ? '+' : ''}₹{roundOff.toFixed(2)}</span>
			</div>
		</div>

		<div
			class="flex min-w-[140px] flex-col justify-end border-l border-border pl-5"
		>
			<div class="text-[10px] font-bold tracking-widest text-text-muted uppercase">Purchase Total</div>
			<div class="font-mono text-2xl font-black text-accent tabular-nums">
				₹{grandTotal.toFixed(2)}
			</div>
		</div>
	</div>
</div>
