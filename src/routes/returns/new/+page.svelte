<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { PageHeader, Button } from '$lib/components/common/index.js';
	import { addToast } from '$lib/stores/toastStore.svelte.js';
	import {
		ArrowDownLeft,
		ArrowUpRight,
		Search,
		Plus,
		Trash2,
		Receipt,
		Building2,
		User,
		Package
	} from '@lucide/svelte';
	import type { Sale, Purchase, Product, Batch } from '$lib/types/index.js';

	interface ReturnLineItem {
		uiKey: number;
		productId: string;
		productName: string;
		batchId: string;
		batchNumber: string;
		expiryDate: string;
		quantity: number;
		unitRate: number;
		lineAmount: number;
		maxQty?: number;
	}

	let returnType = $state<'sales_return' | 'purchase_return'>('sales_return');
	let selectedInvoiceId = $state<string>('');
	let reason = $state('Customer Return - Prescribed Medicine Changed');
	let customReason = $state('');
	let isSubmitting = $state(false);

	let items = $state<ReturnLineItem[]>([]);
	let nextUiKey = 0;

	// Invoices list for lookup
	let salesList = $state<Sale[]>([]);
	let purchasesList = $state<Purchase[]>([]);
	let invoiceSearchQuery = $state('');
	let invoiceDropdownOpen = $state(false);

	// Product & Batch lookup for manual line addition
	let productSearchQuery = $state('');
	let productResults = $state<Product[]>([]);
	let selectedProduct = $state<Product | null>(null);
	let availableBatches = $state<Batch[]>([]);
	let selectedBatch = $state<Batch | null>(null);
	let manualQty = $state(1);
	let manualRate = $state(0);

	let searchInputRef = $state<HTMLInputElement | undefined>();

	onMount(async () => {
		await Promise.all([loadSales(), loadPurchases()]);
		tick().then(() => {
			searchInputRef?.focus();
		});
	});

	async function loadSales() {
		try {
			const res = await fetch('/api/sales');
			if (res.ok) salesList = await res.json();
		} catch (e) {
			console.error(e);
		}
	}

	async function loadPurchases() {
		try {
			const res = await fetch('/api/purchases');
			if (res.ok) purchasesList = await res.json();
		} catch (e) {
			console.error(e);
		}
	}

	// Filtered invoices for dropdown
	let filteredInvoices = $derived.by(() => {
		const q = invoiceSearchQuery.toLowerCase();
		if (returnType === 'sales_return') {
			return salesList.filter(
				(s) =>
					s.invoiceNumber.toLowerCase().includes(q) ||
					(s.customerName && s.customerName.toLowerCase().includes(q))
			).slice(0, 8);
		} else {
			return purchasesList.filter(
				(p) =>
					p.invoiceNumber.toLowerCase().includes(q) ||
					(p.supplierName && p.supplierName.toLowerCase().includes(q))
			).slice(0, 8);
		}
	});

	function handleSelectInvoice(inv: Sale | Purchase) {
		selectedInvoiceId = inv.id;
		invoiceSearchQuery = inv.invoiceNumber;
		invoiceDropdownOpen = false;

		// Pre-populate items from selected invoice
		if (returnType === 'sales_return') {
			const sale = inv as Sale;
			items = (sale.items || []).map((item) => ({
				uiKey: nextUiKey++,
				productId: item.productId,
				productName: item.productName || 'Product',
				batchId: item.batchId || '',
				batchNumber: item.batchNumber || 'N/A',
				expiryDate: item.expiryDate || '',
				quantity: 1,
				maxQty: item.quantity,
				unitRate: item.rate,
				lineAmount: item.rate
			}));
		} else {
			const pur = inv as Purchase;
			items = (pur.items || []).map((item) => ({
				uiKey: nextUiKey++,
				productId: item.productId,
				productName: item.productName || 'Product',
				batchId: item.batchId || '',
				batchNumber: item.batchNumber || 'N/A',
				expiryDate: item.expiryDate || '',
				quantity: 1,
				maxQty: item.quantity,
				unitRate: item.purchaseRate,
				lineAmount: item.purchaseRate
			}));
		}
	}

	async function searchProducts() {
		if (productSearchQuery.length < 2) {
			productResults = [];
			return;
		}
		try {
			const res = await fetch(`/api/products?q=${encodeURIComponent(productSearchQuery)}`);
			if (res.ok) {
				productResults = await res.json();
			}
		} catch (e) {
			console.error(e);
		}
	}

	async function selectProduct(prod: Product) {
		selectedProduct = prod;
		productSearchQuery = prod.name;
		productResults = [];
		manualRate = returnType === 'sales_return' ? prod.mrp : prod.purchaseRate;

		// Load batches for this product
		try {
			const res = await fetch(`/api/batches?productId=${prod.id}`);
			if (res.ok) {
				availableBatches = await res.json();
				if (availableBatches.length > 0) {
					selectedBatch = availableBatches[0];
				} else {
					selectedBatch = null;
				}
			}
		} catch (e) {
			console.error(e);
		}
	}

	function addManualLine() {
		if (!selectedProduct) {
			addToast('error', 'Select a product first');
			return;
		}
		if (!selectedBatch) {
			addToast('error', 'Select an active batch for this product');
			return;
		}
		if (manualQty <= 0) {
			addToast('error', 'Quantity must be greater than zero');
			return;
		}

		items = [
			...items,
			{
				uiKey: nextUiKey++,
				productId: selectedProduct.id,
				productName: selectedProduct.name,
				batchId: selectedBatch.id,
				batchNumber: selectedBatch.batchNumber,
				expiryDate: selectedBatch.expiryDate,
				quantity: manualQty,
				unitRate: manualRate,
				lineAmount: manualQty * manualRate
			}
		];

		// Reset manual picker
		selectedProduct = null;
		selectedBatch = null;
		productSearchQuery = '';
		manualQty = 1;
		manualRate = 0;
	}

	function removeItem(index: number) {
		items = items.filter((_, i) => i !== index);
	}

	function updateItemQty(index: number, newQty: number) {
		const item = items[index];
		const qty = Math.max(1, newQty);
		items[index] = {
			...item,
			quantity: qty,
			lineAmount: qty * item.unitRate
		};
	}

	function updateItemRate(index: number, newRate: number) {
		const item = items[index];
		const rate = Math.max(0, newRate);
		items[index] = {
			...item,
			unitRate: rate,
			lineAmount: item.quantity * rate
		};
	}

	// Summary calculations
	let totalQty = $derived(items.reduce((sum, item) => sum + item.quantity, 0));
	let grandTotal = $derived(items.reduce((sum, item) => sum + item.lineAmount, 0));

	async function handleSaveReturn() {
		if (items.length === 0) {
			addToast('error', 'Add at least one return item to issue voucher');
			return;
		}

		for (let i = 0; i < items.length; i++) {
			const it = items[i];
			if (!it.batchId) {
				addToast('error', `Row ${i + 1}: Batch reference is missing`);
				return;
			}
			if (it.quantity <= 0) {
				addToast('error', `Row ${i + 1}: Quantity must be greater than zero`);
				return;
			}
		}

		isSubmitting = true;

		const finalReason = reason === 'Other' ? customReason : reason;

		const payload = {
			returnType,
			originalSaleId: returnType === 'sales_return' && selectedInvoiceId ? selectedInvoiceId : undefined,
			originalPurchaseId: returnType === 'purchase_return' && selectedInvoiceId ? selectedInvoiceId : undefined,
			reason: finalReason || 'Returned Goods Voucher',
			items: items.map((it) => ({
				batchId: it.batchId,
				quantity: it.quantity,
				lineAmount: it.lineAmount
			}))
		};

		try {
			const res = await fetch('/api/returns', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.message || 'Failed to process return');
			}

			addToast(
				'success',
				`${returnType === 'sales_return' ? 'Credit Note (Sales Return)' : 'Debit Note (Purchase Return)'} issued successfully!`
			);
			goto('/returns');
		} catch (err: any) {
			console.error(err);
			addToast('error', err.message || 'Error processing return voucher');
		} finally {
			isSubmitting = false;
		}
	}

	function handleWindowKeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key === 's') {
			e.preventDefault();
			handleSaveReturn();
		}
		if (e.key === 'F8') {
			e.preventDefault();
			returnType = returnType === 'sales_return' ? 'purchase_return' : 'sales_return';
			items = [];
			selectedInvoiceId = '';
			invoiceSearchQuery = '';
			addToast('info', `Switched to: ${returnType === 'sales_return' ? 'Credit Note (Sales Return)' : 'Debit Note (Purchase Return)'}`);
		}
		if (e.key === 'F10') {
			e.preventDefault();
			handleSaveReturn();
		}
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<svelte:head>
	<title>Issue Return Voucher - MedStock ERP</title>
</svelte:head>

<div class="flex flex-col space-y-3">
	<!-- Page Header -->
	<PageHeader
		title="Issue Return Voucher"
		subtitle="Sales Return (Credit Note) or Purchase Return (Debit Note) with Automatic Stock Reversal"
	>
		{#snippet actions()}
			<Button variant="secondary" onclick={() => goto('/returns')}>Cancel</Button>
			<Button variant="primary" disabled={isSubmitting} onclick={handleSaveReturn}>
				{isSubmitting ? 'Processing Voucher...' : 'Save & Issue Voucher (F10 / Ctrl+S)'}
			</Button>
		{/snippet}
	</PageHeader>

	<!-- Keyboard Shortcut Bar -->
	<div
		class="flex flex-wrap items-center gap-3 rounded-t-xl border border-b-0 border-border bg-sidebar px-4 py-2 text-xs font-medium text-sidebar-text shadow-2xs"
	>
		<span class="flex items-center gap-1.5 text-accent-hover">
			<kbd class="rounded border border-sidebar-hover bg-sidebar-hover px-1.5 py-0.5 font-mono text-[10px] text-sidebar-text-active">F8</kbd>
			<span>Toggle Type ({returnType === 'sales_return' ? 'Sales CN' : 'Purchase DN'})</span>
		</span>
		<span class="flex items-center gap-1.5 text-warning">
			<kbd class="rounded border border-sidebar-hover bg-sidebar-hover px-1.5 py-0.5 font-mono text-[10px] text-sidebar-text-active">Enter</kbd>
			<span>Table Navigation</span>
		</span>
		<span class="ml-auto flex items-center gap-1.5 text-accent">
			<kbd class="rounded border border-sidebar-hover bg-sidebar-hover px-1.5 py-0.5 font-mono text-[10px] text-sidebar-text-active">Ctrl+S / F10</kbd>
			<span>Issue Return Voucher</span>
		</span>
	</div>

	<!-- Top Controls Container -->
	<div class="space-y-4 border-x border-border bg-surface p-4 shadow-2xs">
		<!-- Voucher Type Selection & Original Invoice Lookup -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<!-- Return Type Toggle -->
			<div>
				<span class="mb-1 block text-[11px] font-semibold text-text-secondary uppercase">Return Classification *</span>
				<div class="grid grid-cols-2 gap-2">
					<button
						type="button"
						class="flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-bold transition-all {returnType === 'sales_return'
							? 'border-success bg-success-light text-success ring-1 ring-success'
							: 'border-border bg-surface-secondary text-text-muted hover:text-text-primary'}"
						onclick={() => {
							returnType = 'sales_return';
							items = [];
							selectedInvoiceId = '';
							invoiceSearchQuery = '';
						}}
					>
						<ArrowDownLeft size={16} />
						<span>Credit Note (Sales)</span>
					</button>

					<button
						type="button"
						class="flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-bold transition-all {returnType === 'purchase_return'
							? 'border-info bg-info-light text-info ring-1 ring-info'
							: 'border-border bg-surface-secondary text-text-muted hover:text-text-primary'}"
						onclick={() => {
							returnType = 'purchase_return';
							items = [];
							selectedInvoiceId = '';
							invoiceSearchQuery = '';
						}}
					>
						<ArrowUpRight size={16} />
						<span>Debit Note (Purchase)</span>
					</button>
				</div>
			</div>

			<!-- Original Invoice Selector -->
			<div class="relative">
				<label for="inv-search-input" class="mb-1 block text-[11px] font-semibold text-text-secondary uppercase">
					Link Original {returnType === 'sales_return' ? 'Sale Invoice' : 'Inward GRN / Purchase'} (Optional)
				</label>
				<div class="relative">
					<input
						id="inv-search-input"
						type="text"
						bind:value={invoiceSearchQuery}
						onfocus={() => (invoiceDropdownOpen = true)}
						placeholder={returnType === 'sales_return' ? 'Search sale invoice # or customer...' : 'Search purchase invoice # or supplier...'}
						class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
					/>
					{#if invoiceDropdownOpen && filteredInvoices.length > 0}
						<ul class="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-border bg-surface py-1 text-xs shadow-xl divide-y divide-border/60">
							{#each filteredInvoices as inv (inv.id)}
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
								<li
									class="cursor-pointer px-3 py-2 hover:bg-surface-hover transition-colors"
									onclick={() => handleSelectInvoice(inv)}
								>
									<div class="flex items-center justify-between">
										<span class="font-mono font-bold text-accent">#{inv.invoiceNumber}</span>
										<span class="font-mono text-text-muted">₹{inv.grandTotal.toFixed(2)}</span>
									</div>
									<div class="text-[11px] text-text-muted">
										{returnType === 'sales_return' ? ((inv as Sale).customerName || 'Walk-in Customer') : (inv as Purchase).supplierName} • {new Date((inv as any).date || (inv as any).invoiceDate).toLocaleDateString()}
									</div>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</div>

			<!-- Return Reason Selection -->
			<div>
				<label for="return-reason-select" class="mb-1 block text-[11px] font-semibold text-text-secondary uppercase">Return Reason Code *</label>
				<select
					id="return-reason-select"
					bind:value={reason}
					class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-primary focus:border-accent focus:outline-none"
				>
					<option value="Customer Return - Prescribed Medicine Changed">Customer Return - Prescribed Medicine Changed</option>
					<option value="Customer Return - Adverse Reaction / Not Required">Customer Return - Adverse Reaction / Not Required</option>
					<option value="Damaged / Seal Broken / Leaked Strip">Damaged / Seal Broken / Leaked Strip</option>
					<option value="Near Expiry Stock Return to Distributor">Near Expiry Stock Return to Distributor</option>
					<option value="Wrong Medicine Inwarded / Dispensed">Wrong Medicine Inwarded / Dispensed</option>
					<option value="Rate Discrepancy / Overcharge Correction">Rate Discrepancy / Overcharge Correction</option>
					<option value="Physical Stock Audit Variance Reversal">Physical Stock Audit Variance Reversal</option>
					<option value="Other">Other (Custom Reason)</option>
				</select>
				{#if reason === 'Other'}
					<input
						type="text"
						bind:value={customReason}
						placeholder="Specify reason..."
						class="mt-1.5 w-full rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none"
					/>
				{/if}
			</div>
		</div>

		<!-- Manual Line Add Picker -->
		<div class="rounded-lg border border-border/80 bg-surface-secondary/60 p-3">
			<div class="mb-2 text-[11px] font-bold text-text-muted uppercase">Add Item / Batch Manually</div>
			<div class="grid grid-cols-1 gap-2.5 sm:grid-cols-12 items-end">
				<!-- Product search -->
				<div class="sm:col-span-5 relative">
					<label for="ret-prod-search" class="text-[10px] font-semibold text-text-muted uppercase">Product Name</label>
					<input
						id="ret-prod-search"
						bind:this={searchInputRef}
						type="text"
						bind:value={productSearchQuery}
						oninput={searchProducts}
						placeholder="Search product (F2)..."
						class="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none"
					/>
					{#if productResults.length > 0}
						<ul class="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-surface py-1 text-xs shadow-xl divide-y divide-border/60">
							{#each productResults as prod (prod.id)}
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
								<li
									class="cursor-pointer px-3 py-1.5 hover:bg-surface-hover"
									onclick={() => selectProduct(prod)}
								>
									<div class="font-bold text-text-primary">{prod.name}</div>
									<div class="text-[11px] text-text-muted">MRP: ₹{prod.mrp} • Rate: ₹{prod.purchaseRate}</div>
								</li>
							{/each}
						</ul>
					{/if}
				</div>

				<!-- Batch select -->
				<div class="sm:col-span-3">
					<label for="ret-batch-select" class="text-[10px] font-semibold text-text-muted uppercase">Batch</label>
					<select
						id="ret-batch-select"
						class="w-full rounded border border-border bg-surface px-2 py-1.5 text-xs font-mono text-text-primary focus:border-accent focus:outline-none"
						disabled={availableBatches.length === 0}
						onchange={(e) => {
							const bId = (e.target as HTMLSelectElement).value;
							selectedBatch = availableBatches.find((b) => b.id === bId) || null;
						}}
					>
						{#if availableBatches.length === 0}
							<option>No batches</option>
						{:else}
							{#each availableBatches as b (b.id)}
								<option value={b.id}>{b.batchNumber} (EXP: {b.expiryDate?.substring(0, 7)})</option>
							{/each}
						{/if}
					</select>
				</div>

				<!-- Qty -->
				<div class="sm:col-span-2">
					<label for="ret-manual-qty" class="text-[10px] font-semibold text-text-muted uppercase">Return Qty</label>
					<input
						id="ret-manual-qty"
						type="number"
						min="1"
						bind:value={manualQty}
						class="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-xs font-mono font-bold text-text-primary focus:border-accent focus:outline-none"
					/>
				</div>

				<!-- Rate -->
				<div class="sm:col-span-1">
					<label for="ret-manual-rate" class="text-[10px] font-semibold text-text-muted uppercase">Rate (₹)</label>
					<input
						id="ret-manual-rate"
						type="number"
						step="0.01"
						bind:value={manualRate}
						class="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-xs font-mono font-bold text-text-primary focus:border-accent focus:outline-none"
					/>
				</div>

				<!-- Add btn -->
				<div class="sm:col-span-1">
					<Button variant="secondary" onclick={addManualLine}>
						<Plus size={14} />
						<span class="sr-only">Add</span>
					</Button>
				</div>
			</div>
		</div>
	</div>

	<!-- Line Items Table -->
	<div class="overflow-x-auto border-x border-border bg-surface">
		<table class="w-full text-left text-xs">
			<thead class="border-y border-border bg-surface-secondary text-[11px] font-semibold text-text-secondary uppercase">
				<tr>
					<th class="w-8 px-3 py-2 text-center">#</th>
					<th class="px-3 py-2">Product Description</th>
					<th class="px-3 py-2">Batch / Expiry</th>
					<th class="w-28 px-3 py-2 text-right">Return Qty</th>
					<th class="w-32 px-3 py-2 text-right">Unit Rate (₹)</th>
					<th class="w-32 px-3 py-2 text-right">Line Total (₹)</th>
					<th class="w-12 px-3 py-2 text-center"></th>
				</tr>
			</thead>
			<tbody class="divide-y divide-border/60">
				{#if items.length === 0}
					<tr>
						<td colspan="7" class="py-8 text-center text-text-muted">
							<Package size={24} class="mx-auto mb-1.5 opacity-40" />
							<span>No items added. Link an invoice above or add products manually.</span>
						</td>
					</tr>
				{:else}
					{#each items as item, index (item.uiKey)}
						<tr class="hover:bg-surface-hover/50">
							<td class="px-3 py-2 text-center font-mono text-text-muted tabular-nums">
								{index + 1}
							</td>
							<td class="px-3 py-2 font-semibold text-text-primary">
								{item.productName}
							</td>
							<td class="px-3 py-2">
								<span class="font-mono font-bold text-text-primary uppercase">{item.batchNumber}</span>
								{#if item.expiryDate}
									<span class="font-mono text-[11px] text-text-muted ml-2">EXP: {item.expiryDate.substring(0, 7)}</span>
								{/if}
							</td>
							<td class="px-3 py-2 text-right">
								<input
									type="number"
									min="1"
									max={item.maxQty}
									value={item.quantity}
									oninput={(e) => updateItemQty(index, Number((e.target as HTMLInputElement).value))}
									class="w-20 rounded border border-border bg-surface px-2 py-1 text-right font-mono font-bold text-xs text-text-primary focus:border-accent focus:outline-none"
								/>
							</td>
							<td class="px-3 py-2 text-right">
								<input
									type="number"
									step="0.01"
									value={item.unitRate}
									oninput={(e) => updateItemRate(index, Number((e.target as HTMLInputElement).value))}
									class="w-24 rounded border border-border bg-surface px-2 py-1 text-right font-mono text-xs text-text-primary focus:border-accent focus:outline-none"
								/>
							</td>
							<td class="px-3 py-2 text-right font-mono font-bold text-text-primary tabular-nums">
								₹{item.lineAmount.toFixed(2)}
							</td>
							<td class="px-3 py-2 text-center">
								<button
									type="button"
									class="rounded p-1 text-text-muted hover:bg-danger-light hover:text-danger transition-colors"
									onclick={() => removeItem(index)}
								>
									<Trash2 size={13} />
								</button>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Summary Footer -->
	<div
		class="flex flex-col items-center justify-between gap-4 rounded-b-xl border border-border bg-surface-secondary p-3.5 shadow-2xs md:flex-row"
	>
		<div class="flex items-center gap-2 text-xs text-text-muted">
			<span class="font-mono font-semibold text-text-primary tabular-nums">{items.length}</span> items in return voucher
			<span class="text-border-strong">•</span>
			<span class="font-mono font-semibold text-text-primary tabular-nums">{totalQty}</span> total units
		</div>

		<div class="flex items-center gap-6 text-xs">
			<div class="space-y-1 text-right">
				<div class="text-[10px] font-bold text-text-muted uppercase">
					{returnType === 'sales_return' ? 'Total Refund (Credit)' : 'Total Debit Claim'}
				</div>
				<div class="font-mono text-2xl font-black tabular-nums {returnType === 'sales_return' ? 'text-success' : 'text-info'}">
					₹{grandTotal.toFixed(2)}
				</div>
			</div>
		</div>
	</div>
</div>
