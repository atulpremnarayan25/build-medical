<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { PageHeader, LoadingState, EmptyState, Button, Badge } from '$lib/components/common/index.js';
	import SupplierForm from '$lib/components/forms/SupplierForm.svelte';
	import type { Supplier, CreateSupplierInput } from '$lib/types/supplier.js';
	import type { LedgerEntry } from '$lib/types/ledger.js';
	import { supplierService, ledgerService } from '$lib/services/index.js';
	import { goto } from '$app/navigation';
	import { addToast } from '$lib/stores/toastStore.svelte.js';
	import { Truck, CreditCard, ArrowUpRight, Plus, FileText } from '@lucide/svelte';
	import { formatCurrency, formatDate } from '$lib/utils/formatters.js';

	let supplierId = $derived($page.params.id as string);
	let supplier = $state<Supplier | null>(null);
	let recentActivity = $state<LedgerEntry[]>([]);
	let loading = $state(true);
	let isSaving = $state(false);

	onMount(async () => {
		try {
			const [fetchedSupplier, fetchedLedger] = await Promise.all([
				supplierService.getSupplier(supplierId),
				ledgerService.getLedgerByParty(supplierId)
			]);
			supplier = fetchedSupplier;

			// Show last 10 purchases / vouchers
			recentActivity = fetchedLedger
				.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
				.slice(0, 10);
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	});

	async function handleSave(data: CreateSupplierInput) {
		isSaving = true;
		try {
			await supplierService.updateSupplier(supplierId, data);
			addToast('success', 'Supplier updated successfully');
			goto('/suppliers');
		} catch (e) {
			console.error(e);
			addToast('error', 'Failed to update supplier');
		} finally {
			isSaving = false;
		}
	}

	function handleCancel() {
		goto('/suppliers');
	}
</script>

<div class="mx-auto max-w-4xl space-y-4">
	<PageHeader
		title={supplier ? `Supplier: ${supplier.name}` : 'Supplier Details'}
		backHref="/suppliers"
	>
		{#snippet actions()}
			<div class="flex gap-2">
				<Button variant="secondary" size="sm" onclick={() => goto(`/payments/pay?supplierId=${supplier?.id}`)}>
					Record Payment Voucher
				</Button>
				<Button variant="primary" size="sm" onclick={() => goto('/purchases/new')}>
					<Plus size={14} class="mr-1" />
					<span>+ Inward GRN</span>
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	{#if loading}
		<LoadingState message="Loading supplier details..." />
	{:else if !supplier}
		<EmptyState title="Not Found" message="The supplier you are looking for does not exist." />
	{:else}
		<!-- Quick Stats Area -->
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			<div class="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
				<div>
					<p class="text-[11px] font-bold uppercase tracking-wider text-text-muted">Total Payable Balance</p>
					<h3
						class="text-xl font-bold {supplier.outstandingBalance > 0
							? 'text-warning'
							: 'text-text-primary'} mt-0.5 font-mono tabular-nums"
					>
						{formatCurrency(supplier.outstandingBalance)}
					</h3>
				</div>
				<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-warning-light text-warning">
					<CreditCard size={18} />
				</div>
			</div>

			<div class="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
				<div>
					<p class="text-[11px] font-bold uppercase tracking-wider text-text-muted">Account Status & Compliance</p>
					<div class="mt-1.5 flex items-center gap-2">
						<Badge variant={supplier.active ? 'success' : 'neutral'} size="sm">
							{supplier.active ? 'Active Account' : 'Inactive'}
						</Badge>
						{#if supplier.gstin}
							<span class="font-mono text-xs font-semibold text-text-muted">GST: {supplier.gstin}</span>
						{/if}
					</div>
				</div>
				<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-light text-accent">
					<Truck size={18} />
				</div>
			</div>
		</div>

		<!-- Main Edit Form -->
		<SupplierForm {supplier} onSave={handleSave} onCancel={handleCancel} {isSaving} />

		<!-- Recent Activity -->
		<div class="overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
			<div class="flex items-center justify-between border-b border-border bg-surface-secondary px-4 py-2.5">
				<div class="flex items-center gap-2">
					<FileText size={15} class="text-accent" />
					<h3 class="text-xs font-bold uppercase tracking-wider text-text-primary">
						Supplier Ledger & Inward History
					</h3>
				</div>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead class="border-b border-border bg-surface-secondary text-[10px] font-bold uppercase tracking-wider text-text-muted">
						<tr>
							<th class="px-3.5 py-2">Date</th>
							<th class="px-3.5 py-2">Type</th>
							<th class="px-3.5 py-2">Particulars</th>
							<th class="px-3.5 py-2 text-right">Debit (₹)</th>
							<th class="px-3.5 py-2 text-right">Credit (₹)</th>
							<th class="px-3.5 py-2 text-right">Balance</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border-subtle">
						{#if recentActivity.length === 0}
							<tr>
								<td colspan="6" class="px-4 py-6 text-center text-text-muted">No recent ledger activity for this supplier.</td>
							</tr>
						{:else}
							{#each recentActivity as entry (entry.id)}
								<tr class="transition-colors hover:bg-surface-hover">
									<td class="px-3.5 py-2 whitespace-nowrap font-mono text-text-secondary">
										{formatDate(entry.date)}
									</td>
									<td class="px-3.5 py-2">
										<span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider {entry.type === 'purchase' ? 'bg-accent-light text-accent' : 'bg-success-light text-success'}">
											{entry.type.replace('-', ' ')}
										</span>
									</td>
									<td class="px-3.5 py-2">
										{#if entry.type === 'purchase'}
											<a
												href="/purchases/{entry.reference}"
												class="inline-flex items-center gap-1 font-mono font-semibold text-accent hover:underline group"
											>
												<span>{entry.particulars}</span>
												<ArrowUpRight size={11} class="opacity-0 group-hover:opacity-100 transition-opacity" />
											</a>
										{:else}
											<span class="text-text-primary">{entry.particulars}</span>
										{/if}
									</td>
									<td class="px-3.5 py-2 text-right font-mono tabular-nums text-text-primary">
										{entry.debit ? formatCurrency(entry.debit) : '-'}
									</td>
									<td class="px-3.5 py-2 text-right font-mono font-bold tabular-nums text-success">
										{entry.credit ? formatCurrency(entry.credit) : '-'}
									</td>
									<td
										class="px-3.5 py-2 text-right font-mono font-bold tabular-nums {entry.balance > 0
											? 'text-warning'
											: 'text-text-primary'}"
									>
										{formatCurrency(entry.balance)}
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
