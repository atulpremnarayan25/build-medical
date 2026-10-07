<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { PageHeader, Button } from '$lib/components/common/index.js';
	import PurchaseProductSearch from '$lib/components/purchasing/PurchaseProductSearch.svelte';
	import PurchaseItemsTable from '$lib/components/purchasing/PurchaseItemsTable.svelte';
	import PurchaseSummary from '$lib/components/purchasing/PurchaseSummary.svelte';
	import SupplierSearch from '$lib/components/purchasing/SupplierSearch.svelte';

	import type {
		Product,
		Supplier,
		CreatePurchaseInput,
		PaymentMethod,
		CreatePurchaseItemInput
	} from '$lib/types/index.js';
	import { purchaseService } from '$lib/services/index.js';
	import { addToast } from '$lib/stores/toastStore.svelte.js';

	// Header State
	let selectedSupplier = $state<Supplier | null>(null);
	let invoiceNumber = $state('');
	let internalPurchaseNo = $state('PUR-NEW');
	let invoiceDate = $state(new Date().toISOString().split('T')[0]);
	let paymentType = $state<PaymentMethod>('credit'); // Usually credit by default

	let searchInputRef = $state<HTMLInputElement | undefined>();
	let supplierInputRef = $state<HTMLInputElement | undefined>();
	let isSaving = $state(false);

	onMount(() => {
		tick().then(() => {
			if (searchInputRef) searchInputRef.focus();
		});
		generateInternalNumber();
	});

	async function generateInternalNumber() {
		try {
			const purchases = await purchaseService.getPurchases();
			internalPurchaseNo = `PUR/${new Date().getFullYear()}/${(purchases.length + 1).toString().padStart(4, '0')}`;
		} catch (e) {
			console.error(e);
		}
	}

	// Line Items State
	let items = $state<(CreatePurchaseItemInput & { uiKey: number })[]>([]);
	let nextUiKey = 0;

	// Aggregated Totals
	let subtotal = $derived(items.reduce((sum, item) => sum + item.quantity * item.purchaseRate, 0));
	let discountTotal = $derived(
		items.reduce((sum, item) => sum + item.quantity * item.purchaseRate * (item.discount / 100), 0)
	);
	let taxableTotal = $derived(subtotal - discountTotal);
	let gstTotal = $derived(
		items.reduce(
			(sum, item) =>
				sum + item.quantity * item.purchaseRate * (1 - item.discount / 100) * (item.gstRate / 100),
			0
		)
	);
	let grandTotalRaw = $derived(taxableTotal + gstTotal);
	let roundOff = $derived(Math.round(grandTotalRaw) - grandTotalRaw);
	let grandTotal = $derived(Math.round(grandTotalRaw));

	function handleSupplierSelect(supplier: Supplier | null) {
		selectedSupplier = supplier;
		setTimeout(() => {
			searchInputRef?.focus();
		}, 50);
	}

	function handleProductSelect(product: Product) {
		const newItem: CreatePurchaseItemInput & { uiKey: number } = {
			uiKey: nextUiKey++,
			productId: product.id,
			productName: product.name,
			batchNumber: '',
			expiryDate: '',
			quantity: 1,
			freeQuantity: 0,
			mrp: product.mrp,
			purchaseRate: product.purchaseRate,
			discount: 0,
			gstRate: product.gstRate
		};
		items = [...items, newItem];

		setTimeout(() => {
			const batchInputs = document.querySelectorAll('.batch-input');
			if (batchInputs.length > 0) {
				const lastInput = batchInputs[batchInputs.length - 1] as HTMLInputElement;
				lastInput.focus();
				lastInput.select();
			}
		}, 50);
	}

	function handleRemoveItem(index: number) {
		items = items.filter((_, i) => i !== index);
		searchInputRef?.focus();
	}

	async function handleSavePurchase() {
		if (!selectedSupplier) {
			addToast('error', 'Please select a supplier (F3)');
			supplierInputRef?.focus();
			return;
		}

		if (!invoiceNumber.trim()) {
			addToast('error', 'Supplier Invoice No is required');
			document.getElementById('sup-inv-input')?.focus();
			return;
		}

		if (items.length === 0) {
			addToast('error', 'Add at least one item to save the purchase');
			searchInputRef?.focus();
			return;
		}

		// Validate items
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			if (!item.batchNumber.trim()) {
				addToast('error', `Row ${i + 1}: Batch number is required`);
				const batchEl = document.querySelectorAll('.batch-input')[i] as HTMLInputElement;
				batchEl?.focus();
				batchEl?.select();
				return;
			}
			if (!item.expiryDate) {
				addToast('error', `Row ${i + 1}: Expiry date is required (please select date)`);
				const expiryEl = document.querySelectorAll('.expiry-input')[i] as HTMLInputElement;
				expiryEl?.focus();
				return;
			}
			if (item.quantity <= 0) {
				addToast('error', `Row ${i + 1}: Quantity must be greater than 0`);
				const qtyEl = document.querySelectorAll('.qty-input')[i] as HTMLInputElement;
				qtyEl?.focus();
				qtyEl?.select();
				return;
			}
		}

		isSaving = true;

		try {
			const payload: CreatePurchaseInput = {
				invoiceNumber,
				invoiceDate,
				supplierId: selectedSupplier.id,
				supplierName: selectedSupplier.name,
				items: items.map((i) => {
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const { uiKey, ...rest } = i;
					return rest;
				}),
				subtotal,
				discountTotal,
				taxableTotal,
				gstTotal,
				roundOff,
				grandTotal,
				paymentMethod: paymentType,
				status: 'confirmed',
				notes: `Internal Ref: ${internalPurchaseNo}`,
				createdBy: 'user-001'
			};

			await purchaseService.createPurchase(payload);

			addToast('success', `Purchase from ${selectedSupplier.name} saved successfully`);

			// Reset form
			items = [];
			selectedSupplier = null;
			invoiceNumber = '';
			paymentType = 'credit';
			invoiceDate = new Date().toISOString().split('T')[0];
			await generateInternalNumber();

			searchInputRef?.focus();
		} catch (e) {
			console.error(e);
			addToast('error', 'Failed to save purchase');
		} finally {
			isSaving = false;
		}
	}

	function cyclePaymentType() {
		if (paymentType === 'credit') paymentType = 'cash';
		else if (paymentType === 'cash') paymentType = 'bank';
		else paymentType = 'credit';
		addToast('info', `Payment Terms: ${paymentType.toUpperCase()}`);
	}

	function handleWindowKeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key === 's') {
			e.preventDefault();
			handleSavePurchase();
		}
		if (e.key === 'F2') {
			e.preventDefault();
			searchInputRef?.focus();
		}
		if (e.key === 'F3') {
			e.preventDefault();
			supplierInputRef?.focus();
		}
		if (e.key === 'F4') {
			e.preventDefault();
			cyclePaymentType();
		}
		if (e.key === 'F10') {
			e.preventDefault();
			handleSavePurchase();
		}
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div class="flex h-[calc(100vh-80px)] flex-col space-y-3">
	<!-- Top Bar matching purchase-failure.png -->
	<div class="flex items-center justify-between py-1">
		<div>
			<h1 class="text-sm font-semibold text-text-primary">
				{internalPurchaseNo} | Receive inventory (Ctrl+S to save)
			</h1>
		</div>
		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={() => window.history.back()}
				class="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-primary shadow-xs hover:bg-surface-hover transition-colors"
			>
				Cancel
			</button>
			<button
				type="button"
				disabled={isSaving}
				onclick={handleSavePurchase}
				class="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors disabled:opacity-50"
			>
				{isSaving ? 'Saving...' : 'Save Purchase'}
			</button>
		</div>
	</div>

	<!-- Header fields -->
	<div class="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-2xs">
		<div class="grid grid-cols-1 gap-3 md:grid-cols-4">
			<div>
				<span class="mb-1 block text-[11px] font-semibold text-text-secondary uppercase">Supplier *</span>
				<SupplierSearch
					onSelect={handleSupplierSelect}
					bind:selectedSupplier
					bind:inputRef={supplierInputRef}
				/>
			</div>
			<div>
				<label
					for="sup-inv-input"
					class="mb-1 block text-[11px] font-semibold text-text-secondary uppercase"
				>Supplier Invoice No *</label>
				<input
					id="sup-inv-input"
					type="text"
					bind:value={invoiceNumber}
					class="w-full rounded border border-border bg-surface px-2.5 py-1.5 font-mono text-xs text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
					placeholder="e.g. SUP/2026/9821"
				/>
			</div>
			<div>
				<label
					for="p-date-input"
					class="mb-1 block text-[11px] font-semibold text-text-secondary uppercase"
				>Invoice Date</label>
				<input
					id="p-date-input"
					type="date"
					bind:value={invoiceDate}
					class="w-full rounded border border-border bg-surface px-2.5 py-1.5 font-mono text-xs text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
				/>
			</div>
			<div>
				<label
					for="p-payment-type"
					class="mb-1 block text-[11px] font-semibold text-text-secondary uppercase"
				>Payment Terms (F4)</label>
				<select
					id="p-payment-type"
					bind:value={paymentType}
					class="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
				>
					<option value="credit">Credit (Pay Later)</option>
					<option value="cash">Cash Paid</option>
					<option value="bank">Bank / NEFT / RTGS</option>
				</select>
			</div>
		</div>

		<PurchaseProductSearch onSelect={handleProductSelect} bind:inputRef={searchInputRef} />
	</div>

	<!-- Unified items table & summary container -->
	<div class="flex flex-1 flex-col rounded-xl border border-border bg-surface overflow-hidden shadow-2xs">
		<PurchaseItemsTable bind:items onRemoveItem={handleRemoveItem} />

		<PurchaseSummary
			itemCount={items.length}
			{subtotal}
			{discountTotal}
			{taxableTotal}
			{gstTotal}
			{roundOff}
			{grandTotal}
		/>
	</div>
</div>
