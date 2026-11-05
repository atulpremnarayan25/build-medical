<script lang="ts">
	import type { Customer, Sale, SaleItem } from '$lib/types/index.js';
	import { saleService } from '$lib/services/index.js';
	import { X, Clock, Pill, Repeat, Plus, AlertCircle, Calendar, User, FileText } from '@lucide/svelte';

	let {
		open = $bindable(false),
		customer,
		onRepeatItem,
		onRepeatAll
	}: {
		open: boolean;
		customer: Customer | null;
		onRepeatItem: (item: SaleItem) => void;
		onRepeatAll: (items: SaleItem[]) => void;
	} = $props();

	let sales = $state<Sale[]>([]);
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	$effect(() => {
		if (open && customer?.id) {
			loadCustomerHistory(customer.id);
		} else if (!open) {
			sales = [];
			error = null;
		}
	});

	async function loadCustomerHistory(customerId: string) {
		isLoading = true;
		error = null;
		try {
			const res = await saleService.getSalesByCustomer(customerId);
			// Filter out cancelled sales
			sales = (res || []).filter((s) => s.status !== 'cancelled');
		} catch (err) {
			console.error('Failed to load patient history:', err);
			error = 'Failed to load prescription history';
		} finally {
			isLoading = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			e.preventDefault();
			open = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs select-none"
	>
		<div
			class="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-border bg-surface shadow-2xl"
		>
			<!-- Modal Header -->
			<div class="flex items-center justify-between border-b border-border px-5 py-3.5">
				<div class="flex items-center gap-2.5">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent"
					>
						<Clock size={18} />
					</div>
					<div>
						<h2 class="text-sm font-bold text-text-primary">
							Patient Prescription History & Re-order
						</h2>
						<p class="text-xs text-text-muted">
							{customer ? `${customer.name} (${customer.phone || 'No phone'})` : 'No customer selected'}
						</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => (open = false)}
					class="pressable flex h-7 w-7 items-center justify-center rounded-lg border border-border text-text-muted hover:bg-surface-hover hover:text-text-primary"
					aria-label="Close patient history modal"
				>
					<X size={16} />
				</button>
			</div>

			<!-- Modal Body -->
			<div class="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
				{#if !customer}
					<div class="py-12 text-center text-text-muted">
						<User size={36} class="mx-auto mb-2 opacity-30" />
						<p class="text-sm font-semibold">Select a customer first</p>
						<p class="text-xs text-text-muted mt-1">
							Please select an existing registered customer to view past prescriptions.
						</p>
					</div>
				{:else if isLoading}
					<div class="py-16 text-center text-text-muted">
						<span
							class="inline-block h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent"
						></span>
						<p class="mt-2 text-xs font-semibold">Loading patient prescriptions...</p>
					</div>
				{:else if error}
					<div
						class="rounded-lg border border-danger/30 bg-danger-light/40 p-4 text-center text-xs text-danger"
					>
						<AlertCircle size={20} class="mx-auto mb-1 text-danger" />
						<span>{error}</span>
					</div>
				{:else if sales.length === 0}
					<div class="py-12 text-center text-text-muted">
						<FileText size={36} class="mx-auto mb-2 opacity-30" />
						<p class="text-sm font-semibold">No prior prescription history found</p>
						<p class="text-xs text-text-muted mt-1">
							This customer has no completed past invoices recorded in the system.
						</p>
					</div>
				{:else}
					{#each sales as sale}
						<div
							class="rounded-xl border border-border bg-surface-secondary/40 p-3.5 transition-colors hover:border-accent/40"
						>
							<!-- Invoice Summary Header -->
							<div class="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
								<div class="flex items-center gap-2">
									<span class="rounded bg-accent/15 px-2 py-0.5 font-mono text-xs font-bold text-accent">
										{sale.invoiceNumber}
									</span>
									<span class="flex items-center gap-1 text-xs text-text-muted">
										<Calendar size={12} />
										<span>{new Date(sale.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
									</span>
									{#if (sale as any).prescriberName}
										<span class="rounded bg-surface-secondary px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
											Dr. {(sale as any).prescriberName}
										</span>
									{/if}
								</div>
								<div class="flex items-center gap-3">
									<span class="font-mono text-xs font-bold text-text-primary">
										₹{sale.grandTotal.toFixed(2)}
									</span>
									<button
										type="button"
										onclick={() => {
											onRepeatAll(sale.items);
											open = false;
										}}
										class="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-xs font-bold text-white shadow-2xs hover:bg-accent-hover transition-transform active:scale-95"
									>
										<Repeat size={12} />
										<span>Repeat Bill ({sale.items.length})</span>
									</button>
								</div>
							</div>

							<!-- Items In This Prescription -->
							<div class="mt-2.5 divide-y divide-border/40">
								{#each sale.items as item}
									<div class="flex items-center justify-between py-1.5 text-xs">
										<div class="flex items-center gap-2">
											<Pill size={13} class="text-text-muted shrink-0" />
											<span class="font-semibold text-text-primary">{item.productName}</span>
											<span class="font-mono text-[11px] text-text-muted">
												Qty: <strong>{item.quantity}</strong>
											</span>
											{#if item.batchNumber}
												<span class="rounded border border-border bg-surface px-1 font-mono text-[10px] text-text-muted">
													Batch {item.batchNumber}
												</span>
											{/if}
										</div>
										<div class="flex items-center gap-2">
											<span class="font-mono text-xs text-text-secondary tabular-nums">
												₹{(item.totalAmount ?? (item.quantity * item.rate)).toFixed(2)}
											</span>
											<button
												type="button"
												onclick={() => {
													onRepeatItem(item);
												}}
												class="pressable flex items-center gap-1 rounded border border-border bg-surface px-2 py-0.5 text-[11px] font-semibold text-text-secondary hover:border-accent hover:text-accent"
												title="Add single item to bill"
											>
												<Plus size={11} />
												<span>Add</span>
											</button>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				{/if}
			</div>

			<!-- Modal Footer -->
			<div class="flex items-center justify-between border-t border-border bg-surface-secondary/40 px-5 py-2.5 text-xs text-text-muted">
				<span>Press <kbd class="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px]">Esc</kbd> to close</span>
				<button
					type="button"
					onclick={() => (open = false)}
					class="rounded-lg border border-border bg-surface px-3 py-1 font-semibold text-text-primary hover:bg-surface-hover"
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}
