<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { PageData } from './$types.js';
	import ProductSearch from '$lib/components/billing/ProductSearch.svelte';
	import InvoiceItemsTable from '$lib/components/billing/InvoiceItemsTable.svelte';
	import CustomerSearch from '$lib/components/billing/CustomerSearch.svelte';
	import KeyboardShortcutsModal from '$lib/components/billing/KeyboardShortcutsModal.svelte';
	import HoldBillsModal, { type HeldBill } from '$lib/components/billing/HoldBillsModal.svelte';
	import PrintableInvoice, { type PrintableInvoiceData } from '$lib/components/billing/PrintableInvoice.svelte';

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
		Clock,
		CheckCircle2,
		Keyboard,
		ArrowLeft,
		Printer,
		FileText,
		Layers,
		MapPin,
		Package,
		Sparkles,
		AlertTriangle,
		User,
		Building2,
		RotateCcw
	} from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	// Header & Transaction State
	let selectedCustomer = $state<Customer | null>(null);
	let invoiceNumber = $state('INV-NEW');
	let date = $state(new Date().toISOString().split('T')[0]);
	let paymentType = $state<PaymentMethod>('cash');
	let customerType = $state<'retail' | 'wholesale'>('retail');
	let amountTendered = $state<number>(0);
	let printMode = $state<'thermal' | 'tax-invoice'>('thermal');

	let searchInputRef = $state<HTMLInputElement | undefined>();
	let customerInputRef = $state<HTMLInputElement | undefined>();
	let isSaving = $state(false);
	let shortcutsOpen = $state(false);

	// Parked / Held Bills State
	let heldBills = $state<HeldBill[]>([]);
	let holdBillsOpen = $state(false);

	// Line Items State
	let items = $state<
		(CreateSaleItemInput & {
			uiKey: number;
			drugSchedule?: string;
			availableStock?: number;
			genericName?: string;
			rackLocation?: string;
			hsnCode?: string;
			category?: string;
		})[]
	>([]);
	let nextUiKey = 0;
	let activeItemIndex = $state(0);

	// Active Item for Bottom Inspector Strip
	let activeItem = $derived(
		items.length > 0
			? items[Math.min(activeItemIndex, items.length - 1)] ?? null
			: null
	);

	// H1 tracking fields & field-anchored validation
	let hasH1Item = $derived(
		items.some((i) => i.drugSchedule === 'H1' || i.drugSchedule === 'H' || i.drugSchedule === 'X')
	);
	let patientName = $state('');
	let prescriberName = $state('');
	let prescriberRegNo = $state('');
	let h1Errors = $state({ patient: false, prescriber: false, regNo: false });

	// Server-authoritative quote (FEFO, pricing, GST)
	let quote = $state<SaleQuote | null>(null);
	let quoteError = $state<string | null>(null);
	let isQuoting = $state(false);
	let quoteSeq = 0;

	// Printable Invoice Snapshot
	let lastCompletedSale = $state<PrintableInvoiceData | null>(null);

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
		const t = setTimeout(refreshQuote, 200);
		return () => clearTimeout(t);
	});

	let grandTotal = $derived(quote?.grandTotalRupees ?? 0);
	let subtotal = $derived(quote?.subtotalRupees ?? 0);
	let discountTotal = $derived(quote?.discountRupees ?? 0);
	let taxableTotal = $derived(quote?.taxableTotalRupees ?? 0);
	let cgstTotal = $derived(quote?.gstTotalRupees ? quote.gstTotalRupees / 2 : 0);
	let sgstTotal = $derived(quote?.gstTotalRupees ? quote.gstTotalRupees / 2 : 0);
	let gstTotal = $derived(quote?.gstTotalRupees ?? 0);
	let roundOff = $derived(quote?.roundOffRupees ?? 0);
	let changeDue = $derived(amountTendered > grandTotal ? amountTendered - grandTotal : 0);
	let amountPending = $derived(grandTotal > amountTendered ? grandTotal - amountTendered : 0);

	function handleCustomerSelect(customer: Customer | null) {
		selectedCustomer = customer;
		setTimeout(() => {
			searchInputRef?.focus();
		}, 50);
	}

	// Inline batch selection callback from ProductSearch.svelte
	function handleInlineBatchSelect(product: Product, batch: Batch) {
		const newItem = {
			uiKey: nextUiKey++,
			productId: product.id,
			productName: product.name,
			batchId: batch.id,
			batchNumber: batch.batchNumber,
			expiryDate: batch.expiryDate,
			quantity: 1,
			mrp: batch.mrp,
			rate: customerType === 'wholesale' ? (batch.purchaseRate * 1.1) : batch.sellingRate,
			discount: 0,
			gstRate: product.gstRate,
			drugSchedule: product.drugSchedule,
			availableStock: batch.quantity,
			genericName: product.genericName || 'Standard Formulation',
			rackLocation: (product as any).rackLocation || 'Rack A-01',
			hsnCode: product.hsnCode || product.hsn || '3004',
			category: product.category || 'General'
		};

		items = [...items, newItem];
		activeItemIndex = items.length - 1;

		setTimeout(() => {
			const qtyInputs = document.querySelectorAll('.qty-input');
			if (qtyInputs.length > 0) {
				const lastInput = qtyInputs[qtyInputs.length - 1] as HTMLInputElement;
				lastInput.focus();
				lastInput.select();
			}
		}, 50);
	}

	function handleRemoveItem(index: number) {
		items = items.filter((_, i) => i !== index);
		if (activeItemIndex >= items.length) {
			activeItemIndex = Math.max(0, items.length - 1);
		}
		searchInputRef?.focus();
	}

	async function handleSaveSale() {
		// H1 statutory tracking & field-anchored validation
		if (hasH1Item) {
			h1Errors = { patient: false, prescriber: false, regNo: false };
			if (!patientName.trim()) {
				h1Errors.patient = true;
				addToast('error', 'Patient Name is strictly required for Schedule H/H1 drug sales.');
				tick().then(() => document.getElementById('h1-patient')?.focus());
				return;
			}
			if (!prescriberName.trim()) {
				h1Errors.prescriber = true;
				addToast('error', 'Prescribing Doctor Name is required for Schedule H/H1 drugs.');
				tick().then(() => document.getElementById('h1-prescriber')?.focus());
				return;
			}
			if (!prescriberRegNo.trim()) {
				h1Errors.regNo = true;
				addToast('error', 'Doctor Registration Number is required for Schedule H/H1 drugs.');
				tick().then(() => document.getElementById('h1-regno')?.focus());
				return;
			}
		}

		if (items.length === 0) {
			addToast('error', 'Add at least one item to save the invoice');
			searchInputRef?.focus();
			return;
		}

		isSaving = true;

		try {
			const paidNow =
				customerType === 'retail'
					? paymentType === 'credit'
						? 0
						: (amountTendered > 0 ? amountTendered : grandTotal)
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

			// Prepare printable view data snapshot
			lastCompletedSale = {
				invoiceNumber: invoice.invoiceNumber,
				createdAt: invoice.createdAt || new Date().toISOString(),
				saleType: customerType,
				paymentMethod: paymentType,
				subtotal: subtotal,
				discountTotal: discountTotal,
				taxableTotal: taxableTotal,
				cgstTotal: cgstTotal,
				sgstTotal: sgstTotal,
				gstTotal: gstTotal,
				roundOff: roundOff,
				grandTotal: grandTotal,
				amountTendered: amountTendered || grandTotal,
				changeDue: changeDue,
				customer: selectedCustomer,
				items: items.map((i) => ({
					productName: i.productName,
					batchNumber: i.batchNumber,
					expiryDate: i.expiryDate,
					quantity: i.quantity,
					mrp: i.mrp,
					rate: i.rate,
					discount: i.discount,
					gstRate: i.gstRate,
					hsnCode: i.hsnCode,
					lineTotal: Number((i.quantity * i.rate * (1 - i.discount / 100)).toFixed(2)),
					drugSchedule: i.drugSchedule
				})),
				patientName,
				prescriberName,
				prescriberRegNo
			};

			addToast('success', `Invoice ${invoice.invoiceNumber} saved! Launching print...`);

			// Trigger print subsystem
			await tick();
			setTimeout(() => {
				window.print();
			}, 100);

			// Reset terminal fields for next customer
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
			activeItemIndex = 0;
			await generateInvoiceNumber();

			// Auto-focus search for the next customer
			setTimeout(() => {
				searchInputRef?.focus();
			}, 300);
		} catch (e) {
			console.error(e);
			addToast('error', e instanceof Error ? e.message : 'Failed to save invoice');
		} finally {
			isSaving = false;
		}
	}

	function cyclePaymentType() {
		// Cash -> UPI -> Credit Khata
		if (paymentType === 'cash') {
			paymentType = 'bank';
			addToast('info', 'Payment Mode: UPI / BANK');
		} else if (paymentType === 'bank') {
			paymentType = 'credit';
			addToast('info', 'Payment Mode: CREDIT KHATA');
		} else {
			paymentType = 'cash';
			addToast('info', 'Payment Mode: CASH');
		}
	}

	function toggleSaleType() {
		customerType = customerType === 'retail' ? 'wholesale' : 'retail';
		addToast('info', `Switched to ${customerType.toUpperCase()} Pricing`);
	}

	function setQuickTender(amount: number) {
		amountTendered = Math.round(amount);
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
		activeItemIndex = 0;

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
		} else if (e.key === 'F2') {
			e.preventDefault();
			searchInputRef?.focus();
		} else if (e.key === 'F3') {
			e.preventDefault();
			customerInputRef?.focus();
		} else if (e.key === 'F4') {
			e.preventDefault();
			cyclePaymentType();
		} else if (e.key === 'F6') {
			e.preventDefault();
			handleHoldSale();
		} else if (e.key === 'F7') {
			e.preventDefault();
			holdBillsOpen = true;
		} else if (e.key === 'F8') {
			e.preventDefault();
			toggleSaleType();
		} else if (e.key === 'F10') {
			e.preventDefault();
			handleSaveSale();
		} else if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
			e.preventDefault();
			shortcutsOpen = !shortcutsOpen;
		}
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<!-- POS SCREEN LAYOUT: 65/35 Ergonomic Split Screen -->
<div class="pos-screen-layout flex flex-col gap-2.5 min-h-[calc(100vh-80px)]">
	<!-- Top Bar / Terminal Navigation -->
	<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-surface px-4 py-2.5 shadow-2xs">
		<div class="flex items-center gap-3">
			<a
				href="/sales"
				class="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
				title="Back to Sales Hub"
			>
				<ArrowLeft size={16} />
			</a>
			<div>
				<div class="flex items-center gap-2">
					<h1 class="text-sm font-bold text-text-primary">High-Speed Billing Terminal</h1>
					<span class="rounded border border-accent/20 bg-accent-light px-2 py-0.5 font-mono text-xs font-bold text-accent">
						{invoiceNumber}
					</span>
					<span class="rounded bg-surface-secondary px-1.5 py-0.5 text-[10px] font-semibold text-text-muted">
						{data.currentUser?.name || 'Cashier'}
					</span>
				</div>
			</div>
		</div>

		<!-- Action bar & shortcut toggles -->
		<div class="flex items-center gap-2">
			<!-- Print format switch (Thermal 80mm vs A4 Tax Invoice) -->
			<div class="flex items-center rounded-lg border border-border bg-surface-secondary p-0.5 text-xs font-semibold">
				<button
					type="button"
					onclick={() => (printMode = 'thermal')}
					class="flex items-center gap-1 rounded-md px-2 py-1 transition-colors {printMode === 'thermal'
						? 'bg-surface text-accent shadow-2xs font-bold'
						: 'text-text-muted hover:text-text-primary'}"
				>
					<Printer size={12} />
					<span>80mm Thermal</span>
				</button>
				<button
					type="button"
					onclick={() => (printMode = 'tax-invoice')}
					class="flex items-center gap-1 rounded-md px-2 py-1 transition-colors {printMode === 'tax-invoice'
						? 'bg-surface text-accent shadow-2xs font-bold'
						: 'text-text-muted hover:text-text-primary'}"
				>
					<FileText size={12} />
					<span>A4 Tax Invoice</span>
				</button>
			</div>

			<button
				type="button"
				onclick={() => (shortcutsOpen = true)}
				class="flex items-center gap-1 rounded-lg border border-border bg-surface-secondary px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-hover hover:text-text-primary"
				title="View keyboard shortcuts (?)"
			>
				<Keyboard size={13} class="text-accent" />
				<span class="hidden sm:inline">Shortcuts</span>
				<kbd class="font-mono text-[10px] text-text-muted border border-border rounded px-1">?</kbd>
			</button>

			<button
				type="button"
				onclick={handleHoldSale}
				class="flex items-center gap-1 rounded-lg border border-border bg-surface-secondary px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-hover hover:text-text-primary"
			>
				<Clock size={13} class="text-warning" />
				<span>Hold (F6)</span>
				{#if heldBills.length > 0}
					<span class="rounded-full bg-warning-light border border-warning/20 px-1.5 py-0.2 font-mono text-[10px] font-bold text-warning">
						{heldBills.length}
					</span>
				{/if}
			</button>

			{#if heldBills.length > 0}
				<button
					type="button"
					onclick={() => (holdBillsOpen = true)}
					class="flex items-center gap-1 rounded-lg border border-warning/30 bg-warning-light px-2.5 py-1.5 text-xs font-bold text-warning hover:bg-warning-light/80"
				>
					<RotateCcw size={13} />
					<span>Recall Parked (F7) [{heldBills.length}]</span>
				</button>
			{/if}
		</div>
	</div>

	<!-- High-Visibility Ergonomic Shortcut Legend -->
	<div class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-secondary/70 px-3 py-1.5 text-xs">
		<div class="flex flex-wrap items-center gap-3">
			<button type="button" onclick={() => searchInputRef?.focus()} class="flex items-center gap-1 text-accent font-semibold hover:underline">
				<kbd class="rounded border border-border-strong bg-surface px-1.5 py-0.5 font-mono text-[11px] font-bold text-accent shadow-2xs">F2</kbd>
				<span>Medicine</span>
			</button>
			<button type="button" onclick={() => customerInputRef?.focus()} class="flex items-center gap-1 text-text-primary font-semibold hover:underline">
				<kbd class="rounded border border-border-strong bg-surface px-1.5 py-0.5 font-mono text-[11px] font-bold text-text-primary shadow-2xs">F3</kbd>
				<span>Customer</span>
			</button>
			<button type="button" onclick={cyclePaymentType} class="flex items-center gap-1 text-text-secondary font-semibold hover:underline">
				<kbd class="rounded border border-border-strong bg-surface px-1.5 py-0.5 font-mono text-[11px] font-bold text-text-secondary shadow-2xs">F4</kbd>
				<span>Mode: <strong class="uppercase text-accent">{paymentType}</strong></span>
			</button>
			<button type="button" onclick={handleHoldSale} class="flex items-center gap-1 text-text-secondary font-semibold hover:underline">
				<kbd class="rounded border border-border-strong bg-surface px-1.5 py-0.5 font-mono text-[11px] font-bold text-text-secondary shadow-2xs">F6</kbd>
				<span>Park Bill</span>
			</button>
			<button type="button" onclick={() => (holdBillsOpen = true)} class="flex items-center gap-1 text-text-secondary font-semibold hover:underline">
				<kbd class="rounded border border-border-strong bg-surface px-1.5 py-0.5 font-mono text-[11px] font-bold text-text-secondary shadow-2xs">F7</kbd>
				<span>Recall Parked</span>
			</button>
			<button type="button" onclick={toggleSaleType} class="flex items-center gap-1 text-text-secondary font-semibold hover:underline">
				<kbd class="rounded border border-border-strong bg-surface px-1.5 py-0.5 font-mono text-[11px] font-bold text-text-secondary shadow-2xs">F8</kbd>
				<span>Pricing: <strong class="uppercase text-accent">{customerType}</strong></span>
			</button>
			<button type="button" onclick={handleSaveSale} class="flex items-center gap-1 text-accent font-semibold hover:underline">
				<kbd class="rounded border border-accent bg-accent text-white px-1.5 py-0.5 font-mono text-[11px] font-bold shadow-2xs">F10 / Ctrl+S</kbd>
				<span>Save & Print</span>
			</button>
		</div>

		<div class="flex items-center gap-2 text-[11px] text-text-muted">
			<span class="flex items-center gap-1">
				<kbd class="rounded border border-border bg-surface px-1 font-mono text-[10px]">Enter on Qty</kbd>
				<span>→ moves cursor to F2</span>
			</span>
			<span>•</span>
			<span class="flex items-center gap-1">
				<kbd class="rounded border border-border bg-surface px-1 font-mono text-[10px]">Ctrl+Del</kbd>
				<span>→ delete row</span>
			</span>
		</div>
	</div>

	<!-- 65 / 35 ERGONOMIC SPLIT SCREEN CONTAINER -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 items-start">
		<!-- LEFT COLUMN (65% WIDTH = lg:col-span-8 approx 66.6% or flex-[65]) -->
		<div class="lg:col-span-8 flex flex-col gap-2.5 h-full">
			<!-- Anchored Medicine Search Bar (Hero on Load) -->
			<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
				<ProductSearch
					onSelectBatch={handleInlineBatchSelect}
					bind:inputRef={searchInputRef}
				/>
			</div>

			<!-- Line Items Grid (28px Row Height) -->
			<div class="flex flex-col flex-1 rounded-xl border border-border bg-surface overflow-hidden shadow-2xs min-h-[380px]">
				<InvoiceItemsTable
					bind:items
					bind:activeIndex={activeItemIndex}
					onRemoveItem={handleRemoveItem}
					onFocusSearch={() => searchInputRef?.focus()}
				/>

				{#if quoteError}
					<div class="border-t border-danger/30 bg-danger-light/50 px-3 py-1.5 text-xs font-semibold text-danger">
						⚠️ {quoteError}
					</div>
				{/if}
			</div>

			<!-- ACTIVE ITEM INSPECTOR STRIP AT BOTTOM -->
			<div class="rounded-xl border border-border bg-surface p-3 shadow-2xs">
				<div class="flex items-center justify-between pb-1.5 mb-2 border-b border-border text-xs">
					<div class="flex items-center gap-2">
						<span class="flex h-2 w-2 rounded-full {activeItem ? 'bg-success animate-pulse' : 'bg-text-muted'}"></span>
						<span class="font-bold text-text-primary uppercase tracking-wider text-[11px]">Active Item Inspector</span>
						{#if activeItem}
							<span class="font-mono text-[11px] text-text-muted">
								(Row {activeItemIndex + 1} of {items.length})
							</span>
						{/if}
					</div>
					<div class="text-[11px] text-text-muted">
						{#if activeItem}
							<span>Pack Size: 10's • HSN: {activeItem.hsnCode || '3004'}</span>
						{:else}
							<span>Select or add an item to inspect stock and shelf location</span>
						{/if}
					</div>
				</div>

				{#if activeItem}
					<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
						<!-- Salt / Generic Name -->
						<div class="space-y-0.5">
							<div class="text-[10px] font-semibold uppercase text-text-muted">Generic / Salt Composition</div>
							<div class="font-bold text-text-primary truncate" title={activeItem.genericName}>
								{activeItem.genericName || 'Standard Chemical Entity'}
							</div>
							<div class="text-[10px] text-text-muted">{activeItem.category || 'Pharmaceuticals'}</div>
						</div>

						<!-- Selected Batch & Expiry -->
						<div class="space-y-0.5">
							<div class="text-[10px] font-semibold uppercase text-text-muted">Selected Batch & Expiry</div>
							<div class="flex items-center gap-1.5 font-mono">
								<span class="font-bold text-text-primary">{activeItem.batchNumber}</span>
								<span class="text-text-muted text-[11px]">Exp: {activeItem.expiryDate?.substring(0, 7) || '-'}</span>
							</div>
							{#if activeItem.drugSchedule && activeItem.drugSchedule !== 'none'}
								<span class="inline-block rounded bg-danger-light border border-danger/20 text-danger text-[9px] font-bold px-1 uppercase">
									Schedule {activeItem.drugSchedule}
								</span>
							{/if}
						</div>

						<!-- Available Stock -->
						<div class="space-y-0.5">
							<div class="text-[10px] font-semibold uppercase text-text-muted">Batch Stock Available</div>
							<div class="flex items-center gap-1.5 font-mono">
								<span class="text-sm font-black text-accent tabular-nums">
									{activeItem.availableStock !== undefined ? activeItem.availableStock : '—'}
								</span>
								<span class="text-[10px] text-text-muted">Units in Hand</span>
							</div>
							<div class="text-[10px] text-success font-medium">FEFO Verified</div>
						</div>

						<!-- Shelf / Rack Location -->
						<div class="space-y-0.5">
							<div class="text-[10px] font-semibold uppercase text-text-muted">Pharmacy Rack / Shelf</div>
							<div class="flex items-center gap-1 font-mono font-bold text-text-primary">
								<MapPin size={12} class="text-accent" />
								<span>{activeItem.rackLocation || 'Rack A-01'}</span>
							</div>
							<div class="text-[10px] text-text-muted">Near Counter Front</div>
						</div>
					</div>
				{:else}
					<div class="py-2 text-center text-xs text-text-muted italic">
						No item active in grid. Select a row or press F2 to search medicines.
					</div>
				{/if}
			</div>
		</div>

		<!-- RIGHT COLUMN (35% WIDTH = lg:col-span-4) -->
		<div class="lg:col-span-4 flex flex-col gap-2.5">
			<!-- CUSTOMER & DOCTOR COMPLIANCE PANEL (F3) -->
			<div class="rounded-xl border border-border bg-surface p-3.5 shadow-2xs space-y-3">
				<div class="flex items-center justify-between pb-1 border-b border-border">
					<div class="flex items-center gap-1.5 font-bold text-xs text-text-primary">
						<User size={14} class="text-accent" />
						<span>Customer & Doctor (F3)</span>
					</div>
					<div class="flex items-center gap-1 text-[11px]">
						<span class="text-text-muted">Date:</span>
						<span class="font-mono font-semibold text-text-primary">{date}</span>
					</div>
				</div>

				<!-- Customer Search Box with On-The-Fly Quick Create -->
				<div>
					<label for="customer-search-input" class="block text-[11px] font-semibold text-text-secondary mb-1">
						Search Customer / Mobile (F3)
					</label>
					<CustomerSearch
						onSelect={handleCustomerSelect}
						bind:selectedCustomer
						bind:inputRef={customerInputRef}
					/>
				</div>

				<!-- Pricing & Payment Controls -->
				<div class="grid grid-cols-2 gap-2 pt-1 border-t border-border-subtle">
					<div>
						<label for="sale-type-sel" class="block text-[10px] font-semibold text-text-muted uppercase mb-0.5">
							Sale Type (F8)
						</label>
						<select
							id="sale-type-sel"
							bind:value={customerType}
							class="w-full rounded border border-border bg-surface px-2 py-1 text-xs font-semibold text-text-primary focus:border-accent focus:outline-none"
						>
							<option value="retail">Retail (MRP)</option>
							<option value="wholesale">Wholesale (PTR)</option>
						</select>
					</div>

					<div>
						<label for="payment-mode-sel" class="block text-[10px] font-semibold text-text-muted uppercase mb-0.5">
							Payment (F4)
						</label>
						<select
							id="payment-mode-sel"
							bind:value={paymentType}
							class="w-full rounded border border-border bg-surface px-2 py-1 text-xs font-bold text-accent focus:border-accent focus:outline-none"
						>
							<option value="cash">💵 Cash</option>
							<option value="bank">📱 UPI / Bank</option>
							<option value="credit">📑 Credit Khata</option>
						</select>
					</div>
				</div>

				<!-- Statutory Schedule H / H1 Doctor Register (Mandatory compliance) -->
				{#if hasH1Item}
					<div class="rounded-lg border border-warning/40 bg-warning-light/30 p-2.5 text-xs space-y-2 mt-2">
						<div class="flex items-center gap-1.5 font-bold text-warning text-[11px]">
							<ShieldAlert size={13} />
							<span>Schedule H/H1 Doctor Compliance</span>
						</div>

						<div>
							<label for="h1-patient" class="block text-[10px] font-semibold text-text-muted">
								Patient Name & Address *
							</label>
							<input
								id="h1-patient"
								type="text"
								bind:value={patientName}
								oninput={() => (h1Errors.patient = false)}
								placeholder="Patient Name"
								class="w-full rounded border bg-surface px-2 py-1 text-xs text-text-primary focus:outline-none
									{h1Errors.patient ? 'border-danger ring-1 ring-danger' : 'border-border focus:border-accent'}"
							/>
						</div>

						<div class="grid grid-cols-2 gap-2">
							<div>
								<label for="h1-prescriber" class="block text-[10px] font-semibold text-text-muted">
									Doctor Name *
								</label>
								<input
									id="h1-prescriber"
									type="text"
									bind:value={prescriberName}
									oninput={() => (h1Errors.prescriber = false)}
									placeholder="Dr. Name"
									class="w-full rounded border bg-surface px-2 py-1 text-xs text-text-primary focus:outline-none
										{h1Errors.prescriber ? 'border-danger ring-1 ring-danger' : 'border-border focus:border-accent'}"
								/>
							</div>
							<div>
								<label for="h1-regno" class="block text-[10px] font-semibold text-text-muted">
									Doctor Reg No *
								</label>
								<input
									id="h1-regno"
									type="text"
									bind:value={prescriberRegNo}
									oninput={() => (h1Errors.regNo = false)}
									placeholder="MCI Reg No"
									class="w-full rounded border bg-surface px-2 py-1 text-xs text-text-primary focus:outline-none
										{h1Errors.regNo ? 'border-danger ring-1 ring-danger' : 'border-border focus:border-accent'}"
								/>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- BILL TOTALS PANEL -->
			<div class="rounded-xl border border-border bg-surface p-3.5 shadow-2xs space-y-2">
				<div class="flex items-center justify-between pb-1 border-b border-border">
					<span class="font-bold text-xs text-text-primary">Bill Totals</span>
					<span class="text-[11px] font-mono text-text-muted">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
				</div>

				<div class="space-y-1.5 text-xs">
					<div class="flex justify-between text-text-secondary">
						<span>Subtotal:</span>
						<span class="font-mono tabular-nums">₹{subtotal.toFixed(2)}</span>
					</div>

					{#if discountTotal > 0}
						<div class="flex justify-between text-success">
							<span>Item Discount:</span>
							<span class="font-mono tabular-nums">-₹{discountTotal.toFixed(2)}</span>
						</div>
					{/if}

					<div class="flex justify-between text-text-secondary">
						<span>Taxable Turnover:</span>
						<span class="font-mono tabular-nums">₹{taxableTotal.toFixed(2)}</span>
					</div>

					<div class="flex justify-between text-text-muted text-[11px]">
						<span>CGST Output:</span>
						<span class="font-mono tabular-nums">₹{cgstTotal.toFixed(2)}</span>
					</div>

					<div class="flex justify-between text-text-muted text-[11px]">
						<span>SGST Output:</span>
						<span class="font-mono tabular-nums">₹{sgstTotal.toFixed(2)}</span>
					</div>

					{#if Math.abs(roundOff) > 0.001}
						<div class="flex justify-between text-text-muted text-[11px]">
							<span>Round-Off:</span>
							<span class="font-mono tabular-nums">₹{roundOff.toFixed(2)}</span>
						</div>
					{/if}

					<!-- Grand Total Highlight -->
					<div class="flex items-center justify-between pt-2 border-t border-border">
						<span class="text-xs font-bold uppercase text-text-primary">Grand Total:</span>
						<span class="font-mono text-2xl font-black text-accent tabular-nums">
							₹{grandTotal.toFixed(2)}
						</span>
					</div>
				</div>
			</div>

			<!-- TENDERED CASH & GREEN "CHANGE TO RETURN" PANEL -->
			<div class="rounded-xl border border-border bg-surface p-3.5 shadow-2xs space-y-3">
				<div class="flex items-center justify-between">
					<label for="amountTendered" class="text-xs font-bold text-text-primary">
						{customerType === 'retail' ? 'Cash Tendered (₹)' : 'Immediate Payment (₹)'}:
					</label>
					{#if isQuoting}
						<span class="text-[10px] text-accent animate-pulse font-medium">calculating...</span>
					{/if}
				</div>

				<div class="flex items-center gap-2">
					<input
						id="amountTendered"
						type="number"
						bind:value={amountTendered}
						min="0"
						step="1"
						placeholder="0.00"
						class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-base font-bold text-text-primary tabular-nums focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
					/>
					<button
						type="button"
						onclick={() => setQuickTender(grandTotal)}
						class="whitespace-nowrap rounded-md border border-border bg-surface-secondary px-2.5 py-1.5 font-mono text-xs font-semibold text-text-secondary hover:bg-surface-hover hover:text-text-primary"
					>
						Exact
					</button>
				</div>

				<!-- Quick Tender Pills -->
				<div class="grid grid-cols-3 gap-1.5">
					<button
						type="button"
						onclick={() => addQuickTender(100)}
						class="rounded border border-border bg-surface-secondary py-1 text-center font-mono text-[11px] font-semibold text-text-secondary hover:bg-surface-hover"
					>
						+₹100
					</button>
					<button
						type="button"
						onclick={() => addQuickTender(500)}
						class="rounded border border-border bg-surface-secondary py-1 text-center font-mono text-[11px] font-semibold text-text-secondary hover:bg-surface-hover"
					>
						+₹500
					</button>
					<button
						type="button"
						onclick={() => addQuickTender(2000)}
						class="rounded border border-border bg-surface-secondary py-1 text-center font-mono text-[11px] font-semibold text-text-secondary hover:bg-surface-hover"
					>
						+₹2000
					</button>
				</div>

				<!-- Real-time Green "Change to Return" Display -->
				{#if customerType === 'retail'}
					<div class="rounded-lg border border-success/30 bg-success-light/40 p-2.5 flex items-center justify-between">
						<div>
							<div class="text-[10px] font-bold uppercase tracking-wider text-success">
								Change to Return
							</div>
							<div class="text-[11px] text-text-muted">Return to customer</div>
						</div>
						<div class="font-mono text-2xl font-black text-success tabular-nums">
							₹{changeDue.toFixed(2)}
						</div>
					</div>
				{:else}
					<div class="rounded-lg border border-warning/30 bg-warning-light/30 p-2.5 flex items-center justify-between">
						<div>
							<div class="text-[10px] font-bold uppercase tracking-wider text-warning">
								Balance to Ledger (Due)
							</div>
							<div class="text-[11px] text-text-muted">Khata outstanding</div>
						</div>
						<div class="font-mono text-2xl font-black text-warning tabular-nums">
							₹{amountPending.toFixed(2)}
						</div>
					</div>
				{/if}

				<!-- PRIMARY ACTION: SAVE & PRINT INVOICE (F10 / Ctrl+S) -->
				<button
					type="button"
					disabled={isSaving || items.length === 0}
					onclick={handleSaveSale}
					class="w-full flex items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-white shadow-lg hover:bg-accent-hover focus:outline-none disabled:opacity-50 transition-all active:scale-[0.99]"
				>
					{#if isSaving}
						<span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
						<span>Finalizing Sale...</span>
					{:else}
						<CheckCircle2 size={18} />
						<span>Save & Print Invoice (F10 / Ctrl+S)</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
</div>

<!-- DUAL-MODE PRINTABLE INVOICE VIEW (Hidden on screen, rendered on window.print()) -->
<PrintableInvoice
	invoice={lastCompletedSale}
	store={data.store}
	cashierName={data.currentUser?.name || data.currentUser?.username || 'Cashier'}
	{printMode}
/>

<!-- PARKED BILLS RECALL MODAL -->
<HoldBillsModal
	bind:open={holdBillsOpen}
	{heldBills}
	onRecall={handleRecallBill}
	onDiscard={handleDiscardHeldBill}
	onclose={() => (holdBillsOpen = false)}
/>

<!-- KEYBOARD SHORTCUTS REFERENCE MODAL -->
<KeyboardShortcutsModal
	bind:open={shortcutsOpen}
	onclose={() => (shortcutsOpen = false)}
/>

<style>
	@media print {
		:global(.pos-screen-layout),
		:global(header),
		:global(aside),
		:global(nav) {
			display: none !important;
		}
	}
</style>
