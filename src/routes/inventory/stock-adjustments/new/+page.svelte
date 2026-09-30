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
	import ProductSearch from '$lib/components/billing/ProductSearch.svelte';
	import {
		Plus,
		Trash2,
		RotateCcw,
		Save,
		Search,
		AlertTriangle,
		PackageCheck,
		ArrowDown,
		ArrowUp,
		SlidersHorizontal,
		CheckCircle2,
		Calendar,
		History,
		FileSpreadsheet
	} from '@lucide/svelte';

	interface Product {
		id: string;
		name: string;
		code: string;
		category: string;
		gstRate: number;
		unit: string;
	}

	interface Batch {
		id: string;
		batchNumber?: string;
		batchNo?: string;
		expiryDate: string;
		mrp: number;
		purchasePrice?: number;
		purchaseRate?: number;
		quantity?: number;
		quantityRemaining?: number;
	}

	interface AdjustmentRow {
		id: string;
		productId: string;
		productName: string;
		productCode: string;
		batchId: string;
		batchNo: string;
		expiryDate: string;
		mrp: number;
		purchasePrice: number;
		systemStock: number;
		physicalStock: number;
		delta: number;
		reasonCode: string;
		notes: string;
	}

	const REASON_CODES = [
		{ value: 'Physical Variance', label: 'Physical Count Variance (Stocktake)' },
		{ value: 'Breakage / Leakage', label: 'Breakage / Leakage / Damaged Pack' },
		{ value: 'Expired Disposal', label: 'Expired Stock Written Off / Disposed' },
		{ value: 'Free Sample Allotment', label: 'Doctor Sample / Promotional Stock' },
		{ value: 'Pilferage / Missing', label: 'Missing / Unaccounted Pilferage' },
		{ value: 'Supplier Return Reversal', label: 'Vendor Return Reversal Correction' },
		{ value: 'Other Correction', label: 'Other Operational Adjustment' }
	];

	let rows = $state<AdjustmentRow[]>([]);
	let defaultReason = $state('Physical Variance');
	let auditReference = $state('');
	let saving = $state(false);
	let saveSuccess = $state(false);
	let errorMessage = $state<string | null>(null);

	// Product Search state
	let searchModalOpen = $state(false);
	let availableBatches = $state<Batch[]>([]);
	let selectedProductForBatch = $state<Product | null>(null);
	let batchModalOpen = $state(false);
	let loadingBatches = $state(false);

	// Metrics
	let totalLines = $derived(rows.length);
	let additionsCount = $derived(rows.filter((r) => r.delta > 0).reduce((sum, r) => sum + r.delta, 0));
	let reductionsCount = $derived(
		rows.filter((r) => r.delta < 0).reduce((sum, r) => sum + Math.abs(r.delta), 0)
	);
	let netDelta = $derived(additionsCount - reductionsCount);
	let netFinancialImpact = $derived(
		rows.reduce((sum, r) => sum + r.delta * (r.purchasePrice || r.mrp * 0.7), 0)
	);

	onMount(async () => {
		const params = new URLSearchParams(window.location.search);
		const productId = params.get('productId');
		const batchId = params.get('batchId');

		if (productId && batchId) {
			try {
				const prodRes = await fetch(`/api/products/${productId}`);
				if (prodRes.ok) {
					const product = await prodRes.json();
					selectedProductForBatch = product;
					if (Array.isArray(product.batches)) {
						const foundBatch = product.batches.find((b: any) => b.id === batchId);
						if (foundBatch) {
							handleBatchSelect(foundBatch);
						}
					}
				}
			} catch (err) {
				console.error('Failed to prefill batch from URL:', err);
			}
		}
	});

	function openProductSearch() {
		searchModalOpen = true;
	}

	async function handleProductSelect(product: Product) {
		searchModalOpen = false;
		selectedProductForBatch = product;
		loadingBatches = true;
		batchModalOpen = true;

		try {
			const res = await fetch(`/api/products/${product.id}/batches`);
			if (res.ok) {
				const batches = await res.json();
				availableBatches = batches;
			} else {
				availableBatches = [];
			}
		} catch (err) {
			console.error('Failed to load batches:', err);
			availableBatches = [];
		} finally {
			loadingBatches = false;
		}
	}

	function handleBatchSelect(batch: Batch) {
		if (!selectedProductForBatch) return;

		const batchNumber = batch.batchNo || batch.batchNumber || 'N/A';
		const currentStock = Number(batch.quantityRemaining ?? batch.quantity ?? 0);
		const mrp = Number(batch.mrp || 0);
		const purchasePrice = Number(batch.purchasePrice || mrp * 0.7);

		// Check if already in list
		const existingIndex = rows.findIndex((r) => r.batchId === batch.id);
		if (existingIndex >= 0) {
			errorMessage = `Batch ${batchNumber} is already in the adjustment sheet.`;
			batchModalOpen = false;
			return;
		}

		rows.push({
			id: crypto.randomUUID(),
			productId: selectedProductForBatch.id,
			productName: selectedProductForBatch.name,
			productCode: selectedProductForBatch.code,
			batchId: batch.id,
			batchNo: batchNumber,
			expiryDate: batch.expiryDate || '',
			mrp,
			purchasePrice,
			systemStock: currentStock,
			physicalStock: currentStock,
			delta: 0,
			reasonCode: defaultReason,
			notes: ''
		});

		batchModalOpen = false;
		errorMessage = null;
	}

	function updatePhysicalStock(row: AdjustmentRow, newCount: number) {
		row.physicalStock = isNaN(newCount) ? 0 : newCount;
		row.delta = row.physicalStock - row.systemStock;
	}

	function updateDelta(row: AdjustmentRow, newDelta: number) {
		row.delta = isNaN(newDelta) ? 0 : newDelta;
		row.physicalStock = Math.max(0, row.systemStock + row.delta);
	}

	function removeRow(id: string) {
		rows = rows.filter((r) => r.id !== id);
	}

	function clearAll() {
		if (rows.length === 0 || confirm('Clear all items from this adjustment sheet?')) {
			rows = [];
			errorMessage = null;
		}
	}

	async function submitAdjustments() {
		if (rows.length === 0) {
			errorMessage = 'Add at least one batch item to adjust.';
			return;
		}

		const invalidItems = rows.filter((r) => r.delta === 0);
		if (invalidItems.length > 0) {
			if (
				!confirm(
					`${invalidItems.length} item(s) have 0 delta. They will be skipped. Proceed with adjusting ${rows.length - invalidItems.length} items?`
				)
			) {
				return;
			}
		}

		const actionableItems = rows.filter((r) => r.delta !== 0);
		if (actionableItems.length === 0) {
			errorMessage = 'All items have zero delta. Adjust stock counts before committing.';
			return;
		}

		// Verify no item results in negative stock
		for (const r of actionableItems) {
			if (r.systemStock + r.delta < 0) {
				errorMessage = `Batch ${r.batchNo} (${r.productName}) cannot have negative final stock.`;
				return;
			}
		}

		saving = true;
		errorMessage = null;

		try {
			const payload = {
				auditReference: auditReference.trim(),
				items: actionableItems.map((r) => ({
					batchId: r.batchId,
					currentStock: r.systemStock,
					physicalStock: r.physicalStock,
					delta: r.delta,
					reasonCode: r.reasonCode,
					notes: [auditReference.trim(), r.notes?.trim()].filter(Boolean).join(' | ')
				}))
			};

			const res = await fetch('/api/inventory/adjustments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (res.ok) {
				saveSuccess = true;
				rows = [];
				setTimeout(() => {
					goto('/inventory/stock-adjustments');
				}, 1200);
			} else {
				const err = await res.json();
				errorMessage = err.message || 'Failed to post stock adjustment.';
			}
		} catch (err: any) {
			console.error('Error saving adjustments:', err);
			errorMessage = err.message || 'Network error while posting adjustment.';
		} finally {
			saving = false;
		}
	}

	// Keyboard Shortcuts (F2: Product Search, Ctrl+S: Save)
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'F2') {
			e.preventDefault();
			openProductSearch();
		} else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
			e.preventDefault();
			submitAdjustments();
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		return () => {
			window.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<svelte:head>
	<title>Physical Stock Audit & Variance Reconciliation - MedStock ERP</title>
</svelte:head>

<div class="space-y-4">
	<!-- Page Header -->
	<PageHeader
		title="Physical Stock Audit & Adjustments"
		subtitle="Reconcile physical inventory counts, write off breakages/expired stock, and log audit variance events"
	>
		{#snippet actions()}
			<Button variant="secondary" onclick={() => goto('/inventory/stock-adjustments')}>
				<History size={14} class="mr-1.5" />
				<span>View Audit Log</span>
			</Button>
			<Button variant="secondary" onclick={clearAll} disabled={rows.length === 0}>
				<RotateCcw size={14} class="mr-1.5" />
				<span>Reset Sheet</span>
			</Button>
			<Button variant="primary" onclick={submitAdjustments} disabled={saving || rows.length === 0}>
				<Save size={14} class="mr-1.5" />
				<span>{saving ? 'Committing...' : 'Commit Adjustments (Ctrl+S)'}</span>
			</Button>
		{/snippet}
	</PageHeader>

	<!-- Success Banner -->
	{#if saveSuccess}
		<div
			class="flex items-center gap-2.5 rounded-xl border border-success/40 bg-success-light p-3.5 text-xs text-success"
		>
			<CheckCircle2 size={18} class="shrink-0 text-success" />
			<div>
				<span class="font-bold">Stock Reconciliation Posted Successfully!</span> All batch quantities have
				been adjusted and logged in the append-only stock movement ledger. Redirecting to audit log...
			</div>
		</div>
	{/if}

	<!-- Error Alert -->
	{#if errorMessage}
		<div
			class="flex items-center gap-2.5 rounded-xl border border-danger/40 bg-danger-light p-3.5 text-xs text-danger"
		>
			<AlertTriangle size={18} class="shrink-0" />
			<div class="flex-1 font-medium">{errorMessage}</div>
			<button
				type="button"
				class="text-xs font-bold underline hover:opacity-80"
				onclick={() => (errorMessage = null)}
			>
				Dismiss
			</button>
		</div>
	{/if}

	<!-- Top Session Setup Bar -->
	<div
		class="grid grid-cols-1 gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-2xs sm:grid-cols-3"
	>
		<!-- Default Reason Preset -->
		<div>
			<label for="default-reason-select" class="block text-[11px] font-bold text-text-muted uppercase">Default Reason Code</label>
			<select
				id="default-reason-select"
				bind:value={defaultReason}
				class="mt-1 w-full rounded-lg border border-border bg-surface-secondary px-2.5 py-1.5 text-xs font-medium text-text-primary focus:border-accent focus:bg-surface focus:outline-none"
			>
				{#each REASON_CODES as r}
					<option value={r.value}>{r.label}</option>
				{/each}
			</select>
		</div>

		<!-- Audit Ref / Batch Memo -->
		<div>
			<label for="audit-memo-input" class="block text-[11px] font-bold text-text-muted uppercase">Audit Session Memo / Ref</label>
			<input
				id="audit-memo-input"
				type="text"
				bind:value={auditReference}
				placeholder="e.g. Q3 Physical Stocktake - Rack B4"
				class="mt-1 w-full rounded-lg border border-border bg-surface-secondary px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:bg-surface focus:outline-none"
			/>
		</div>

		<!-- Quick Add Product Button -->
		<div class="flex items-end">
			<button
				type="button"
				class="flex h-[34px] w-full items-center justify-center gap-2 rounded-lg border border-accent/40 bg-accent-light px-3 text-xs font-bold text-accent transition-colors hover:bg-accent/20"
				onclick={openProductSearch}
			>
				<Plus size={14} />
				<span>Select Product / Batch to Adjust (F2)</span>
			</button>
		</div>
	</div>

	<!-- KPI Variance Summary Metric Strip -->
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="flex items-center justify-between text-[11px] font-semibold text-text-muted uppercase">
				<span>Lines in Sheet</span>
				<FileSpreadsheet size={15} />
			</div>
			<div class="mt-1 font-mono text-2xl font-black text-text-primary tabular-nums">
				{totalLines}
			</div>
			<div class="mt-0.5 text-[11px] text-text-muted">Distinct batch rows</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="flex items-center justify-between text-[11px] font-semibold text-success uppercase">
				<span>Stock Additions (+)</span>
				<ArrowUp size={15} />
			</div>
			<div class="mt-1 font-mono text-2xl font-black text-success tabular-nums">
				+{additionsCount}
			</div>
			<div class="mt-0.5 text-[11px] text-text-muted">Surplus units found</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="flex items-center justify-between text-[11px] font-semibold text-danger uppercase">
				<span>Stock Reductions (-)</span>
				<ArrowDown size={15} />
			</div>
			<div class="mt-1 font-mono text-2xl font-black text-danger tabular-nums">
				-{reductionsCount}
			</div>
			<div class="mt-0.5 text-[11px] text-text-muted">Deficit / write-off units</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
			<div class="flex items-center justify-between text-[11px] font-semibold text-accent uppercase">
				<span>Net Value Impact</span>
				<SlidersHorizontal size={15} />
			</div>
			<div class="mt-1 font-mono text-2xl font-black tabular-nums {netFinancialImpact >= 0 ? 'text-success' : 'text-danger'}">
				{netFinancialImpact >= 0 ? '+' : ''}₹{netFinancialImpact.toFixed(2)}
			</div>
			<div class="mt-0.5 text-[11px] text-text-muted">Est. inventory balance delta</div>
		</div>
	</div>

	<!-- Variance Items Table -->
	{#if rows.length === 0}
		<EmptyState
			title="Adjustment sheet is empty"
			message="Press F2 or click the button above to search and select products/batches for physical stock reconciliation."
		>
			{#snippet action()}
				<Button variant="primary" onclick={openProductSearch}>
					<Plus size={14} class="mr-1.5" />
					<span>Add First Product (F2)</span>
				</Button>
			{/snippet}
		</EmptyState>
	{:else}
		<div class="overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead
						class="border-b border-border bg-surface-secondary text-[11px] font-semibold text-text-secondary uppercase"
					>
						<tr>
							<th class="w-8 px-3 py-2.5 text-center">#</th>
							<th class="px-3 py-2.5">Product & Code</th>
							<th class="px-3 py-2.5">Batch / Expiry</th>
							<th class="px-3 py-2.5 text-right">MRP / Cost</th>
							<th class="w-24 px-3 py-2.5 text-right">System Qty</th>
							<th class="w-28 px-3 py-2.5 text-right">Physical Count</th>
							<th class="w-24 px-3 py-2.5 text-right">Delta (+/-)</th>
							<th class="w-44 px-3 py-2.5">Reason Code</th>
							<th class="px-3 py-2.5">Line Notes</th>
							<th class="w-12 px-3 py-2.5 text-center">Action</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border/60">
						{#each rows as row, index (row.id)}
							<tr class="hover:bg-surface-hover/60 transition-colors">
								<td class="px-3 py-2.5 text-center font-mono text-text-muted tabular-nums">
									{index + 1}
								</td>
								<td class="px-3 py-2.5">
									<div class="font-bold text-text-primary">{row.productName}</div>
									<div class="font-mono text-[11px] text-text-muted">{row.productCode}</div>
								</td>
								<td class="px-3 py-2.5">
									<div class="font-mono font-bold text-text-primary uppercase">{row.batchNo}</div>
									{#if row.expiryDate}
										<div class="font-mono text-[11px] text-text-muted">
											EXP: {row.expiryDate.substring(0, 7)}
										</div>
									{/if}
								</td>
								<td class="px-3 py-2.5 text-right font-mono text-[11px] text-text-secondary tabular-nums">
									<div>MRP: ₹{row.mrp.toFixed(2)}</div>
									<div class="text-[10px] text-text-muted">Cost: ₹{row.purchasePrice.toFixed(2)}</div>
								</td>
								<td class="px-3 py-2.5 text-right font-mono font-bold text-text-secondary tabular-nums">
									{row.systemStock}
								</td>
								<td class="px-3 py-2.5 text-right">
									<input
										type="number"
										min="0"
										step="1"
										value={row.physicalStock}
										oninput={(e) => updatePhysicalStock(row, Number((e.target as HTMLInputElement).value))}
										class="w-20 rounded border border-border bg-surface px-2 py-1 text-right font-mono text-xs font-bold text-text-primary focus:border-accent focus:outline-none"
									/>
								</td>
								<td class="px-3 py-2.5 text-right">
									<input
										type="number"
										step="1"
										value={row.delta}
										oninput={(e) => updateDelta(row, Number((e.target as HTMLInputElement).value))}
										class="w-20 rounded border border-border bg-surface px-2 py-1 text-right font-mono text-xs font-bold tabular-nums {row.delta > 0 ? 'border-success/60 bg-success-light text-success font-bold' : row.delta < 0 ? 'border-danger/60 bg-danger-light text-danger font-bold' : 'text-text-muted'} focus:border-accent focus:outline-none"
									/>
								</td>
								<td class="px-3 py-2.5">
									<select
										bind:value={row.reasonCode}
										class="w-full rounded border border-border bg-surface-secondary px-2 py-1 text-[11px] font-medium text-text-primary focus:border-accent focus:bg-surface focus:outline-none"
									>
										{#each REASON_CODES as r}
											<option value={r.value}>{r.value}</option>
										{/each}
									</select>
								</td>
								<td class="px-3 py-2.5">
									<input
										type="text"
										bind:value={row.notes}
										placeholder="e.g. Broken seal, cap leakage"
										class="w-full rounded border border-border bg-surface-secondary px-2 py-1 text-[11px] text-text-primary placeholder:text-text-muted focus:border-accent focus:bg-surface focus:outline-none"
									/>
								</td>
								<td class="px-3 py-2.5 text-center">
									<button
										type="button"
										class="rounded p-1 text-text-muted hover:bg-danger-light hover:text-danger transition-colors"
										title="Remove Line"
										onclick={() => removeRow(row.id)}
									>
										<Trash2 size={14} />
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Bottom Sticky Action Bar -->
			<div
				class="flex flex-col items-center justify-between gap-3 border-t border-border bg-surface-secondary p-3 sm:flex-row"
			>
				<div class="flex items-center gap-3 text-xs text-text-muted">
					<span class="font-mono font-semibold text-text-primary tabular-nums">{totalLines}</span> items in worksheet
					<span>•</span>
					<span><kbd class="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] text-text-primary">F2</kbd> Product Search</span>
					<span><kbd class="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] text-text-primary">Ctrl+S</kbd> Commit</span>
				</div>

				<div class="flex items-center gap-3">
					<Button variant="secondary" onclick={openProductSearch}>
						<Plus size={14} class="mr-1.5" />
						<span>Add Another Item (F2)</span>
					</Button>
					<Button variant="primary" onclick={submitAdjustments} disabled={saving || rows.length === 0}>
						<Save size={14} class="mr-1.5" />
						<span>{saving ? 'Processing...' : 'Commit Adjustments'}</span>
					</Button>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Product Search Modal -->
{#if searchModalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
		<div class="w-full max-w-2xl rounded-2xl border border-border bg-surface p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between border-b border-border pb-3 mb-4">
				<div>
					<h3 class="text-sm font-bold text-text-primary">Search Product to Adjust</h3>
					<p class="text-xs text-text-muted">Type product name or barcode to select batches</p>
				</div>
				<button
					type="button"
					onclick={() => (searchModalOpen = false)}
					class="rounded-lg p-1 text-text-muted hover:bg-surface-secondary hover:text-text-primary transition-colors"
				>
					✕
				</button>
			</div>
			<ProductSearch
				onSelect={(product, batches) => {
					searchModalOpen = false;
					selectedProductForBatch = {
						id: product.id,
						name: product.name,
						code: product.barcode || product.hsnCode || 'N/A',
						category: product.category || 'General',
						gstRate: product.gstRate,
						unit: 'Unit'
					};
					availableBatches = batches;
					batchModalOpen = true;
				}}
			/>
		</div>
	</div>
{/if}

<!-- Batch Selection Modal -->
{#if batchModalOpen && selectedProductForBatch}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
		<div
			class="w-full max-w-xl rounded-2xl border border-border bg-surface p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
		>
			<div class="flex items-start justify-between border-b border-border pb-3">
				<div>
					<div class="text-sm font-bold text-text-primary">Select Batch for Adjustment</div>
					<div class="text-xs text-text-muted">
						{selectedProductForBatch.name} ({selectedProductForBatch.code})
					</div>
				</div>
				<button
					type="button"
					class="rounded-lg p-1 text-text-muted hover:bg-surface-secondary hover:text-text-primary"
					onclick={() => (batchModalOpen = false)}
				>
					✕
				</button>
			</div>

			<div class="mt-4">
				{#if loadingBatches}
					<LoadingState message="Fetching batches..." />
				{:else if availableBatches.length === 0}
					<div class="py-6 text-center text-xs text-text-muted">
						No active batches found for this product.
					</div>
				{:else}
					<div class="max-h-64 overflow-y-auto rounded-lg border border-border">
						<table class="w-full text-left text-xs">
							<thead class="border-b border-border bg-surface-secondary text-[11px] font-semibold text-text-secondary uppercase">
								<tr>
									<th class="px-3 py-2">Batch No</th>
									<th class="px-3 py-2">Expiry</th>
									<th class="px-3 py-2 text-right">MRP</th>
									<th class="px-3 py-2 text-right">System Qty</th>
									<th class="px-3 py-2 text-center">Action</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-border/60">
								{#each availableBatches as b (b.id)}
									<tr class="hover:bg-surface-hover/60 transition-colors">
										<td class="px-3 py-2.5 font-mono font-bold text-text-primary uppercase">
											{b.batchNo || b.batchNumber || 'N/A'}
										</td>
										<td class="px-3 py-2.5 font-mono text-[11px] text-text-muted">
											{b.expiryDate ? b.expiryDate.substring(0, 7) : 'N/A'}
										</td>
										<td class="px-3 py-2.5 text-right font-mono text-text-primary tabular-nums">
											₹{Number(b.mrp || 0).toFixed(2)}
										</td>
										<td class="px-3 py-2.5 text-right font-mono font-bold text-text-primary tabular-nums">
											{Number(b.quantityRemaining ?? b.quantity ?? 0)}
										</td>
										<td class="px-3 py-2.5 text-center">
											<button
												type="button"
												class="rounded bg-accent px-2.5 py-1 text-[11px] font-bold text-white hover:bg-accent/90 transition-colors"
												onclick={() => handleBatchSelect(b)}
											>
												Select
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>

			<div class="mt-4 flex justify-end">
				<Button variant="secondary" onclick={() => (batchModalOpen = false)}>
					Cancel
				</Button>
			</div>
		</div>
	</div>
{/if}
