<script lang="ts">
	import type { Customer, PaymentMethod, CreateSaleItemInput } from '$lib/types/index.js';
	import { formatCurrency } from '$lib/utils/formatters.js';
	import { X, Clock, Play, Trash2, User, Pill, ArrowRight, ShieldAlert } from '@lucide/svelte';

	export interface HeldBill {
		id: string;
		invoiceNumber: string;
		timestamp: string;
		customer: Customer | null;
		customerType: 'retail' | 'wholesale';
		paymentType: PaymentMethod;
		amountTendered: number;
		patientName: string;
		prescriberName: string;
		prescriberRegNo: string;
		items: (CreateSaleItemInput & {
			uiKey: number;
			drugSchedule?: string;
			availableStock?: number;
		})[];
		totalAmount: number;
	}

	let {
		open = $bindable(false),
		heldBills = [],
		onRecall,
		onDiscard,
		onclose
	}: {
		open: boolean;
		heldBills: HeldBill[];
		onRecall: (bill: HeldBill) => void;
		onDiscard: (id: string) => void;
		onclose: () => void;
	} = $props();

	function formatTime(iso: string) {
		try {
			const d = new Date(iso);
			return d.toLocaleTimeString('en-IN', {
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit'
			});
		} catch {
			return iso;
		}
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
		role="dialog"
		aria-modal="true"
	>
		<!-- Backdrop click to close -->
		<div class="fixed inset-0" onclick={onclose} role="presentation"></div>

		<div
			class="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
		>
			<!-- Header -->
			<div
				class="flex items-center justify-between border-b border-border bg-surface-secondary px-5 py-3.5"
			>
				<div class="flex items-center gap-2.5">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-light text-warning"
					>
						<Clock size={18} />
					</div>
					<div>
						<h2 class="text-sm font-bold text-text-primary">
							Parked Counter Invoices (Hold Queue)
						</h2>
						<p class="text-xs text-text-muted">
							Recall or discard pending counter transactions (F6)
						</p>
					</div>
				</div>
				<button
					type="button"
					onclick={onclose}
					class="rounded-lg p-1 text-text-muted hover:bg-surface-hover hover:text-text-primary"
					aria-label="Close"
				>
					<X size={18} />
				</button>
			</div>

			<!-- Body: List of Held Bills -->
			<div class="flex-1 space-y-3 overflow-y-auto p-4">
				{#if heldBills.length === 0}
					<div class="py-12 text-center text-text-muted">
						<Clock size={32} class="mx-auto mb-2 text-text-muted opacity-40" />
						<p class="text-sm font-semibold text-text-primary">No Invoices Currently on Hold</p>
						<p class="mt-1 text-xs text-text-muted">
							Press <kbd
								class="rounded border border-border bg-surface-secondary px-1.5 py-0.5 font-mono text-[11px] font-bold"
								>F6</kbd
							> on any active bill to temporarily hold and serve another customer.
						</p>
					</div>
				{:else}
					{#each heldBills as bill (bill.id)}
						<div
							class="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3.5 transition-all hover:border-accent/40 hover:shadow-2xs sm:flex-row sm:items-center sm:justify-between"
						>
							<div class="min-w-0 space-y-1.5">
								<div class="flex flex-wrap items-center gap-2">
									<span
										class="rounded border border-accent/20 bg-accent-light/50 px-2 py-0.5 font-mono text-[11px] font-bold text-accent"
									>
										{bill.invoiceNumber}
									</span>
									<span class="text-xs font-semibold text-text-primary">
										{bill.customer ? bill.customer.name : 'Walk-in Cash Customer'}
									</span>
									<span
										class="rounded bg-surface-secondary px-1.5 py-0.5 font-mono text-[11px] text-text-muted uppercase"
									>
										{bill.customerType} • {bill.paymentType}
									</span>
								</div>

								<div class="flex flex-wrap items-center gap-3 text-xs text-text-muted">
									<span
										>Time: <strong class="font-mono text-text-secondary"
											>{formatTime(bill.timestamp)}</strong
										></span
									>
									<span>•</span>
									<span
										>Items: <strong class="font-semibold text-text-secondary"
											>{bill.items.length}</strong
										></span
									>
									<span>•</span>
									<span
										>Est. Total: <strong class="font-mono font-bold text-text-primary"
											>{formatCurrency(bill.totalAmount)}</strong
										></span
									>
								</div>

								<!-- Items preview snippet -->
								<div class="max-w-md truncate text-[11px] text-text-muted">
									{bill.items.map((i) => `${i.productName} (x${i.quantity})`).join(', ')}
								</div>
							</div>

							<!-- Action Buttons -->
							<div class="flex shrink-0 items-center gap-2">
								<button
									type="button"
									onclick={() => onDiscard(bill.id)}
									class="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger-light/50"
									title="Discard this parked bill"
								>
									<Trash2 size={13} />
									<span>Discard</span>
								</button>

								<button
									type="button"
									onclick={() => onRecall(bill)}
									class="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-accent-hover"
									title="Restore this bill to active terminal"
								>
									<Play size={13} />
									<span>Recall (Resume)</span>
								</button>
							</div>
						</div>
					{/each}
				{/if}
			</div>

			<!-- Footer -->
			<div
				class="flex items-center justify-between border-t border-border bg-surface-secondary px-5 py-3 text-xs text-text-muted"
			>
				<span>{heldBills.length} parked {heldBills.length === 1 ? 'bill' : 'bills'} in memory</span>
				<button
					type="button"
					onclick={onclose}
					class="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-hover hover:text-text-primary"
				>
					Close (Esc)
				</button>
			</div>
		</div>
	</div>
{/if}
