<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		PageHeader,
		Button,
		Badge,
		LoadingState,
		EmptyState
	} from '$lib/components/common/index.js';
	import {
		Plus,
		Search,
		FileText,
		ArrowDownLeft,
		ArrowUpRight,
		PackageCheck,
		Filter,
		RotateCcw,
		ChevronDown,
		ChevronUp,
		Printer,
		Building2,
		User
	} from '@lucide/svelte';

	interface EnrichedReturnItem {
		id: string;
		batchId: string;
		quantity: number;
		lineAmount: number;
		batchNumber: string;
		expiryDate: string;
		productName: string;
	}

	interface EnrichedReturn {
		id: string;
		returnType: 'sales_return' | 'purchase_return';
		originalSaleId: string | null;
		originalPurchaseId: string | null;
		reason: string;
		approvedBy: string | null;
		createdBy: string | null;
		createdAt: string;
		invoiceNumber: string | null;
		items: EnrichedReturnItem[];
		totalAmount: number;
		totalQuantity: number;
	}

	let returns = $state<EnrichedReturn[]>([]);
	let loading = $state(true);
	let searchQuery = $state('');
	let typeFilter = $state<'all' | 'sales_return' | 'purchase_return'>('all');
	let expandedRowId = $state<string | null>(null);

	onMount(async () => {
		await loadReturns();
	});

	async function loadReturns() {
		loading = true;
		try {
			const res = await fetch('/api/returns');
			if (res.ok) {
				returns = await res.json();
			}
		} catch (err) {
			console.error('Failed to fetch returns:', err);
		} finally {
			loading = false;
		}
	}

	function toggleExpand(id: string) {
		expandedRowId = expandedRowId === id ? null : id;
	}

	// Filtered returns
	let filteredReturns = $derived.by(() => {
		return returns.filter((r) => {
			if (typeFilter !== 'all' && r.returnType !== typeFilter) return false;
			if (!searchQuery.trim()) return true;

			const q = searchQuery.toLowerCase();
			const matchInvoice = r.invoiceNumber?.toLowerCase().includes(q) || false;
			const matchReason = r.reason?.toLowerCase().includes(q) || false;
			const matchId = r.id.toLowerCase().includes(q);
			const matchItems = r.items.some(
				(item) =>
					item.productName.toLowerCase().includes(q) ||
					item.batchNumber.toLowerCase().includes(q)
			);

			return matchInvoice || matchReason || matchId || matchItems;
		});
	});

	// Metrics
	let totalCount = $derived(returns.length);
	let salesReturns = $derived(returns.filter((r) => r.returnType === 'sales_return'));
	let purchaseReturns = $derived(returns.filter((r) => r.returnType === 'purchase_return'));

	let salesReturnsVal = $derived(
		salesReturns.reduce((sum, r) => sum + (r.totalAmount || 0), 0)
	);
	let purchaseReturnsVal = $derived(
		purchaseReturns.reduce((sum, r) => sum + (r.totalAmount || 0), 0)
	);
	let totalQtyRestocked = $derived(
		returns.reduce((sum, r) => sum + (r.totalQuantity || 0), 0)
	);
</script>

<svelte:head>
	<title>Returns & Credit/Debit Notes - MedStock ERP</title>
</svelte:head>

<div class="space-y-4">
	<!-- Page Header -->
	<PageHeader
		title="Credit & Debit Notes (Returns)"
		subtitle="Sales Inward Returns (Credit Notes) & Purchase Outward Debit Notes with Stock Reversal"
	>
		{#snippet actions()}
			<Button variant="secondary" onclick={loadReturns}>
				<RotateCcw size={14} class="mr-1.5" />
				<span>Refresh</span>
			</Button>
			<Button variant="primary" onclick={() => goto('/returns/new')}>
				<Plus size={14} class="mr-1.5" />
				<span>Issue Return Voucher (F2)</span>
			</Button>
		{/snippet}
	</PageHeader>

	<!-- KPI Summary Metrics -->
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		<div class="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
			<div class="flex items-center justify-between">
				<span class="text-[11px] font-semibold text-text-muted uppercase">Total Vouchers</span>
				<FileText size={16} class="text-text-muted" />
			</div>
			<div class="mt-1.5 font-mono text-2xl font-black text-text-primary tabular-nums">
				{totalCount}
			</div>
			<div class="mt-0.5 text-[11px] text-text-muted">
				{salesReturns.length} Credit • {purchaseReturns.length} Debit
			</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
			<div class="flex items-center justify-between">
				<span class="text-[11px] font-semibold text-success uppercase">Sales Returns (CN)</span>
				<ArrowDownLeft size={16} class="text-success" />
			</div>
			<div class="mt-1.5 font-mono text-2xl font-black text-success tabular-nums">
				₹{salesReturnsVal.toFixed(2)}
			</div>
			<div class="mt-0.5 text-[11px] text-text-muted">
				Customer inward refunds issued
			</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
			<div class="flex items-center justify-between">
				<span class="text-[11px] font-semibold text-info uppercase">Purchase Returns (DN)</span>
				<ArrowUpRight size={16} class="text-info" />
			</div>
			<div class="mt-1.5 font-mono text-2xl font-black text-info tabular-nums">
				₹{purchaseReturnsVal.toFixed(2)}
			</div>
			<div class="mt-0.5 text-[11px] text-text-muted">
				Supplier debit claims submitted
			</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
			<div class="flex items-center justify-between">
				<span class="text-[11px] font-semibold text-accent uppercase">Units Adjusted</span>
				<PackageCheck size={16} class="text-accent" />
			</div>
			<div class="mt-1.5 font-mono text-2xl font-black text-accent tabular-nums">
				{totalQtyRestocked}
			</div>
			<div class="mt-0.5 text-[11px] text-text-muted">
				Inventory delta transactions
			</div>
		</div>
	</div>

	<!-- Controls / Filter Bar -->
	<div class="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
		<!-- Search Input -->
		<div class="relative flex-1 max-w-md">
			<Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search by Invoice #, Product, Batch, or Reason..."
				class="w-full rounded-lg border border-border bg-surface-secondary py-1.5 pl-8 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:bg-surface focus:outline-none"
			/>
		</div>

		<!-- Type Filter Pills -->
		<div class="flex items-center gap-1 rounded-lg border border-border bg-surface-secondary p-1">
			<button
				type="button"
				class="rounded px-2.5 py-1 text-xs font-semibold transition-colors {typeFilter === 'all'
					? 'bg-surface text-text-primary shadow-xs'
					: 'text-text-muted hover:text-text-primary'}"
				onclick={() => (typeFilter = 'all')}
			>
				All Vouchers
			</button>
			<button
				type="button"
				class="rounded px-2.5 py-1 text-xs font-semibold transition-colors {typeFilter === 'sales_return'
					? 'bg-success-light text-success font-bold shadow-xs'
					: 'text-text-muted hover:text-text-primary'}"
				onclick={() => (typeFilter = 'sales_return')}
			>
				Credit Notes (Sales)
			</button>
			<button
				type="button"
				class="rounded px-2.5 py-1 text-xs font-semibold transition-colors {typeFilter === 'purchase_return'
					? 'bg-info-light text-info font-bold shadow-xs'
					: 'text-text-muted hover:text-text-primary'}"
				onclick={() => (typeFilter = 'purchase_return')}
			>
				Debit Notes (Purchase)
			</button>
		</div>
	</div>

	<!-- Table Area -->
	{#if loading}
		<LoadingState message="Loading return vouchers & credit notes..." />
	{:else if filteredReturns.length === 0}
		<EmptyState
			title="No return vouchers found"
			message={searchQuery || typeFilter !== 'all'
				? 'No records match your filter criteria. Try clearing search filters.'
				: 'No sales returns (Credit Notes) or purchase returns (Debit Notes) have been recorded yet.'}
		>
			{#snippet action()}
				<Button variant="primary" onclick={() => goto('/returns/new')}>
					<Plus size={14} class="mr-1.5" />
					<span>Issue First Return Voucher</span>
				</Button>
			{/snippet}
		</EmptyState>
	{:else}
		<div class="overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead class="border-b border-border bg-surface-secondary text-[11px] font-semibold text-text-secondary uppercase">
						<tr>
							<th class="w-8 px-3 py-2.5 text-center">#</th>
							<th class="px-3 py-2.5">Voucher Ref & Date</th>
							<th class="px-3 py-2.5">Voucher Type</th>
							<th class="px-3 py-2.5">Orig. Invoice Ref</th>
							<th class="px-3 py-2.5">Return Reason</th>
							<th class="px-3 py-2.5 text-center">Items & Batches</th>
							<th class="px-3 py-2.5 text-right">Total Qty</th>
							<th class="px-3 py-2.5 text-right">Net Value (₹)</th>
							<th class="w-16 px-3 py-2.5 text-center">Action</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border/60">
						{#each filteredReturns as r, index (r.id)}
							<tr class="hover:bg-surface-hover/60 transition-colors {expandedRowId === r.id ? 'bg-surface-hover/40' : ''}">
								<td class="px-3 py-2.5 text-center font-mono text-text-muted tabular-nums">
									{index + 1}
								</td>
								<td class="px-3 py-2.5">
									<div class="font-mono font-bold text-text-primary">
										{r.id.substring(0, 8).toUpperCase()}
									</div>
									<div class="text-[11px] text-text-muted">
										{new Date(r.createdAt).toLocaleDateString('en-IN', {
											day: '2-digit',
											month: 'short',
											year: 'numeric',
											hour: '2-digit',
											minute: '2-digit'
										})}
									</div>
								</td>
								<td class="px-3 py-2.5">
									{#if r.returnType === 'sales_return'}
										<span class="inline-flex items-center gap-1 rounded bg-success-light px-2 py-0.5 font-mono text-[11px] font-bold text-success">
											<ArrowDownLeft size={12} />
											Credit Note (CN)
										</span>
									{:else}
										<span class="inline-flex items-center gap-1 rounded bg-info-light text-info px-2 py-0.5 font-mono text-[11px] font-bold text-info">
											<ArrowUpRight size={12} />
											Debit Note (DN)
										</span>
									{/if}
								</td>
								<td class="px-3 py-2.5">
									{#if r.invoiceNumber}
										<div class="flex items-center gap-1.5">
											{#if r.returnType === 'sales_return'}
												<User size={12} class="text-text-muted" />
											{:else}
												<Building2 size={12} class="text-text-muted" />
											{/if}
											<span class="font-mono font-semibold text-accent">
												#{r.invoiceNumber}
											</span>
										</div>
									{:else}
										<span class="font-mono text-text-muted text-[11px]">Direct / Manual</span>
									{/if}
								</td>
								<td class="px-3 py-2.5">
									<div class="max-w-[200px] truncate font-medium text-text-primary" title={r.reason}>
										{r.reason || 'General Return'}
									</div>
								</td>
								<td class="px-3 py-2.5 text-center">
									<button
										type="button"
										class="inline-flex items-center gap-1 rounded border border-border bg-surface-secondary px-2 py-1 text-[11px] font-semibold text-text-primary hover:border-accent hover:text-accent transition-colors"
										onclick={() => toggleExpand(r.id)}
									>
										<span>{r.items.length} {r.items.length === 1 ? 'line' : 'lines'}</span>
										{#if expandedRowId === r.id}
											<ChevronUp size={12} />
										{:else}
											<ChevronDown size={12} />
										{/if}
									</button>
								</td>
								<td class="px-3 py-2.5 text-right font-mono font-bold text-text-primary tabular-nums">
									{r.totalQuantity}
								</td>
								<td class="px-3 py-2.5 text-right font-mono font-black tabular-nums {r.returnType === 'sales_return' ? 'text-success' : 'text-info'}">
									₹{r.totalAmount.toFixed(2)}
								</td>
								<td class="px-3 py-2.5 text-center">
									<button
										type="button"
										class="rounded p-1 text-text-muted hover:bg-surface-hover hover:text-text-primary transition-colors"
										title="Print Voucher"
										onclick={() => window.print()}
									>
										<Printer size={14} />
									</button>
								</td>
							</tr>

							<!-- Expanded Line Items Row -->
							{#if expandedRowId === r.id}
								<tr class="bg-surface-secondary/40">
									<td colspan="9" class="p-3">
										<div class="rounded-lg border border-border bg-surface p-3 shadow-2xs">
											<div class="mb-2 flex items-center justify-between text-[11px] font-bold text-text-muted uppercase">
												<span>Returned Batch Details ({r.items.length} lines)</span>
												<span class="font-mono font-normal">Stock Delta: {r.returnType === 'sales_return' ? '+Restocked In' : '-Debited Out'}</span>
											</div>
											<table class="w-full text-left text-xs">
												<thead class="border-b border-border bg-surface-secondary text-[10px] font-semibold text-text-secondary uppercase">
													<tr>
														<th class="px-2.5 py-1.5">Product</th>
														<th class="px-2.5 py-1.5">Batch / Expiry</th>
														<th class="px-2.5 py-1.5 text-right">Return Qty</th>
														<th class="px-2.5 py-1.5 text-right">Line Amount</th>
													</tr>
												</thead>
												<tbody class="divide-y divide-border/40">
													{#each r.items as item (item.id)}
														<tr>
															<td class="px-2.5 py-1.5 font-semibold text-text-primary">
																{item.productName}
															</td>
															<td class="px-2.5 py-1.5 font-mono text-[11px]">
																<span class="font-bold text-text-primary uppercase">{item.batchNumber}</span>
																{#if item.expiryDate}
																	<span class="text-text-muted ml-2">EXP: {item.expiryDate.substring(0, 7)}</span>
																{/if}
															</td>
															<td class="px-2.5 py-1.5 text-right font-mono font-bold text-text-primary tabular-nums">
																{item.quantity}
															</td>
															<td class="px-2.5 py-1.5 text-right font-mono font-bold text-text-primary tabular-nums">
																₹{item.lineAmount.toFixed(2)}
															</td>
														</tr>
													{/each}
												</tbody>
											</table>
										</div>
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
