<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { PageHeader, Button } from '$lib/components/common/index.js';
	import ProductSearch from '$lib/components/billing/ProductSearch.svelte';
	import BatchSelector from '$lib/components/billing/BatchSelector.svelte';
	import InvoiceItemsTable from '$lib/components/billing/InvoiceItemsTable.svelte';
	import InvoiceSummary from '$lib/components/billing/InvoiceSummary.svelte';
	import CustomerSearch from '$lib/components/billing/CustomerSearch.svelte';
	import KeyboardShortcutsModal from '$lib/components/billing/KeyboardShortcutsModal.svelte';
	import HoldBillsModal, { type HeldBill } from '$lib/components/billing/HoldBillsModal.svelte';

	import type {
		Product,
		Batch,
		CreateSaleItemInput,
		Customer,
		SaleQuote,
		PaymentMethod
	} from '$lib/types/index.js';
	import { saleService } from '$lib/services/index.js';
	import { addToast } from '$lib/stores/toastStore.svelte.js';
	import {
		ShieldAlert,
		CreditCard,
		Receipt,
		Clock,
		CheckCircle2,
		Keyboard,
		Sparkles,
		FileText,
		ArrowLeft,
		Banknote,
		Building2,
		User,
		AlertCircle
	} from '@lucide/svelte';

	// Header State
	let selectedCustomer = $state<Customer | null>(null);
	let invoiceNumber = $state('INV-NEW');
	let date = $state(new Date().toISOString().split('T')[0]);
	let paymentType = $state<PaymentMethod>('cash');
	let customerType = $state<'retail' | 'wholesale'>('retail');
	let amountTendered = $state<number>(0);

	let searchInputRef = $state<HTMLInputElement | undefined>();
	let customerInputRef = $state<HTMLInputElement | undefined>();
	let isSaving = $state(false);
	let shortcutsOpen = $state(false);

	// Parked / Held Bills State
	let heldBills = $state<HeldBill[]>([]);
	let holdBillsOpen = $state(false);

	// Line Items State
	let items = $state<(CreateSaleItemInput & { uiKey: number; drugSchedule?: string; availableStock?: number })[]>([]);
	let nextUiKey = 0;

	// H1 tracking fields & field-anchored validation
	let hasH1Item = $derived(
		items.some((i) => i.drugSchedule === 'H1' || i.drugSchedule === 'H' || i.drugSchedule === 'X')
	);
	let patientName = $state('');
	let prescriberName = $state('');
	let prescriberRegNo = $state('');
	let h1Errors = $state({ patient: false, prescriber: false, regNo: false });

	// Server-authoritative quote (FEFO, pricing, GST).
	let quote = $state<SaleQuote | null>(null);
	let quoteError = $state<string | null>(null);
	let isQuoting = $state(false);
	let quoteSeq = 0;

	onMount(() => {
		loadHeldBills();
		tick().then(() => {
			if (searchInputRef) searchInputRef.focus();
		});
		generateInvoiceNumber();
	});

	function loadHeldBills() {
		try {
			const stored = localStorage.getItem('medstock_held_bills');
			if (stored) {
				heldBills = JSON.parse(stored);
			}
		} catch (e) {
			console.error('Failed to load held bills from localStorage', e);
		}
	}

	function saveHeldBills(list: HeldBill[]) {
		heldBills = list;
		try {
			localStorage.setItem('medstock_held_bills', JSON.stringify(list));
		} catch (e) {
			console.error('Failed to save held bills to localStorage', e);
		}
	}

	async function generateInvoiceNumber() {
		try {
			const sales = await saleService.getSales();
			invoiceNumber = `INV/${new Date().getFullYear()}/${(sales.length + 1).toString().padStart(4, '0')}`;
		} catch (e) {
			console.error(e);
		}
	}

	function toEngineLine(i: CreateSaleItemInput) {
		return {
			productId: i.productId,
			batchId: i.batchId || undefined,
			quantity: Number(i.quantity),
			rate: Number(i.rate),
			discount: Number(((i.quantity * i.rate * i.discount) / 100).toFixed(2))
		};
	}

	async function refreshQuote() {
		const seq = ++quoteSeq;
		if (items.length === 0) {
			quote = null;
			quoteError = null;
			isQuoting = false;
			return;
		}
		isQuoting = true;
		try {
			const result = await saleService.quoteSale({
				saleType: customerType,
				customerId: selectedCustomer?.id ?? null,
				items: items.map(toEngineLine)
			});
			if (seq === quoteSeq) {
				quote = result;
				quoteError = null;
			}
		} catch (e) {
			if (seq === quoteSeq) {
				quote = null;
				quoteError = e instanceof Error ? e.message : 'Could not price this bill';
			}
		} finally {
			if (seq === quoteSeq) isQuoting = false;
		}
	}

	$effect(() => {
		const lineSignature = JSON.stringify(
			items.map((i) => [i.productId, i.batchId, i.quantity, i.rate, i.discount])
		);
		void lineSignature;
		void customerType;
		void selectedCustomer?.id;
		const t = setTimeout(refreshQuote, 250);
		return () => clearTimeout(t);
	});

	let grandTotal = $derived(quote?.grandTotalRupees ?? 0);
	let subtotal = $derived(quote?.subtotalRupees ?? 0);
	let discountTotal = $derived(quote?.discountRupees ?? 0);
	let taxableTotal = $derived(quote?.taxableTotalRupees ?? 0);
	let gstTotal = $derived(quote?.gstTotalRupees ?? 0);
	let roundOff = $derived(quote?.roundOffRupees ?? 0);
	let changeDue = $derived(amountTendered > grandTotal ? amountTendered - grandTotal : 0);
	let amountPending = $derived(grandTotal > amountTendered ? grandTotal - amountTendered : 0);

	// Batch selection modal state
	let selectorOpen = $state(false);
	let selectorProduct = $state<Product | null>(null);
	let selectorBatches = $state<Batch[]>([]);

	function handleCustomerSelect(customer: Customer | null) {
		selectedCustomer = customer;
		setTimeout(() => {
			searchInputRef?.focus();
		}, 50);
	}

	function handleProductSelect(product: Product, batches: Batch[]) {
		const activeBatches = batches.filter((b) => b.quantity > 0 && b.status !== 'expired');

		if (activeBatches.length === 1) {
			addBatchToInvoice(product, activeBatches[0]);
		} else if (activeBatches.length > 1) {
			selectorProduct = product;
			selectorBatches = activeBatches;
			selectorOpen = true;
		} else {
			addToast('error', `No available stock for ${product.name}`);
			searchInputRef?.focus();
		}
	}

	function addBatchToInvoice(product: Product, batch: Batch) {
		const newItem: CreateSaleItemInput & { uiKey: number; drugSchedule?: string; availableStock?: number } = {
			uiKey: nextUiKey++,
			productId: product.id,
			productName: product.name,
			batchId: batch.id,
			batchNumber: batch.batchNumber,
			expiryDate: batch.expiryDate,
			quantity: 1,
			mrp: batch.mrp,
			rate: batch.sellingRate,
			discount: 0,
			gstRate: product.gstRate,
			drugSchedule: product.drugSchedule,
			availableStock: batch.quantity
		};
		items = [...items, newItem];

		setTimeout(() => {
			const qtyInputs = document.querySelectorAll('.qty-input');
			if (qtyInputs.length > 0) {
				const lastInput = qtyInputs[qtyInputs.length - 1] as HTMLInputElement;
				lastInput.focus();
				lastInput.select();
			}
		}, 50);
	}

	function handleBatchSelected(batch: Batch) {
		if (selectorProduct) {
			addBatchToInvoice(selectorProduct, batch);
		}
		selectorOpen = false;
	}

	function handleBatchSelectorCancel() {
		selectorOpen = false;
		searchInputRef?.focus();
	}

	function handleRemoveItem(index: number) {
		items = items.filter((_, i) => i !== index);
		searchInputRef?.focus();
	}

	async function handleSaveSale() {
		// H1 tracking & field-anchored validation
		if (hasH1Item) {
			h1Errors = { patient: false, prescriber: false, regNo: false };
			if (!patientName.trim()) {
				h1Errors.patient = true;
				addToast('error', 'Patient Name is strictly required for Schedule H1 drug sales.');
				tick().then(() => document.getElementById('h1-patient')?.focus());
				return;
			}
			if (!prescriberName.trim()) {
				h1Errors.prescriber = true;
				addToast('error', 'Prescribing Doctor Name is required for Schedule H1 drugs.');
				tick().then(() => document.getElementById('h1-prescriber')?.focus());
				return;
			}
			if (!prescriberRegNo.trim()) {
				h1Errors.regNo = true;
				addToast('error', 'Doctor Registration Number is required for Schedule H1 drugs.');
				tick().then(() => document.getElementById('h1-regno')?.focus());
				return;
			}
		}

		if (items.length === 0) {
			addToast('error', 'Add at least one item to save the invoice');
			return;
		}

		isSaving = true;

		try {
			const paidNow =
				customerType === 'retail'
					? paymentType === 'credit'
						? 0
						: grandTotal
					: Math.min(amountTendered || 0, grandTotal);

			const h1Notes = hasH1Item
				? `H1 Patient: ${patientName}; Prescriber: ${prescriberName} (${prescriberRegNo})`
				: '';

			const payload = {
				saleType: customerType,
				customerId: selectedCustomer?.id ?? null,
				items: items.map(toEngineLine),
				amountPaidAtSaleRupees: paidNow > 0 ? paidNow : undefined,
				paymentMethod: paymentType,
				notes: h1Notes
			};

			const invoice = await saleService.createSale(payload);

			addToast('success', `Invoice ${invoice.invoiceNumber} created successfully`);

			// Reset form for next billing
			items = [];
			selectedCustomer = null;
			paymentType = 'cash';
			customerType = 'retail';
			amountTendered = 0;
			patientName = '';
			prescriberName = '';
			prescriberRegNo = '';
			h1Errors = { patient: false, prescriber: false, regNo: false };
			date = new Date().toISOString().split('T')[0];
			await generateInvoiceNumber();

			searchInputRef?.focus();
		} catch (e) {
			console.error(e);
			addToast('error', e instanceof Error ? e.message : 'Failed to save invoice');
		} finally {
			isSaving = false;
		}
	}

	function cyclePaymentType() {
		if (paymentType === 'cash') paymentType = 'credit';
		else if (paymentType === 'credit') paymentType = 'bank';
		else paymentType = 'cash';
		addToast('info', `Payment Mode: ${paymentType.toUpperCase()}`);
	}

	function toggleSaleType() {
		customerType = customerType === 'retail' ? 'wholesale' : 'retail';
		addToast('info', `Switched to ${customerType.toUpperCase()} Pricing`);
	}

	function setQuickTender(amount: number) {
		amountTendered = amount;
	}

	function addQuickTender(extra: number) {
		amountTendered = (amountTendered || 0) + extra;
	}

	function handleHoldSale() {
		if (items.length === 0) {
			if (heldBills.length > 0) {
				holdBillsOpen = true;
			} else {
				addToast('info', 'No active items to hold. Press F6 when you have items in the grid.');
			}
			return;
		}

		const newHeldBill: HeldBill = {
			id: 'hold-' + Date.now(),
			invoiceNumber,
			timestamp: new Date().toISOString(),
			customer: selectedCustomer,
			customerType,
			paymentType,
			amountTendered,
			patientName,
			prescriberName,
			prescriberRegNo,
			items: [...items],
			totalAmount: grandTotal || items.reduce((sum, i) => sum + i.quantity * i.rate * (1 - i.discount / 100), 0)
		};

		saveHeldBills([newHeldBill, ...heldBills]);
		addToast('success', `Bill ${invoiceNumber} placed on hold. (${heldBills.length} parked bills)`);

		// Reset for next customer
		items = [];
		selectedCustomer = null;
		paymentType = 'cash';
		customerType = 'retail';
		amountTendered = 0;
		patientName = '';
		prescriberName = '';
		prescriberRegNo = '';
		h1Errors = { patient: false, prescriber: false, regNo: false };
		generateInvoiceNumber();
		searchInputRef?.focus();
	}

	function handleRecallBill(bill: HeldBill) {
		items = bill.items;
		selectedCustomer = bill.customer;
		customerType = bill.customerType;
		paymentType = bill.paymentType;
		amountTendered = bill.amountTendered;
		patientName = bill.patientName || '';
		prescriberName = bill.prescriberName || '';
		prescriberRegNo = bill.prescriberRegNo || '';
		h1Errors = { patient: false, prescriber: false, regNo: false };

		saveHeldBills(heldBills.filter((b) => b.id !== bill.id));
		holdBillsOpen = false;
		addToast('success', `Recalled parked bill for ${bill.customer ? bill.customer.name : 'Walk-in Customer'}`);
		tick().then(() => searchInputRef?.focus());
	}

	function handleDiscardHeldBill(id: string) {
		saveHeldBills(heldBills.filter((b) => b.id !== id));
		addToast('info', 'Parked bill discarded');
	}

	function handleWindowKeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
			e.preventDefault();
			handleSaveSale();
		}
		if (e.key === 'F2') {
			e.preventDefault();
			searchInputRef?.focus();
		}
		if (e.key === 'F3') {
			e.preventDefault();
			customerInputRef?.focus();
		}
		if (e.key === 'F4') {
			e.preventDefault();
			cyclePaymentType();
		}
		if (e.key === 'F6') {
			e.preventDefault();
			handleHoldSale();
		}
		if (e.key === 'F8') {
			e.preventDefault();
			toggleSaleType();
		}
		if (e.key === 'F10') {
			e.preventDefault();
			handleSaveSale();
		}
		if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
			e.preventDefault();
			shortcutsOpen = !shortcutsOpen;
		}
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div class="flex flex-col gap-4 min-h-[calc(100vh-85px)]">
	<!-- Top Bar / Action Header -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
		<div class="flex items-center gap-3">
			<a
				href="/sales"
				class="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 shadow-2xs"
				title="Back to Sales Hub"
			>
				<ArrowLeft size={16} />
			</a>
			<div>
				<div class="flex items-center gap-2">
					<h1 class="text-base sm:text-lg font-bold text-slate-900">High-Speed Billing Terminal</h1>
					<span class="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 font-mono text-[11px] font-bold text-teal-700">
						{invoiceNumber}
					</span>
				</div>
				<p class="text-xs text-slate-500">Zero-latency keyboard POS for retail and wholesale billing</p>
			</div>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				onclick={() => (shortcutsOpen = true)}
				class="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors min-h-[36px]"
				title="View keyboard shortcuts (?)"
			>
				<Keyboard size={14} class="text-teal-600" />
				<span class="hidden sm:inline">Shortcuts</span>
				<kbd class="font-mono text-[10px] text-slate-500 border border-slate-300 bg-white rounded px-1">?</kbd>
			</button>

			<Button variant="outline" size="sm" onclick={handleHoldSale}>
				<Clock size={13} class="mr-1" />
				<span>Hold (F6)</span>
				{#if heldBills.length > 0}
					<span class="ml-1.5 rounded-full bg-amber-100 border border-amber-300 px-1.5 py-0.2 font-mono text-[10px] font-bold text-amber-800">
						{heldBills.length}
					</span>
				{/if}
			</Button>

			{#if heldBills.length > 0}
				<Button variant="secondary" size="sm" onclick={() => (holdBillsOpen = true)}>
					<span>Parked ({heldBills.length})</span>
				</Button>
			{/if}

			<Button variant="royal" size="sm" disabled={isSaving || items.length === 0} onclick={handleSaveSale}>
				<CheckCircle2 size={14} class="mr-1.5" />
				<span>{isSaving ? 'Processing...' : 'Save & Print (Ctrl+S)'}</span>
			</Button>
		</div>
	</div>

	<!-- High-Visibility Keyboard Function Bar -->
	<div class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/90 px-4 py-2 text-xs">
		<div class="flex flex-wrap items-center gap-3">
			<button type="button" onclick={() => searchInputRef?.focus()} class="flex items-center gap-1.5 text-teal-700 font-semibold hover:underline cursor-pointer">
				<kbd class="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold text-teal-700 shadow-2xs">F2</kbd>
				<span>Search Medicine</span>
			</button>
			<button type="button" onclick={() => customerInputRef?.focus()} class="flex items-center gap-1.5 text-slate-800 font-semibold hover:underline cursor-pointer">
				<kbd class="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-800 shadow-2xs">F3</kbd>
				<span>Customer</span>
			</button>
			<button type="button" onclick={cyclePaymentType} class="flex items-center gap-1.5 text-slate-700 font-semibold hover:underline cursor-pointer">
				<kbd class="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700 shadow-2xs">F4</kbd>
				<span>Mode: <strong class="uppercase text-teal-700">{paymentType}</strong></span>
			</button>
			<button type="button" onclick={handleHoldSale} class="flex items-center gap-1.5 text-slate-700 font-semibold hover:underline cursor-pointer">
				<kbd class="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700 shadow-2xs">F6</kbd>
				<span>Hold / Recall {#if heldBills.length > 0}<strong class="text-amber-700">({heldBills.length})</strong>{/if}</span>
			</button>
			<button type="button" onclick={toggleSaleType} class="flex items-center gap-1.5 text-slate-700 font-semibold hover:underline cursor-pointer">
				<kbd class="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700 shadow-2xs">F8</kbd>
				<span>Type: <strong class="uppercase text-teal-700">{customerType}</strong></span>
			</button>
		</div>

		<div class="flex items-center gap-2 text-[11px] text-text-muted">
			<span class="flex items-center gap-1">
				<kbd class="rounded border border-border bg-surface px-1 font-mono text-[11px]">Enter</kbd>
				<span>advance cell</span>
			</span>
			<span>•</span>
			<span class="flex items-center gap-1">
				<kbd class="rounded border border-border bg-surface px-1 font-mono text-[11px]">Ctrl+Del</kbd>
				<span>delete item</span>
			</span>
		</div>
	</div>

	<!-- Billing Controls Box (Axiscare Card Style) -->
	<div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
			<!-- Sale Type -->
			<div>
				<label for="sale-type-select" class="mb-1 block text-xs font-semibold text-slate-600">
					Sale Type (F8)
				</label>
				<select
					id="sale-type-select"
					bind:value={customerType}
					class="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all cursor-pointer"
				>
					<option value="retail">Retail (B2C Standard)</option>
					<option value="wholesale">Wholesale (B2B Bulk)</option>
				</select>
			</div>

			<!-- Customer Search -->
			<div class="lg:col-span-2">
				<label for="customer-search-box" class="mb-1 block text-xs font-semibold text-slate-600">
					Customer / Patient (F3)
				</label>
				<CustomerSearch
					onSelect={handleCustomerSelect}
					bind:selectedCustomer
					bind:inputRef={customerInputRef}
				/>
			</div>

			<!-- Invoice Date -->
			<div>
				<label for="date-input" class="mb-1 block text-xs font-semibold text-slate-600">
					Invoice Date
				</label>
				<input
					id="date-input"
					type="date"
					bind:value={date}
					class="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all"
				/>
			</div>

			<!-- Payment Method -->
			<div>
				<label for="payment-method-select" class="mb-1 block text-xs font-semibold text-slate-600">
					Payment Mode (F4)
				</label>
				<select
					id="payment-method-select"
					bind:value={paymentType}
					class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-teal-700 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all cursor-pointer shadow-2xs"
				>
					<option value="cash">💵 Cash Payment</option>
					<option value="bank">📱 UPI / Bank Transfer</option>
					<option value="credit">📑 Credit Ledger (Due)</option>
				</select>
			</div>
		</div>

		<!-- Product Search Input Hero (Anchored, never moves) -->
		<ProductSearch onSelect={handleProductSelect} bind:inputRef={searchInputRef} />
	</div>

	<!-- Line Items Data Grid -->
	<div class="flex flex-1 flex-col rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
		<InvoiceItemsTable bind:items onRemoveItem={handleRemoveItem} />

		{#if quoteError}
			<div class="border-t border-danger/30 bg-danger-light/50 px-4 py-2 text-xs font-medium text-danger">
				⚠️ {quoteError}
			</div>
		{/if}

		<InvoiceSummary
			itemCount={items.length}
			{subtotal}
			{discountTotal}
			{taxableTotal}
			{gstTotal}
			{roundOff}
			{grandTotal}
		/>
	</div>

	<!-- Statutory Schedule H1 & Controlled Drugs Mandatory Register Box (Axiscare Style) -->
	{#if hasH1Item}
		<div class="rounded-2xl border border-purple-200/80 bg-purple-50/50 p-5 shadow-xs">
			<div class="flex items-center justify-between gap-2 mb-3">
				<div class="flex items-center gap-2">
					<div class="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700 border border-purple-200">
						<ShieldAlert size={15} />
					</div>
					<span class="text-xs font-bold text-purple-950">
						Schedule H1 / Regulated Drug Register (Mandatory Statutory Compliance)
					</span>
				</div>
				<span class="text-[11px] font-semibold text-purple-700">
					Required by Drugs & Cosmetics Rules, 1945
				</span>
			</div>

			<div class="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
				<div>
					<label for="h1-patient" class="mb-1 block text-[11px] font-semibold text-slate-700">
						Patient Name & Address <span class="text-rose-600">*</span>
					</label>
					<input
						id="h1-patient"
						type="text"
						bind:value={patientName}
						oninput={() => (h1Errors.patient = false)}
						placeholder="Patient Full Name & Address"
						class="w-full rounded-xl border bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all
							{h1Errors.patient
								? 'border-rose-500 ring-2 ring-rose-500/20'
								: 'border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'}"
					/>
				</div>

				<div>
					<label for="h1-prescriber" class="mb-1 block text-[11px] font-semibold text-slate-700">
						Prescribing Doctor <span class="text-rose-600">*</span>
					</label>
					<input
						id="h1-prescriber"
						type="text"
						bind:value={prescriberName}
						oninput={() => (h1Errors.prescriber = false)}
						placeholder="Dr. Full Name"
						class="w-full rounded-xl border bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all
							{h1Errors.prescriber
								? 'border-rose-500 ring-2 ring-rose-500/20'
								: 'border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'}"
					/>
				</div>

				<div>
					<label for="h1-regno" class="mb-1 block text-[11px] font-semibold text-slate-700">
						Doctor Reg Number <span class="text-rose-600">*</span>
					</label>
					<input
						id="h1-regno"
						type="text"
						bind:value={prescriberRegNo}
						oninput={() => (h1Errors.regNo = false)}
						placeholder="MCI / State Medical Council Reg No"
						class="w-full rounded-xl border bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all
							{h1Errors.regNo
								? 'border-rose-500 ring-2 ring-rose-500/20'
								: 'border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'}"
					/>
				</div>
			</div>
		</div>
	{/if}

	<!-- Payment Settlement & Cash Drawer Strip -->
	<div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
		<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
			<!-- Tendered input & quick cash helpers -->
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<label for="amountTendered" class="text-xs font-bold text-text-primary">
						{customerType === 'retail' ? 'Cash Tendered (₹)' : 'Immediate Payment (₹)'}:
					</label>
					{#if isQuoting}
						<span class="text-[11px] text-accent animate-pulse font-medium">calculating tax…</span>
					{/if}
				</div>

				<div class="flex flex-wrap items-center gap-2">
					<input
						id="amountTendered"
						type="number"
						bind:value={amountTendered}
						min="0"
						step="0.01"
						placeholder="0.00"
						class="w-36 rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-base font-bold text-text-primary tabular-nums focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
					/>

					<button
						type="button"
						onclick={() => setQuickTender(grandTotal)}
						class="rounded-md border border-border bg-surface-secondary px-2.5 py-1.5 font-mono text-xs font-semibold text-text-secondary hover:bg-surface-hover hover:text-text-primary"
					>
						Exact (₹{grandTotal.toFixed(0)})
					</button>
					<button
						type="button"
						onclick={() => addQuickTender(100)}
						class="rounded-md border border-border bg-surface-secondary px-2.5 py-1.5 font-mono text-xs font-semibold text-text-secondary hover:bg-surface-hover hover:text-text-primary"
					>
						+₹100
					</button>
					<button
						type="button"
						onclick={() => addQuickTender(500)}
						class="rounded-md border border-border bg-surface-secondary px-2.5 py-1.5 font-mono text-xs font-semibold text-text-secondary hover:bg-surface-hover hover:text-text-primary"
					>
						+₹500
					</button>
					<button
						type="button"
						onclick={() => addQuickTender(2000)}
						class="rounded-md border border-border bg-surface-secondary px-2.5 py-1.5 font-mono text-xs font-semibold text-text-secondary hover:bg-surface-hover hover:text-text-primary"
					>
						+₹2000
					</button>
				</div>
			</div>

			<!-- Real-time change / balance calculation pills -->
			<div class="flex flex-wrap items-center gap-4">
				{#if customerType === 'retail'}
					<div class="flex items-center gap-3 rounded-lg border border-border bg-surface-secondary px-4 py-2">
						<div>
							<div class="text-[11px] font-bold uppercase tracking-wider text-text-muted">Change to Return</div>
							<div class="font-mono text-xl font-black {changeDue > 0 ? 'text-success' : 'text-text-primary'} tabular-nums">
								₹{changeDue.toFixed(2)}
							</div>
						</div>
					</div>
				{:else}
					<div class="flex items-center gap-3 rounded-lg border border-border bg-surface-secondary px-4 py-2">
						<div>
							<div class="text-[11px] font-bold uppercase tracking-wider text-text-muted">Balance to Ledger (Due)</div>
							<div class="font-mono text-xl font-black {amountPending > 0 ? 'text-warning' : 'text-text-primary'} tabular-nums">
								₹{amountPending.toFixed(2)}
							</div>
						</div>
					</div>
				{/if}

				<Button
					variant="primary"
					size="lg"
					disabled={isSaving || items.length === 0}
					onclick={handleSaveSale}
					class="w-full sm:w-auto"
				>
					<CheckCircle2 size={18} class="mr-2" />
					<span>Finalize & Print (Ctrl+S)</span>
				</Button>
			</div>
		</div>
	</div>
</div>

<BatchSelector
	bind:open={selectorOpen}
	product={selectorProduct}
	batches={selectorBatches}
	onSelect={handleBatchSelected}
	onCancel={handleBatchSelectorCancel}
/>

<HoldBillsModal
	bind:open={holdBillsOpen}
	{heldBills}
	onRecall={handleRecallBill}
	onDiscard={handleDiscardHeldBill}
	onclose={() => (holdBillsOpen = false)}
/>

<KeyboardShortcutsModal bind:open={shortcutsOpen} onclose={() => (shortcutsOpen = false)} />
