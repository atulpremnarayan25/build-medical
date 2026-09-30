<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { PageHeader, LoadingState, Button, Modal } from '$lib/components/common/index.js';
	import { formatCurrency, formatDate } from '$lib/utils/formatters.js';
	import { FileSpreadsheet, Printer, Search, IndianRupee, Users, Building2, FileText } from '@lucide/svelte';

	interface PartySummary {
		id: string;
		name: string;
		phone: string | null;
		gstin: string | null;
		creditLimit?: number | null;
		customerType?: string;
		totalBilled?: number;
		totalPurchased?: number;
		totalPaid: number;
		balanceDue?: number;
		balancePayable?: number;
	}

	interface LedgerTransaction {
		id: string;
		date: string;
		ref: string;
		type: string;
		debit: number;
		credit: number;
		particulars: string;
		balance: number;
	}

	interface PartyStatement {
		party: {
			id: string;
			name: string;
			phone: string | null;
			gstin: string | null;
			creditLimit?: number | null;
			type: 'customer' | 'supplier';
		};
		closingBalance: number;
		transactions: LedgerTransaction[];
	}

	let ledgerType = $state<'receivable' | 'payable'>($page.url.searchParams.get('type') === 'payable' ? 'payable' : 'receivable');
	let summaries = $state<PartySummary[]>([]);
	let loading = $state(true);
	let searchQuery = $state('');

	// Modal statement view
	let isStatementOpen = $state(false);
	let statementLoading = $state(false);
	let activeStatement = $state<PartyStatement | null>(null);

	async function loadLedger(type: 'receivable' | 'payable') {
		ledgerType = type;
		loading = true;
		try {
			const res = await fetch(`/api/reports/ledger?type=${type}`);
			if (res.ok) {
				summaries = await res.json();
			}
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	}

	async function openStatement(partyId: string) {
		isStatementOpen = true;
		statementLoading = true;
		try {
			const res = await fetch(`/api/reports/ledger?type=${ledgerType}&partyId=${partyId}`);
			if (res.ok) {
				activeStatement = await res.json();
			}
		} catch (e) {
			console.error(e);
		} finally {
			statementLoading = false;
		}
	}

	onMount(() => {
		loadLedger(ledgerType);
	});

	let filteredSummaries = $derived(
		summaries.filter((p) => {
			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			return (
				p.name.toLowerCase().includes(q) ||
				(p.phone && p.phone.includes(q)) ||
				(p.gstin && p.gstin.toLowerCase().includes(q))
			);
		})
	);

	let totalBalance = $derived(
		filteredSummaries.reduce((acc, p) => acc + (ledgerType === 'receivable' ? (p.balanceDue || 0) : (p.balancePayable || 0)), 0)
	);
	let totalBilledOrPurchased = $derived(
		filteredSummaries.reduce((acc, p) => acc + (ledgerType === 'receivable' ? (p.totalBilled || 0) : (p.totalPurchased || 0)), 0)
	);
	let totalPaidSum = $derived(
		filteredSummaries.reduce((acc, p) => acc + p.totalPaid, 0)
	);

	function exportCSV() {
		const headers = [
			'Party Name',
			'Type',
			'Phone',
			'GSTIN',
			ledgerType === 'receivable' ? 'Credit Limit (₹)' : '',
			ledgerType === 'receivable' ? 'Total Invoiced (₹)' : 'Total Inward (₹)',
			'Total Paid (₹)',
			ledgerType === 'receivable' ? 'Balance Due (₹)' : 'Balance Payable (₹)'
		].filter(Boolean);

		const rows = filteredSummaries.map((p) => {
			const row = [
				`"${p.name}"`,
				p.customerType || (ledgerType === 'receivable' ? 'Customer' : 'Supplier'),
				p.phone || '-',
				p.gstin || '-'
			];
			if (ledgerType === 'receivable') {
				row.push(p.creditLimit ? p.creditLimit.toFixed(2) : '-');
				row.push((p.totalBilled || 0).toFixed(2));
			} else {
				row.push((p.totalPurchased || 0).toFixed(2));
			}
			row.push(p.totalPaid.toFixed(2));
			row.push((ledgerType === 'receivable' ? (p.balanceDue || 0) : (p.balancePayable || 0)).toFixed(2));
			return row;
		});

		const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', encodedUri);
		link.setAttribute('download', `${ledgerType}_ledger_summary.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
</script>

<svelte:head>
	<title>{ledgerType === 'receivable' ? 'Customer Receivables & Khata Ledger' : 'Supplier Payables Ledger'} - MedStock ERP</title>
</svelte:head>

<div class="space-y-4">
	<PageHeader
		title={ledgerType === 'receivable' ? 'Customer Receivables & Khata Aging Ledger' : 'Supplier Payables & Remittance Ledger'}
		subtitle="Real-time debtor/creditor balances, turnover realization, credit limits, and running statement of accounts"
		backHref="/reports"
	>
		{#snippet actions()}
			<div class="flex gap-2">
				<Button variant="secondary" size="sm" onclick={exportCSV} disabled={filteredSummaries.length === 0}>
					<FileSpreadsheet size={14} class="mr-1 text-success" />
					<span>Export Summary CSV</span>
				</Button>
				<Button variant="secondary" size="sm" onclick={() => window.print()}>
					<Printer size={14} class="mr-1 text-text-muted" />
					<span>Print</span>
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	<!-- Type Toggle and Search Strip -->
	<div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 shadow-2xs">
		<!-- Toggle Tab -->
		<div class="flex items-center gap-1 rounded-lg border border-border bg-surface-secondary p-1 text-xs">
			<button
				type="button"
				class="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all {ledgerType === 'receivable'
					? 'bg-surface font-semibold text-accent shadow-2xs'
					: 'text-text-secondary hover:text-text-primary'}"
				onclick={() => loadLedger('receivable')}
			>
				<Users size={14} />
				<span>Customer Receivables (Debtors)</span>
			</button>
			<button
				type="button"
				class="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all {ledgerType === 'payable'
					? 'bg-surface font-semibold text-accent shadow-2xs'
					: 'text-text-secondary hover:text-text-primary'}"
				onclick={() => loadLedger('payable')}
			>
				<Building2 size={14} />
				<span>Supplier Payables (Creditors)</span>
			</button>
		</div>

		<!-- Search -->
		<div class="relative flex-1 max-w-md">
			<Search size={14} class="absolute top-1/2 left-3 -translate-y-1/2 text-text-muted" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder={`Search ${ledgerType === 'receivable' ? 'customer' : 'supplier'} name, phone, GSTIN...`}
				class="w-full rounded-md border border-border bg-surface py-1.5 pr-3 pl-8 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
			/>
		</div>
	</div>

	<!-- Ledger Summary Cards -->
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="text-[10px] font-bold uppercase tracking-wider text-text-muted">
				{ledgerType === 'receivable' ? 'Net Outstanding Receivable' : 'Net Outstanding Payable'}
			</div>
			<div class="mt-1 font-mono text-lg font-bold tabular-nums {totalBalance > 0 ? (ledgerType === 'receivable' ? 'text-danger' : 'text-danger') : 'text-success'}">
				{formatCurrency(totalBalance)}
			</div>
			<div class="text-[10px] text-text-muted">
				{filteredSummaries.filter(p => (ledgerType === 'receivable' ? (p.balanceDue || 0) : (p.balancePayable || 0)) > 0).length} parties with open balance
			</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="text-[10px] font-bold uppercase tracking-wider text-text-muted">
				{ledgerType === 'receivable' ? 'Total Cumulative Sales Billed' : 'Total Cumulative Purchases'}
			</div>
			<div class="mt-1 font-mono text-lg font-bold text-text-primary tabular-nums">
				{formatCurrency(totalBilledOrPurchased)}
			</div>
			<div class="text-[10px] text-text-muted">Lifetime transaction volume</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total Remittances / Receipts</div>
			<div class="mt-1 font-mono text-lg font-bold text-success tabular-nums">
				{formatCurrency(totalPaidSum)}
			</div>
			<div class="text-[10px] text-text-muted">Realized voucher settlements</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Realization / Settlement Rate</div>
			<div class="mt-1 font-mono text-lg font-bold text-accent tabular-nums">
				{totalBilledOrPurchased > 0 ? ((totalPaidSum / totalBilledOrPurchased) * 100).toFixed(1) : 100}%
			</div>
			<div class="text-[10px] text-text-muted">Turnover collection efficiency</div>
		</div>
	</div>

	<!-- Master Ledger Table -->
	{#if loading}
		<LoadingState message="Compiling double-entry party ledgers..." />
	{:else if filteredSummaries.length === 0}
		<div class="rounded-xl border border-border bg-surface p-8 text-center text-xs text-text-muted">
			<IndianRupee size={32} class="mx-auto mb-2 opacity-40 text-text-muted" />
			No party accounts found matching the criteria.
		</div>
	{:else}
		<div class="overflow-x-auto rounded-xl border border-border bg-surface shadow-2xs">
			<table class="w-full text-left text-xs">
				<thead class="border-b border-border bg-surface-secondary text-[10px] font-bold uppercase tracking-wider text-text-muted">
					<tr>
						<th class="px-3 py-2.5">Party / Account Name</th>
						<th class="px-3 py-2.5">Contact Details</th>
						<th class="px-3 py-2.5">GSTIN</th>
						{#if ledgerType === 'receivable'}
							<th class="px-3 py-2.5 text-right">Credit Limit (₹)</th>
							<th class="px-3 py-2.5 text-right">Total Invoiced (₹)</th>
						{:else}
							<th class="px-3 py-2.5 text-right">Total Inward Bills (₹)</th>
						{/if}
						<th class="px-3 py-2.5 text-right">Total Settled (₹)</th>
						<th class="px-3 py-2.5 text-right">Outstanding Balance (₹)</th>
						<th class="px-3 py-2.5 text-center">Action</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border">
					{#each filteredSummaries as party}
						{@const balance = ledgerType === 'receivable' ? (party.balanceDue || 0) : (party.balancePayable || 0)}
						<tr class="hover:bg-surface-hover transition-colors">
							<td class="px-3 py-2 font-semibold text-text-primary">
								{party.name}
								{#if party.customerType}
									<span class="ml-1.5 rounded bg-surface-secondary px-1.5 py-0.5 text-[9px] font-bold uppercase text-text-muted">
										{party.customerType}
									</span>
								{/if}
							</td>
							<td class="px-3 py-2 font-mono text-[11px] text-text-secondary">
								{party.phone || '-'}
							</td>
							<td class="px-3 py-2 font-mono text-[11px] text-text-muted">
								{party.gstin || '-'}
							</td>
							{#if ledgerType === 'receivable'}
								<td class="px-3 py-2 text-right font-mono tabular-nums text-text-muted">
									{party.creditLimit ? formatCurrency(party.creditLimit) : 'No Limit'}
								</td>
								<td class="px-3 py-2 text-right font-mono tabular-nums text-text-secondary">
									{formatCurrency(party.totalBilled || 0)}
								</td>
							{:else}
								<td class="px-3 py-2 text-right font-mono tabular-nums text-text-secondary">
									{formatCurrency(party.totalPurchased || 0)}
								</td>
							{/if}
							<td class="px-3 py-2 text-right font-mono tabular-nums text-success">
								{formatCurrency(party.totalPaid)}
							</td>
							<td class="px-3 py-2 text-right font-mono font-bold tabular-nums {balance > 0 ? 'text-danger' : 'text-text-muted'}">
								{formatCurrency(balance)}
							</td>
							<td class="px-3 py-2 text-center">
								<button
									type="button"
									class="rounded border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-accent hover:bg-surface-secondary transition-colors"
									onclick={() => openStatement(party.id)}
								>
									Statement
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
				<tfoot class="border-t-2 border-border bg-surface-secondary font-bold text-xs">
					<tr>
						<td colspan={ledgerType === 'receivable' ? 4 : 3} class="px-3 py-2.5 text-right uppercase tracking-wider text-[10px] text-text-muted">
							Total Ledger Balances:
						</td>
						<td class="px-3 py-2.5 text-right font-mono tabular-nums text-text-primary">{formatCurrency(totalBilledOrPurchased)}</td>
						<td class="px-3 py-2.5 text-right font-mono tabular-nums text-success">{formatCurrency(totalPaidSum)}</td>
						<td class="px-3 py-2.5 text-right font-mono tabular-nums text-danger">{formatCurrency(totalBalance)}</td>
						<td></td>
					</tr>
				</tfoot>
			</table>
		</div>
	{/if}
</div>

<!-- Detailed Statement Dialog Modal -->
<Modal bind:open={isStatementOpen} title={activeStatement ? `${activeStatement.party.name} - Statement of Account` : 'Party Statement'} size="lg">
	{#if statementLoading}
		<LoadingState message="Fetching statement line items..." />
	{:else if activeStatement}
		<div class="space-y-4">
			<!-- Header Info Box -->
			<div class="flex flex-wrap items-center justify-between rounded-lg border border-border bg-surface-secondary p-3 text-xs">
				<div>
					<div class="font-bold text-text-primary">{activeStatement.party.name}</div>
					{#if activeStatement.party.gstin}
						<div class="font-mono text-[10px] text-text-muted">GSTIN: {activeStatement.party.gstin}</div>
					{/if}
					{#if activeStatement.party.phone}
						<div class="font-mono text-[10px] text-text-muted">Phone: {activeStatement.party.phone}</div>
					{/if}
				</div>
				<div class="text-right">
					<div class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Current Closing Balance</div>
					<div class="font-mono text-base font-bold tabular-nums {activeStatement.closingBalance > 0 ? 'text-danger' : 'text-success'}">
						{formatCurrency(activeStatement.closingBalance)}
					</div>
				</div>
			</div>

			<!-- Running Statement Table -->
			{#if activeStatement.transactions.length === 0}
				<div class="py-6 text-center text-xs text-text-muted">No transactions recorded for this account.</div>
			{:else}
				<div class="max-h-96 overflow-y-auto rounded-lg border border-border bg-surface">
					<table class="w-full text-left text-xs">
						<thead class="sticky top-0 border-b border-border bg-surface-secondary text-[10px] font-bold uppercase tracking-wider text-text-muted">
							<tr>
								<th class="px-3 py-2">Date</th>
								<th class="px-3 py-2">Particulars / Ref</th>
								<th class="px-3 py-2 text-right">Debit / Dr (₹)</th>
								<th class="px-3 py-2 text-right">Credit / Cr (₹)</th>
								<th class="px-3 py-2 text-right">Running Balance (₹)</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border font-mono text-[11px]">
							{#each activeStatement.transactions as tx}
								<tr class="hover:bg-surface-hover transition-colors">
									<td class="px-3 py-1.5 text-text-muted">{formatDate(tx.date)}</td>
									<td class="px-3 py-1.5 font-sans font-medium text-text-primary">{tx.particulars}</td>
									<td class="px-3 py-1.5 text-right tabular-nums {tx.debit > 0 ? 'text-danger font-semibold' : 'text-text-muted'}">
										{tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
									</td>
									<td class="px-3 py-1.5 text-right tabular-nums {tx.credit > 0 ? 'text-success font-semibold' : 'text-text-muted'}">
										{tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
									</td>
									<td class="px-3 py-1.5 text-right font-bold tabular-nums text-text-primary">
										{formatCurrency(tx.balance)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			<div class="flex justify-end gap-2 pt-2">
				<Button variant="secondary" size="sm" onclick={() => window.print()}>
					<Printer size={14} class="mr-1" />
					<span>Print Statement</span>
				</Button>
				<Button variant="primary" size="sm" onclick={() => (isStatementOpen = false)}>Close</Button>
			</div>
		</div>
	{/if}
</Modal>
