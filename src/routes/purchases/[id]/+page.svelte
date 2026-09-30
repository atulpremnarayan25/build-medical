<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { purchaseService } from '$lib/services/index.js';
	import type { Purchase } from '$lib/types/index.js';
	import {
		PageHeader,
		LoadingState,
		EmptyState,
		Badge,
		Button
	} from '$lib/components/common/index.js';
	import { goto } from '$app/navigation';
	import { Printer, CreditCard, ArrowLeft, Building2 } from '@lucide/svelte';

	let purchaseId = $derived($page.params.id as string);
	let purchase = $state<Purchase | null>(null);
	let loading = $state(true);

	onMount(async () => {
		try {
			purchase = await purchaseService.getPurchase(purchaseId);
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	});

	function handlePrint() {
		window.print();
	}
</script>

<div class="mx-auto max-w-5xl space-y-4 print:max-w-none print:space-y-0">
	<!-- Top Bar / Actions (Screen only) -->
	<div class="print:hidden">
		<PageHeader
			title={purchase ? `Inward Voucher: ${purchase.invoiceNumber}` : 'Inward Purchase Details'}
			subtitle={purchase ? `Distributor: ${purchase.supplierName} • Received on ${new Date(purchase.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
			backHref="/purchases"
		>
			{#snippet actions()}
				{#if purchase}
					<Button variant="secondary" onclick={() => goto('/purchases')}>
						<ArrowLeft size={14} class="mr-1" />
						<span>Back to GRN List</span>
					</Button>
					{#if purchase.paymentStatus !== 'paid'}
						<Button
							variant="secondary"
							onclick={() => goto(`/payments/pay?purchaseId=${purchase?.id}`)}
						>
							<CreditCard size={14} class="mr-1" />
							<span>Record Outflow Payment</span>
						</Button>
					{/if}
					<Button variant="primary" onclick={handlePrint}>
						<Printer size={14} class="mr-1" />
						<span>Print Voucher</span>
					</Button>
				{/if}
			{/snippet}
		</PageHeader>
	</div>

	{#if loading}
		<LoadingState message="Loading purchase voucher details..." />
	{:else if !purchase}
		<EmptyState title="Purchase Voucher Not Found" message="The requested goods received note could not be located." />
	{:else}
		<!-- Main Voucher Container -->
		<div
			class="rounded-xl border border-border bg-surface p-6 shadow-2xs print:border-none print:bg-transparent print:p-0 print:shadow-none"
		>
			<!-- Inward Header -->
			<div
				class="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between print:border-gray-400 print:pb-4"
			>
				<div>
					<div class="flex items-center gap-2">
						<span class="rounded bg-accent-light px-2 py-0.5 font-mono text-xs font-bold text-accent uppercase">
							GRN Stock Voucher
						</span>
						<Badge variant={purchase.status === 'confirmed' ? 'success' : 'neutral'} size="sm">
							{purchase.status}
						</Badge>
						<Badge
							variant={purchase.paymentStatus === 'paid'
								? 'success'
								: purchase.paymentStatus === 'partial'
									? 'warning'
									: 'danger'}
							size="sm"
						>
							{purchase.paymentStatus}
						</Badge>
					</div>

					<h1 class="mt-2 text-xl font-black text-text-primary tracking-tight">
						INWARD PURCHASE #{purchase.invoiceNumber}
					</h1>

					<div class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
						<div>
							Invoice Date: <span class="font-medium text-text-primary">{new Date(purchase.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
						</div>
						{#if purchase.notes}
							<div>• {purchase.notes}</div>
						{/if}
					</div>
				</div>

				<div class="flex flex-col sm:items-end">
					<div class="flex items-center gap-1.5 text-xs font-bold text-text-muted uppercase">
						<Building2 size={13} />
						<span>Distributor / Supplier</span>
					</div>
					<a
						href="/suppliers/{purchase.supplierId}"
						class="mt-1 font-bold text-sm text-accent hover:underline"
					>
						{purchase.supplierName}
					</a>
					<div class="mt-0.5 text-xs text-text-muted">
						Payment Terms: <span class="font-semibold uppercase text-text-primary">{purchase.paymentMethod}</span>
					</div>
				</div>
			</div>

			<!-- Inward Batch Line Items Table -->
			<div class="mt-5 overflow-x-auto rounded-lg border border-border print:border-gray-300">
				<table class="w-full text-left text-xs">
					<thead class="border-b border-border bg-surface-secondary text-[11px] font-semibold text-text-secondary uppercase print:bg-gray-100">
						<tr>
							<th class="w-10 px-3 py-2.5 text-center">#</th>
							<th class="px-3 py-2.5">Product Description</th>
							<th class="px-3 py-2.5">Batch / Expiry</th>
							<th class="px-3 py-2.5 text-right">Inward Qty</th>
							<th class="px-3 py-2.5 text-right">Free Qty</th>
							<th class="px-3 py-2.5 text-right">Pur. Rate (₹)</th>
							<th class="px-3 py-2.5 text-right">Trade Dis%</th>
							<th class="px-3 py-2.5 text-right">GST%</th>
							<th class="px-3 py-2.5 text-right">Line Amount (₹)</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border/60 print:divide-gray-300">
						{#each purchase.items as item, index (item.id)}
							<tr class="hover:bg-surface-hover/50 print:hover:bg-transparent">
								<td class="px-3 py-2.5 text-center font-mono text-text-muted tabular-nums">{index + 1}</td>
								<td class="px-3 py-2.5 font-semibold text-text-primary">
									<div>{item.productName}</div>
								</td>
								<td class="px-3 py-2.5">
									<div class="font-mono font-bold text-text-primary uppercase">{item.batchNumber}</div>
									<div class="font-mono text-[11px] text-text-muted">EXP: {item.expiryDate.substring(0, 7)}</div>
								</td>
								<td class="px-3 py-2.5 text-right font-mono font-bold text-text-primary tabular-nums">
									{item.quantity}
								</td>
								<td class="px-3 py-2.5 text-right font-mono text-text-muted tabular-nums">
									{#if item.freeQuantity && item.freeQuantity > 0}
										<span class="font-semibold text-accent">+{item.freeQuantity} Free</span>
									{:else}
										0
									{/if}
								</td>
								<td class="px-3 py-2.5 text-right font-mono text-text-primary tabular-nums">
									₹{item.purchaseRate.toFixed(2)}
								</td>
								<td class="px-3 py-2.5 text-right font-mono tabular-nums">
									{#if item.discount > 0}
										<span class="text-danger">-{item.discount}%</span>
									{:else}
										<span class="text-text-muted">0%</span>
									{/if}
								</td>
								<td class="px-3 py-2.5 text-right font-mono text-text-secondary tabular-nums">
									{item.gstRate}%
								</td>
								<td class="px-3 py-2.5 text-right font-mono font-bold text-text-primary tabular-nums">
									₹{(item.quantity * item.purchaseRate * (1 - item.discount / 100)).toFixed(2)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Summary and Payables Grid -->
			<div class="mt-6 flex flex-col justify-end gap-6 sm:flex-row">
				<div class="w-full sm:max-w-xs space-y-2 rounded-lg border border-border bg-surface-secondary p-4 text-xs">
					<div class="flex justify-between text-text-secondary">
						<span>Gross Subtotal:</span>
						<span class="font-mono font-medium text-text-primary tabular-nums">₹{purchase.subtotal.toFixed(2)}</span>
					</div>
					<div class="flex justify-between text-text-secondary">
						<span>Trade Discount:</span>
						<span class="font-mono font-medium text-danger tabular-nums">-₹{purchase.discountTotal.toFixed(2)}</span>
					</div>
					<div class="flex justify-between text-text-secondary">
						<span>Taxable Value:</span>
						<span class="font-mono font-medium text-text-primary tabular-nums">₹{purchase.taxableTotal.toFixed(2)}</span>
					</div>
					<div class="flex justify-between text-text-secondary">
						<span>Total GST (Inward Tax Credit):</span>
						<span class="font-mono font-medium text-accent tabular-nums">+₹{purchase.gstTotal.toFixed(2)}</span>
					</div>
					<div class="flex justify-between text-text-secondary">
						<span>Round Off:</span>
						<span class="font-mono font-medium text-text-muted tabular-nums">
							{purchase.roundOff >= 0 ? '+' : ''}₹{purchase.roundOff.toFixed(2)}
						</span>
					</div>

					<div class="border-t border-border pt-2 flex justify-between items-baseline font-bold text-text-primary">
						<span class="text-xs uppercase tracking-wider">Grand Total:</span>
						<span class="font-mono text-xl text-accent tabular-nums">₹{purchase.grandTotal.toFixed(2)}</span>
					</div>

					{#if purchase.paidAmount > 0}
						<div class="flex justify-between border-t border-border/60 pt-1 text-success font-semibold">
							<span>Paid Outflow:</span>
							<span class="font-mono tabular-nums">₹{purchase.paidAmount.toFixed(2)}</span>
						</div>
					{/if}

					{#if purchase.dueAmount > 0}
						<div class="flex justify-between text-warning font-bold">
							<span>Payable Balance:</span>
							<span class="font-mono tabular-nums">₹{purchase.dueAmount.toFixed(2)}</span>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
