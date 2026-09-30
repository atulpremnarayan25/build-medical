<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { PageHeader, LoadingState, EmptyState, Button } from '$lib/components/common/index.js';
	import CustomerForm from '$lib/components/forms/CustomerForm.svelte';
	import type { Customer, CreateCustomerInput } from '$lib/types/customer.js';
	import type { LedgerEntry } from '$lib/types/ledger.js';
	import { customerService, ledgerService } from '$lib/services/index.js';
	import { goto } from '$app/navigation';
	import { addToast } from '$lib/stores/toastStore.svelte.js';
	import { formatCurrency, formatDate } from '$lib/utils/formatters.js';

	let customerId = $derived($page.params.id as string);
	let customer = $state<Customer | null>(null);
	let recentActivity = $state<LedgerEntry[]>([]);
	let loading = $state(true);
	let isSaving = $state(false);

	onMount(async () => {
		try {
			const [fetchedCustomer, fetchedLedger] = await Promise.all([
				customerService.getCustomer(customerId),
				ledgerService.getLedgerByParty(customerId)
			]);
			customer = fetchedCustomer;

			// Show last 10 activities chronologically
			recentActivity = fetchedLedger
				.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
				.slice(0, 10);
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	});

	async function handleSave(data: CreateCustomerInput) {
		isSaving = true;
		try {
			await customerService.updateCustomer(customerId, data);
			addToast('success', 'Customer updated successfully');
			goto('/customers');
		} catch (e) {
			console.error(e);
			addToast('error', 'Failed to update customer');
		} finally {
			isSaving = false;
		}
	}

	function handleCancel() {
		goto('/customers');
	}
</script>

<div class="mx-auto max-w-4xl space-y-4">
	<PageHeader
		title={customer ? `Customer: ${customer.name}` : 'Customer Details'}
		backHref="/customers"
	/>

	{#if loading}
		<LoadingState message="Loading customer details..." />
	{:else if !customer}
		<EmptyState title="Not Found" message="The customer you are looking for does not exist." />
	{:else}
		<!-- Quick Stats Area -->
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			<div
				class="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 shadow-2xs"
			>
				<div>
					<p class="text-[11px] font-bold uppercase tracking-wider text-text-muted">Outstanding Balance</p>
					<h3
						class="text-xl font-bold font-mono tabular-nums {customer.outstandingBalance > 0
							? 'text-warning'
							: 'text-text-primary'} mt-0.5"
					>
						{formatCurrency(customer.outstandingBalance)}
					</h3>
				</div>
			</div>

			<div
				class="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 shadow-2xs"
			>
				<div>
					<p class="text-[11px] font-bold uppercase tracking-wider text-text-muted">Approved Credit Limit</p>
					<h3 class="mt-0.5 text-xl font-bold font-mono tabular-nums text-text-primary">
						{formatCurrency(customer.creditLimit)}
					</h3>
				</div>
			</div>
		</div>

		<!-- Main Edit Form -->
		<CustomerForm {customer} onSave={handleSave} onCancel={handleCancel} {isSaving} />

		<!-- Recent Activity / Ledger -->
		<div
			class="overflow-hidden rounded-xl border border-border bg-surface shadow-2xs"
		>
			<div
				class="flex items-center justify-between border-b border-border bg-surface-secondary px-4 py-2.5"
			>
				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider text-text-primary">
						Customer Account Ledger (Recent Transactions)
					</h3>
					<p class="text-[11px] text-text-muted">Double-entry audit trail & voucher records</p>
				</div>
				<Button
					variant="secondary"
					size="sm"
					onclick={() => goto(`/payments/receive?customerId=${customer?.id}`)}
				>
					+ Record Receipt Voucher
				</Button>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead
						class="border-b border-border bg-surface-secondary text-[10px] font-bold uppercase tracking-wider text-text-muted"
					>
						<tr>
							<th class="px-3.5 py-2">Date</th>
							<th class="px-3.5 py-2">Type</th>
							<th class="px-3.5 py-2">Particulars</th>
							<th class="px-3.5 py-2 text-right">Debit (Dr)</th>
							<th class="px-3.5 py-2 text-right">Credit (Cr)</th>
							<th class="px-3.5 py-2 text-right">Balance</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border-subtle">
						{#if recentActivity.length === 0}
							<tr>
								<td colspan="6" class="px-4 py-6 text-center text-text-muted"
									>No transactions recorded in ledger for this customer account.</td
								>
							</tr>
						{:else}
							{#each recentActivity as entry (entry.id)}
								<tr class="transition-colors hover:bg-surface-hover">
									<td class="px-3.5 py-2 whitespace-nowrap font-mono text-text-secondary"
										>{formatDate(entry.date)}</td
									>
									<td class="px-3.5 py-2">
										<span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider {entry.type === 'sale' ? 'bg-accent-light text-accent' : 'bg-success-light text-success'}">
											{entry.type.replace('-', ' ')}
										</span>
									</td>
									<td class="px-3.5 py-2">
										{#if entry.type === 'sale'}
											<a href="/sales/{entry.reference}" class="font-medium text-accent hover:underline"
												>{entry.particulars}</a
											>
										{:else}
											<span class="text-text-primary">{entry.particulars}</span>
										{/if}
									</td>
									<td class="px-3.5 py-2 text-right font-mono tabular-nums text-text-primary"
										>{entry.debit ? formatCurrency(entry.debit) : '-'}</td
									>
									<td class="px-3.5 py-2 text-right font-mono tabular-nums text-success"
										>{entry.credit ? formatCurrency(entry.credit) : '-'}</td
									>
									<td
										class="px-3.5 py-2 text-right font-mono font-bold tabular-nums {entry.balance > 0
											? 'text-warning'
											: 'text-text-primary'}">{formatCurrency(entry.balance)}</td
									>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
