<script lang="ts">
	import { Calculator, Percent, Receipt, ShieldCheck } from '@lucide/svelte';

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
	class="flex flex-col items-stretch justify-between gap-4 rounded-b-xl border border-border bg-surface-secondary/70 p-4 shadow-2xs backdrop-blur-sm md:flex-row md:items-center"
>
	<!-- Left: Quick context & items count -->
	<div class="flex items-center gap-3">
		<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
			<Receipt size={20} />
		</div>
		<div>
			<div class="flex items-center gap-2">
				<span class="text-xs font-bold tracking-wider text-text-muted uppercase">Active Bill</span>
				<span
					class="inline-flex items-center rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-semibold text-text-primary"
				>
					{itemCount}
					{itemCount === 1 ? 'item' : 'items'}
				</span>
			</div>
			<div class="mt-0.5 text-[11px] text-text-muted">
				Calculated in compliance with Indian GST Schedule
			</div>
		</div>
	</div>

	<!-- Right: Metrics & Grand Total -->
	<div class="flex flex-wrap items-center gap-6 overflow-x-auto text-xs md:flex-nowrap">
		<!-- Subtotal & Discount -->
		<div class="min-w-[130px] space-y-1.5 border-r border-border pr-4">
			<div class="flex justify-between gap-3 text-text-muted">
				<span>Subtotal:</span>
				<span class="font-mono font-medium text-text-primary tabular-nums"
					>₹{subtotal.toFixed(2)}</span
				>
			</div>
			<div class="flex justify-between gap-3 text-text-muted">
				<span>Discount:</span>
				<span class="font-mono font-semibold text-danger tabular-nums">
					{discountTotal > 0 ? `-₹${discountTotal.toFixed(2)}` : '₹0.00'}
				</span>
			</div>
		</div>

		<!-- Tax & Round off -->
		<div class="min-w-[130px] space-y-1.5 border-r border-border pr-4">
			<div class="flex justify-between gap-3 text-text-muted">
				<span>Taxable:</span>
				<span class="font-mono font-medium text-text-primary tabular-nums"
					>₹{taxableTotal.toFixed(2)}</span
				>
			</div>
			<div class="flex justify-between gap-3 text-text-muted">
				<span>GST Total:</span>
				<span class="font-mono font-medium text-text-primary tabular-nums"
					>+₹{gstTotal.toFixed(2)}</span
				>
			</div>
			{#if Math.abs(roundOff) > 0.001}
				<div class="flex justify-between gap-3 text-text-muted">
					<span>Round Off:</span>
					<span class="font-mono font-medium text-text-secondary tabular-nums">
						{roundOff > 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}
					</span>
				</div>
			{/if}
		</div>

		<!-- Grand Total Display (Hero) -->
		<div
			class="flex min-w-[160px] flex-col justify-center rounded-lg border border-border bg-surface px-4 py-2 shadow-xs"
		>
			<div
				class="flex items-center justify-between text-[11px] font-bold tracking-widest text-text-muted uppercase"
			>
				<span>Grand Total</span>
				<span class="rounded bg-accent-light/50 px-1 text-[9px] font-bold text-accent">INR</span>
			</div>
			<div class="mt-0.5 font-mono text-2xl font-black tracking-tight text-accent tabular-nums">
				₹{grandTotal.toFixed(2)}
			</div>
		</div>
	</div>
</div>
