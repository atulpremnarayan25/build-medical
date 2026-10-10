<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { PageHeader, Button } from '$lib/components/common/index.js';
	import PurchaseProductSearch from '$lib/components/purchasing/PurchaseProductSearch.svelte';
	import PurchaseItemsTable from '$lib/components/purchasing/PurchaseItemsTable.svelte';
	import PurchaseSummary from '$lib/components/purchasing/PurchaseSummary.svelte';
	import SupplierSearch from '$lib/components/purchasing/SupplierSearch.svelte';
	import PurchaseHistoryPanel from '$lib/components/purchasing/PurchaseHistoryPanel.svelte';

	import type {
		Product,
		Supplier,
		CreatePurchaseInput,
		PaymentMethod,
		CreatePurchaseItemInput
	} from '$lib/types/index.js';
	import { purchaseService } from '$lib/services/index.js';
	import { addToast } from '$lib/stores/toastStore.svelte.js';
	import { toPaise, percentOf, roundToRupee, paiseToRupees } from '$lib/utils/money.js';

	// Header State
	let selectedSupplier = $state<Supplier | null>(null);
	let isSupplierSelected = $derived(selectedSupplier !== null);
	let invoiceNumber = $state('');
	let internalPurchaseNo = $state('PUR-NEW');
	let invoiceDate = $state(new Date().toISOString().split('T')[0]);
	let paymentType = $state<PaymentMethod>('credit'); // Usually credit by default

	let searchInputRef = $state<HTMLInputElement | undefined>();
	let supplierInputRef = $state<HTMLInputElement | undefined>();
	let isSaving = $state(false);

	onMount(() => {
		tick().then(() => {
			if (supplierInputRef) supplierInputRef.focus();
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
	let activeRowIndex = $state(0);
	let activeItem = $derived(items[activeRowIndex] || items[items.length - 1] || null);
	let nextUiKey = 0;

	// Real-time Line Item Financials with Integer Paise
	let itemCalculations = $derived(
		items.map((item) => {
			const qty = Number(item.quantity) || 0;
			const freeQty = Number(item.freeQuantity) || 0;
			const packSize = Number(item.packSize) || 1;
			const baseQty = (qty + freeQty) * packSize;

			const ratePaise = toPaise(item.purchaseRate || 0);
			const lineGrossPaise = qty * ratePaise;
			const discountPaise = percentOf(lineGrossPaise, item.discount || 0);
			const taxablePaise = lineGrossPaise - discountPaise;
			const gstPaise = percentOf(taxablePaise, item.gstRate || 0);
			const lineTotalPaise = taxablePaise + gstPaise;

			const effectiveStripCost =
				baseQty > 0
					? paiseToRupees(lineTotalPaise) / baseQty
					: Number(item.purchaseRate || 0) / packSize;

			return {
				lineGrossPaise,
				discountPaise,
				taxablePaise,
				gstPaise,
				lineTotalPaise,
				baseQty,
				effectiveStripCost
			};
		})
	);

	// Aggregated Totals (Integer Paise, Zero Floating-Point Drift)
	let subtotalPaise = $derived(itemCalculations.reduce((sum, c) => sum + c.lineGrossPaise, 0));
	let discountTotalPaise = $derived(itemCalculations.reduce((sum, c) => sum + c.discountPaise, 0));
	let taxableTotalPaise = $derived(subtotalPaise - discountTotalPaise);
	let gstTotalPaise = $derived(itemCalculations.reduce((sum, c) => sum + c.gstPaise, 0));
	let grandTotalRawPaise = $derived(taxableTotalPaise + gstTotalPaise);
	let grandTotalPaise = $derived(roundToRupee(grandTotalRawPaise));
	let roundOffPaise = $derived(grandTotalPaise - grandTotalRawPaise);

	let subtotal = $derived(paiseToRupees(subtotalPaise));
	let discountTotal = $derived(paiseToRupees(discountTotalPaise));
	let taxableTotal = $derived(paiseToRupees(taxableTotalPaise));
	let gstTotal = $derived(paiseToRupees(gstTotalPaise));
	let roundOff = $derived(paiseToRupees(roundOffPaise));
	let grandTotal = $derived(paiseToRupees(grandTotalPaise));

	function handleSupplierSelect(supplier: Supplier | null) {
		selectedSupplier = supplier;
		if (supplier) {
			setTimeout(() => {
				searchInputRef?.focus();
			}, 50);
		} else {
			supplierInputRef?.focus();
		}
	}

	function focusSupplier() {
		supplierInputRef?.focus();
		supplierInputRef?.select();
		addToast('info', 'Please select a supplier first (F3).');
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
			packSize: product.packSize || 10,
			unit: 'Box',
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
			return;
		}

		if (!invoiceNumber.trim()) {
			addToast('error', 'Supplier Invoice No is required');
			return;
		}

		if (items.length === 0) {
			addToast('error', 'Add at least one item to save the purchase');
			return;
		}

		// Validate items
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			if (!item.batchNumber.trim()) {
				addToast('error', `Row ${i + 1}: Batch number is required`);
				return;
			}
			if (!item.expiryDate) {
				addToast('error', `Row ${i + 1}: Expiry date is required`);
				return;
			}
			if (item.quantity <= 0) {
				addToast('error', `Row ${i + 1}: Quantity must be greater than 0`);
				return;
			}
		}

		isSaving = true;

		try {
			const isCredit = paymentType === 'credit';
			const payload: CreatePurchaseInput = {
				invoiceNumber,
				invoiceDate,
				supplierId: selectedSupplier.id,
				supplierName: selectedSupplier.name,
				items: items.map((i, idx) => {
					const calc = itemCalculations[idx];
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const { uiKey, ...rest } = i;
					return {
						...rest,
						packSize: Number(i.packSize) || 1,
						unit: i.unit || 'Box',
						baseQuantity: calc?.baseQty ?? Number(i.quantity),
						effectiveRate: calc?.effectiveStripCost ?? Number(i.purchaseRate),
						taxableAmount: paiseToRupees(calc?.taxablePaise ?? 0),
						gstAmount: paiseToRupees(calc?.gstPaise ?? 0),
						totalAmount: paiseToRupees(calc?.lineTotalPaise ?? 0)
					};
				}),
				subtotal,
				discountTotal,
				taxableTotal,
				gstTotal,
				roundOff,
				grandTotal,
				paymentMethod: paymentType,
				paymentStatus: isCredit ? 'credit' : 'paid',
				paidAmount: isCredit ? 0 : grandTotal,
				dueAmount: isCredit ? grandTotal : 0,
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

			supplierInputRef?.focus();
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
			if (!isSupplierSelected) {
				focusSupplier();
			} else {
				searchInputRef?.focus();
				searchInputRef?.select();
			}
		}
		if (e.key === 'F3') {
			e.preventDefault();
			supplierInputRef?.focus();
			supplierInputRef?.select();
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

<div class="flex h-[calc(100vh-80px)] flex-col space-y-2">
	<PageHeader title="Goods Inward (GRN)" subtitle="{internalPurchaseNo} • Stock Inflow Voucher">
		{#snippet actions()}
			<Button variant="secondary" onclick={() => window.history.back()}>Cancel</Button>
			<Button variant="primary" disabled={isSaving} onclick={handleSavePurchase}>
				{isSaving ? 'Saving...' : 'Save Inward (F10 / Ctrl+S)'}
			</Button>
		{/snippet}
	</PageHeader>

	<!-- Keyboard Shortcuts Bar -->
	<div
		class="flex flex-wrap items-center gap-3 rounded-t-xl border border-b-0 border-border bg-sidebar px-4 py-2 text-xs font-medium text-sidebar-text shadow-2xs"
	>
		<button
			type="button"
			class="flex items-center gap-1.5 transition-colors {!isSupplierSelected ? 'text-text-muted opacity-60' : 'text-accent-hover'}"
			onclick={() => {
				if (!isSupplierSelected) {
					focusSupplier();
				} else {
					searchInputRef?.focus();
				}
			}}
		>
			<kbd class="rounded border border-sidebar-hover bg-sidebar-hover px-1.5 py-0.5 font-mono text-[10px] text-sidebar-text-active">F2</kbd>
			<span>{!isSupplierSelected ? 'Product Search (Locked)' : 'Product Search'}</span>
		</button>
		<button
			type="button"
			class="flex items-center gap-1.5 text-info transition-colors"
			onclick={() => {
				supplierInputRef?.focus();
			}}
		>
			<kbd class="rounded border border-sidebar-hover bg-sidebar-hover px-1.5 py-0.5 font-mono text-[10px] text-sidebar-text-active">F3</kbd>
			<span>Supplier / Distributor</span>
		</button>
		<span class="flex items-center gap-1.5 text-schedule-h1">
			<kbd class="rounded border border-sidebar-hover bg-sidebar-hover px-1.5 py-0.5 font-mono text-[10px] text-sidebar-text-active">F4</kbd>
			<span>Payment Terms</span>
		</span>
		<span class="flex items-center gap-1.5 text-warning">
			<kbd class="rounded border border-sidebar-hover bg-sidebar-hover px-1.5 py-0.5 font-mono text-[10px] text-sidebar-text-active">Enter</kbd>
			<span>Grid Traversal</span>
		</span>
		<span class="ml-auto flex items-center gap-1.5 text-accent">
			<kbd class="rounded border border-sidebar-hover bg-sidebar-hover px-1.5 py-0.5 font-mono text-[10px] text-sidebar-text-active">Ctrl+S / F10</kbd>
			<span>Save Purchase</span>
		</span>
	</div>

	<!-- Header fields -->
	<div class="space-y-3 border-x border-border bg-surface p-3.5 shadow-2xs">
		<div class="grid grid-cols-1 gap-3 md:grid-cols-4">
			<div>
				<span class="mb-1 block text-[11px] font-semibold text-text-secondary uppercase">Supplier / Distributor (F3) *</span>
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

		<PurchaseProductSearch
			onSelect={handleProductSelect}
			bind:inputRef={searchInputRef}
			disabled={!isSupplierSelected}
			onFocusSupplier={focusSupplier}
		/>
	</div>

	<PurchaseItemsTable
		bind:items
		bind:activeRowIndex
		onRemoveItem={handleRemoveItem}
		disabled={!isSupplierSelected}
		onFocusSupplier={focusSupplier}
	/>

	<PurchaseHistoryPanel
		productId={activeItem?.productId}
		productName={activeItem?.productName}
		currentRate={Number(activeItem?.purchaseRate) || 0}
	/>

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
