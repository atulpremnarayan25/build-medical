<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { PageData } from './$types.js';
	import ProductSearch from '$lib/components/billing/ProductSearch.svelte';
	import InvoiceItemsTable from '$lib/components/billing/InvoiceItemsTable.svelte';
	import CustomerSearch from '$lib/components/billing/CustomerSearch.svelte';
	import KeyboardShortcutsModal from '$lib/components/billing/KeyboardShortcutsModal.svelte';
	import HoldBillsModal, { type HeldBill } from '$lib/components/billing/HoldBillsModal.svelte';
	import PrintableInvoice, {
		type PrintableInvoiceData
	} from '$lib/components/billing/PrintableInvoice.svelte';
	import SalesHistoryPanel from '$lib/components/billing/SalesHistoryPanel.svelte';
	import PatientHistoryModal from '$lib/components/billing/PatientHistoryModal.svelte';
	import { createBarcodeScannerHandler } from '$lib/utils/barcodeScanner.js';

	import type {
		Product,
		Batch,
		CreateSaleItemInput,
		Customer,
		SaleQuote,
		PaymentMethod
	} from '$lib/types/index.js';
	import { saleService, productService, batchService } from '$lib/services/index.js';
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
		RotateCcw,
		Barcode,
		History,
		AlertOctagon,
		Coins
	} from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	// Header & Transaction State
	let selectedCustomer = $state<Customer | null>(null);
	let isWalkIn = $state(false);
	let isCustomerSelected = $derived(isWalkIn || selectedCustomer !== null);
	let billSeries = $state<'T' | 'R'>('T');
	let invoiceNumber = $state('T000001');
	let date = $state(new Date().toISOString().split('T')[0]);
	let paymentType = $state<PaymentMethod>('cash');
	let customerType = $state<'retail' | 'wholesale'>('retail');
	let amountTendered = $state<number>(0);
	let printMode = $state<'thermal' | 'tax-invoice'>('thermal');

	let searchInputRef = $state<HTMLInputElement | undefined>();
	let customerInputRef = $state<HTMLInputElement | undefined>();
	let isSaving = $state(false);
	let shortcutsOpen = $state(false);
	let showSalesHistory = $state(false);
	let patientHistoryOpen = $state(false);

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
			pack?: string;
			packSize?: number;
			freeQuantity?: number;
			schemeApplied?: string;
			barcode?: string;
		})[]
	>([]);
	let nextUiKey = 0;
	let activeItemIndex = $state(0);

	// Active Item for Bottom Inspector Strip
	let activeItem = $derived(
		items.length > 0 ? (items[Math.min(activeItemIndex, items.length - 1)] ?? null) : null
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
			if (customerInputRef) customerInputRef.focus();
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

	async function generateInvoiceNumber(series = billSeries) {
		try {
			const sales = await saleService.getSales();
			const count = (sales.length + 1).toString().padStart(6, '0');
			invoiceNumber = `${series}${count}`;
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
	let next50 = $derived(grandTotal > 0 ? Math.ceil(grandTotal / 50) * 50 : 50);
	let next100 = $derived(grandTotal > 0 ? Math.ceil(grandTotal / 100) * 100 : 100);
	let next500 = $derived(grandTotal > 0 ? Math.ceil(grandTotal / 500) * 500 : 500);
	let subtotal = $derived(quote?.subtotalRupees ?? 0);
	let discountTotal = $derived(quote?.discountRupees ?? 0);
	let taxableTotal = $derived(quote?.taxableTotalRupees ?? 0);
	let cgstTotal = $derived(quote?.gstTotalRupees ? quote.gstTotalRupees / 2 : 0);
	let sgstTotal = $derived(quote?.gstTotalRupees ? quote.gstTotalRupees / 2 : 0);
	let gstTotal = $derived(quote?.gstTotalRupees ?? 0);
	let roundOff = $derived(quote?.roundOffRupees ?? 0);
	let changeDue = $derived(amountTendered > grandTotal ? amountTendered - grandTotal : 0);
	let amountPending = $derived(grandTotal > amountTendered ? grandTotal - amountTendered : 0);

	function handleCustomerSelect(customer: Customer | null, walkIn = false) {
		if (customer) {
			selectedCustomer = customer;
			isWalkIn = false;
			if (!patientName.trim()) {
				patientName = customer.name;
			}
			if (customer.billSeries) {
				billSeries = customer.billSeries === 'R' ? 'R' : 'T';
			} else if (customer.gstin) {
				billSeries = 'T';
			}
			if (customer.gstin || billSeries === 'T') {
				customerType = 'wholesale';
			}
			generateInvoiceNumber(billSeries);
			addToast('info', `Customer selected: ${customer.name}`);
			setTimeout(() => {
				searchInputRef?.focus();
				searchInputRef?.select();
			}, 50);
		} else if (walkIn) {
			selectedCustomer = null;
			isWalkIn = true;
			customerType = 'retail';
			billSeries = 'R';
			generateInvoiceNumber(billSeries);
			addToast('info', 'Walk-in Customer selected (Cash Sale)');
			setTimeout(() => {
				searchInputRef?.focus();
				searchInputRef?.select();
			}, 50);
		} else {
			// Clearing customer
			if (items.length > 0) {
				selectedCustomer = null;
				isWalkIn = true;
				customerType = 'retail';
				billSeries = 'R';
				addToast('warning', 'Customer cleared. Bill converted to Walk-in Cash Sale.');
			} else {
				selectedCustomer = null;
				isWalkIn = false;
				setTimeout(() => {
					customerInputRef?.focus();
				}, 50);
			}
		}
	}

	// Inline batch selection callback from ProductSearch.svelte
	function handleInlineBatchSelect(product: Product, batch: Batch, preferredQty?: number) {
		const initialQty = preferredQty && preferredQty > 0 ? Math.min(preferredQty, batch.quantity) : 1;
		const newItem = {
			uiKey: nextUiKey++,
			productId: product.id,
			productName: product.name,
			barcode: product.barcode,
			batchId: batch.id,
			batchNumber: batch.batchNumber,
			expiryDate: batch.expiryDate,
			pack: (product as any).pack || (product.packSize ? `1X${product.packSize}` : '1PH'),
			packSize: product.packSize || 10,
			quantity: initialQty,
			freeQuantity: 0,
			schemeApplied: '',
			mrp: batch.mrp,
			rate: customerType === 'wholesale' ? batch.purchaseRate * 1.1 : batch.sellingRate,
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
						: amountTendered > 0
							? amountTendered
							: grandTotal
					: Math.min(amountTendered || 0, grandTotal);

			const h1Notes = hasH1Item
				? `H1 Patient: ${patientName}; Prescriber: ${prescriberName} (${prescriberRegNo})`
				: '';

			const payload = {
				saleType: customerType,
				customerId: selectedCustomer?.id ?? null,
				patientName: patientName.trim() || undefined,
				prescriberName: prescriberName.trim() || undefined,
				prescriberRegNo: prescriberRegNo.trim() || undefined,
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

			addToast('success', `Invoice ${invoice.invoiceNumber} saved successfully`);

			// Reset terminal fields for next customer
			items = [];
			selectedCustomer = null;
			isWalkIn = false;
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

			// Auto-focus customer input for the next customer
			setTimeout(() => {
				customerInputRef?.focus();
			}, 100);

			// Trigger print subsystem if in normal interactive browser mode
			await tick();
			if (
				typeof window !== 'undefined' &&
				!navigator.webdriver &&
				!(window as any).__RETICLE__
			) {
				setTimeout(() => {
					try {
						window.print();
					} catch (err) {
						console.warn('Print dialog skipped:', err);
					}
				}, 250);
			}
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
			totalAmount:
				grandTotal ||
				items.reduce((sum, i) => sum + i.quantity * i.rate * (1 - i.discount / 100), 0)
		};

		saveHeldBills([newHeldBill, ...heldBills]);
		addToast('success', `Bill ${invoiceNumber} placed on hold. (${heldBills.length} parked bills)`);

		// Reset for next customer
		items = [];
		selectedCustomer = null;
		isWalkIn = false;
		paymentType = 'cash';
		customerType = 'retail';
		amountTendered = 0;
		patientName = '';
		prescriberName = '';
		prescriberRegNo = '';
		h1Errors = { patient: false, prescriber: false, regNo: false };
		generateInvoiceNumber();
		customerInputRef?.focus();
	}

	function handleRecallBill(bill: HeldBill) {
		items = bill.items;
		selectedCustomer = bill.customer;
		isWalkIn = bill.customer === null;
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
		addToast(
			'success',
			`Recalled parked bill for ${bill.customer ? bill.customer.name : 'Walk-in Customer'}`
		);
		tick().then(() => searchInputRef?.focus());
	}

	function handleDiscardHeldBill(id: string) {
		saveHeldBills(heldBills.filter((b) => b.id !== id));
		addToast('info', 'Parked bill discarded');
	}

	async function handleBarcodeScan(barcode: string) {
		try {
			if (!isCustomerSelected) {
				handleCustomerSelect(null, true);
			}

			// Check if an item with this barcode is already in the cart -> increment quantity!
			const existingBarcodeIdx = items.findIndex((i) => (i as any).barcode === barcode);
			if (existingBarcodeIdx >= 0) {
				items[existingBarcodeIdx].quantity += 1;
				items = [...items];
				activeItemIndex = existingBarcodeIdx;
				addToast('info', `Incremented ${items[existingBarcodeIdx].productName} qty to ${items[existingBarcodeIdx].quantity}`);
				return;
			}

			// Lookup product by barcode
			const product = await productService.getProductByBarcode(barcode);
			if (!product) {
				addToast('warning', `No product found for barcode: ${barcode}`);
				return;
			}

			// Check if product already in items by productId
			const existingProdIdx = items.findIndex((i) => i.productId === product.id);
			if (existingProdIdx >= 0) {
				items[existingProdIdx].quantity += 1;
				items = [...items];
				activeItemIndex = existingProdIdx;
				addToast('info', `Incremented ${items[existingProdIdx].productName} qty to ${items[existingProdIdx].quantity}`);
				return;
			}

			// Fetch active batches with FEFO sorting
			const allBatches = await batchService.getBatchesByProduct(product.id);
			const sorted = allBatches.sort(
				(a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
			);
			const activeBatches = sorted.filter(
				(b) => b.quantity > 0 && new Date(b.expiryDate).getTime() > Date.now()
			);

			if (activeBatches.length === 0) {
				addToast('error', `No available stock for ${product.name}`);
				return;
			}

			handleInlineBatchSelect(product, activeBatches[0]);
			addToast('success', `Scanned: ${product.name} (${activeBatches[0].batchNumber})`);
		} catch (err) {
			console.error('Barcode scan error:', err);
			addToast('error', 'Barcode processing failed');
		}
	}

	const barcodeScanner = createBarcodeScannerHandler({
		maxIntervalMs: 50,
		minBarcodeLength: 4,
		onScan: handleBarcodeScan
	});

	async function handleRepeatItem(item: any) {
		try {
			const product = await productService.getProduct(item.productId);
			if (!product) {
				addToast('error', `Product ${item.productName} not found`);
				return;
			}
			const allBatches = await batchService.getBatchesByProduct(product.id);
			const sorted = allBatches.sort(
				(a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
			);
			const activeBatches = sorted.filter(
				(b) => b.quantity > 0 && new Date(b.expiryDate).getTime() > Date.now()
			);
			if (activeBatches.length === 0) {
				addToast('error', `No active stock available for ${product.name}`);
				return;
			}
			handleInlineBatchSelect(product, activeBatches[0], item.quantity);
			addToast('success', `Added ${product.name} (Qty: ${item.quantity || 1}) to bill`);
		} catch (err) {
			console.error(err);
			addToast('error', 'Failed to add repeat item');
		}
	}

	async function handleRepeatAll(saleItems: any[]) {
		let addedCount = 0;
		for (const item of saleItems) {
			try {
				const product = await productService.getProduct(item.productId);
				if (!product) continue;
				const allBatches = await batchService.getBatchesByProduct(product.id);
				const sorted = allBatches.sort(
					(a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
				);
				const activeBatches = sorted.filter(
					(b) => b.quantity > 0 && new Date(b.expiryDate).getTime() > Date.now()
				);
				if (activeBatches.length > 0) {
					handleInlineBatchSelect(product, activeBatches[0], item.quantity);
					addedCount++;
				}
			} catch (err) {
				console.error(err);
			}
		}
		if (addedCount > 0) {
			addToast('success', `Repeated ${addedCount} items from prior prescription`);
		} else {
			addToast('warning', 'Could not repeat items: medicines out of stock');
		}
	}

	function handleWindowKeydown(e: KeyboardEvent) {
		if (barcodeScanner(e)) {
			return;
		}
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
			e.preventDefault();
			handleSaveSale();
		} else if (e.altKey && e.key.toLowerCase() === 'e') {
			e.preventDefault();
			setQuickTender(grandTotal);
			addToast('info', `Tendered Exact ₹${Math.round(grandTotal)}`);
		} else if (e.key === 'F2') {
			e.preventDefault();
			if (!isCustomerSelected) {
				customerInputRef?.focus();
				customerInputRef?.select();
				addToast('info', 'Please select a customer or press Enter for Walk-in first.');
			} else {
				searchInputRef?.focus();
				searchInputRef?.select();
			}
		} else if (e.key === 'F3') {
			e.preventDefault();
			customerInputRef?.focus();
			customerInputRef?.select();
		} else if (e.altKey && e.key.toLowerCase() === 'w') {
			e.preventDefault();
			handleCustomerSelect(null, true);
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
		} else if (e.key === 'F9') {
			e.preventDefault();
			if (selectedCustomer) {
				patientHistoryOpen = true;
			} else {
				addToast('info', 'Please select a customer first to view prescription history (F3).');
				customerInputRef?.focus();
			}
		} else if (e.key === 'F10') {
			e.preventDefault();
			handleSaveSale();
		} else if (
			e.key === '?' &&
			!['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)
		) {
			e.preventDefault();
			shortcutsOpen = !shortcutsOpen;
		}
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<!-- POS SCREEN LAYOUT: 65/35 Ergonomic Split Screen (Viewport Constrained for 1366x768) -->
<div class="pos-screen-layout flex h-[calc(100dvh-4.25rem)] flex-col gap-2 overflow-hidden">
	<!-- Top Bar / Terminal Navigation -->
	<div
		class="flex shrink-0 flex-col gap-2 rounded-xl border border-border bg-surface px-4 py-2 shadow-2xs sm:flex-row sm:items-center sm:justify-between"
	>
		<div class="flex items-center gap-3">
			<a
				href="/sales"
				class="pressable flex h-7 w-7 items-center justify-center rounded-lg border border-border text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
				title="Back to Sales Hub"
			>
				<ArrowLeft size={15} />
			</a>
			<div>
				<div class="flex items-center gap-2">
					<h1 class="text-xs font-bold text-text-primary sm:text-sm">POS Terminal</h1>
					<div class="flex items-center gap-1">
						<select
							bind:value={billSeries}
							onchange={() => generateInvoiceNumber(billSeries)}
							class="cursor-pointer rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs font-bold text-accent focus:border-accent focus:outline-none"
							title="Bill Series: T (Tax Invoice / B2B) or R (Retail Cash Memo)"
						>
							<option value="T">T (Tax)</option>
							<option value="R">R (Retail)</option>
						</select>
						<span
							class="rounded border border-accent/20 bg-accent-light px-2 py-0.5 font-mono text-xs font-bold text-accent"
						>
							{invoiceNumber}
						</span>
					</div>
					{#if customerType === 'wholesale'}
						<span
							class="rounded border border-accent/30 bg-accent/15 px-2 py-0.5 font-mono text-[10px] font-bold text-accent"
						>
							PTR
						</span>
					{:else}
						<span
							class="rounded bg-surface-secondary px-1.5 py-0.5 text-[10px] font-semibold text-text-muted"
						>
							MRP
						</span>
					{/if}
					<span
						class="rounded bg-surface-secondary px-1.5 py-0.5 text-[10px] font-semibold text-text-muted"
					>
						{data.currentUser?.name || 'Cashier'}
					</span>
				</div>
			</div>
		</div>

		<!-- Action bar & shortcut toggles -->
		<div class="flex items-center gap-2">
			<!-- Print format switch (Thermal 80mm vs A4 Tax Invoice) -->
			<div
				class="flex items-center rounded-lg border border-border bg-surface-secondary p-0.5 text-xs font-semibold"
			>
				<button
					type="button"
					onclick={() => (printMode = 'thermal')}
					class="flex items-center gap-1 rounded-md px-2 py-1 transition-colors {printMode ===
					'thermal'
						? 'bg-surface font-bold text-accent shadow-2xs'
						: 'text-text-muted hover:text-text-primary'}"
				>
					<Printer size={12} />
					<span>80mm Thermal</span>
				</button>
				<button
					type="button"
					onclick={() => (printMode = 'tax-invoice')}
					class="flex items-center gap-1 rounded-md px-2 py-1 transition-colors {printMode ===
					'tax-invoice'
						? 'bg-surface font-bold text-accent shadow-2xs'
						: 'text-text-muted hover:text-text-primary'}"
				>
					<FileText size={12} />
					<span>A4 Tax Invoice</span>
				</button>
			</div>

			<div
				class="hidden items-center gap-1.5 rounded-lg border border-border bg-surface-secondary px-2.5 py-1.5 text-xs font-semibold text-text-muted md:flex"
				title="Hardware barcode scanner wedge active: Scan any medicine box anytime"
			>
				<Barcode size={14} class="text-accent" />
				<span>Barcode Wedge Active</span>
			</div>

			<button
				type="button"
				onclick={() => {
					if (selectedCustomer) {
						patientHistoryOpen = true;
					} else {
						addToast('info', 'Please select a customer first to view history (F3).');
						customerInputRef?.focus();
					}
				}}
				class="flex items-center gap-1 rounded-lg border border-border bg-surface-secondary px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-hover hover:text-text-primary"
				title="View Patient Prescription History (F9)"
			>
				<History size={13} class="text-accent" />
				<span class="hidden sm:inline">Rx History (F9)</span>
			</button>

			<button
				type="button"
				onclick={() => (shortcutsOpen = true)}
				class="flex items-center gap-1 rounded-lg border border-border bg-surface-secondary px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-hover hover:text-text-primary"
				title="View keyboard shortcuts (?)"
			>
				<Keyboard size={13} class="text-accent" />
				<span class="hidden sm:inline">Shortcuts</span>
				<kbd class="rounded border border-border px-1 font-mono text-[10px] text-text-muted">?</kbd>
			</button>

			<button
				type="button"
				onclick={handleHoldSale}
				class="flex items-center gap-1 rounded-lg border border-border bg-surface-secondary px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-hover hover:text-text-primary"
			>
				<Clock size={13} class="text-warning" />
				<span>Hold (F6)</span>
				{#if heldBills.length > 0}
					<span
						class="py-0.2 rounded-full border border-warning/20 bg-warning-light px-1.5 font-mono text-[10px] font-bold text-warning"
					>
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
	<div
		class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-secondary/70 px-3 py-1.5 text-xs"
	>
		<div class="flex flex-wrap items-center gap-3">
			<button
				type="button"
				onclick={() => {
					if (!isCustomerSelected) {
						customerInputRef?.focus();
						customerInputRef?.select();
						addToast('info', 'Please select a customer or press Enter for Walk-in first.');
					} else {
						searchInputRef?.focus();
						searchInputRef?.select();
					}
				}}
				class="flex items-center gap-1 font-semibold hover:underline {isCustomerSelected
					? 'text-accent'
					: 'text-text-muted opacity-75'}"
			>
				<kbd
					class="rounded border px-1.5 py-0.5 font-mono text-[11px] font-bold shadow-2xs
					{isCustomerSelected
						? 'border-border-strong bg-surface text-accent'
						: 'border-border bg-surface-secondary text-text-muted'}"
				>
					F2
				</kbd>
				<span
					>Medicine {#if !isCustomerSelected}(Locked){/if}</span
				>
			</button>
			<button
				type="button"
				onclick={() => customerInputRef?.focus()}
				class="flex items-center gap-1 font-semibold text-text-primary hover:underline"
			>
				<kbd
					class="rounded border border-border-strong bg-surface px-1.5 py-0.5 font-mono text-[11px] font-bold text-text-primary shadow-2xs"
					>F3</kbd
				>
				<span>Customer</span>
			</button>
			<button
				type="button"
				onclick={cyclePaymentType}
				class="flex items-center gap-1 font-semibold text-text-secondary hover:underline"
			>
				<kbd
					class="rounded border border-border-strong bg-surface px-1.5 py-0.5 font-mono text-[11px] font-bold text-text-secondary shadow-2xs"
					>F4</kbd
				>
				<span>Mode: <strong class="text-accent uppercase">{paymentType}</strong></span>
			</button>
			<button
				type="button"
				onclick={handleHoldSale}
				class="flex items-center gap-1 font-semibold text-text-secondary hover:underline"
			>
				<kbd
					class="rounded border border-border-strong bg-surface px-1.5 py-0.5 font-mono text-[11px] font-bold text-text-secondary shadow-2xs"
					>F6</kbd
				>
				<span>Park Bill</span>
			</button>
			<button
				type="button"
				onclick={() => (holdBillsOpen = true)}
				class="flex items-center gap-1 font-semibold text-text-secondary hover:underline"
			>
				<kbd
					class="rounded border border-border-strong bg-surface px-1.5 py-0.5 font-mono text-[11px] font-bold text-text-secondary shadow-2xs"
					>F7</kbd
				>
				<span>Recall Parked</span>
			</button>
			<button
				type="button"
				onclick={toggleSaleType}
				class="flex items-center gap-1 font-semibold text-text-secondary hover:underline"
			>
				<kbd
					class="rounded border border-border-strong bg-surface px-1.5 py-0.5 font-mono text-[11px] font-bold text-text-secondary shadow-2xs"
					>F8</kbd
				>
				<span>Pricing: <strong class="text-accent uppercase">{customerType}</strong></span>
			</button>
			<button
				type="button"
				onclick={() => {
					if (selectedCustomer) {
						patientHistoryOpen = true;
					} else {
						addToast('info', 'Please select a customer first to view history (F3).');
						customerInputRef?.focus();
					}
				}}
				class="flex items-center gap-1 font-semibold text-text-secondary hover:underline"
			>
				<kbd
					class="rounded border border-border-strong bg-surface px-1.5 py-0.5 font-mono text-[11px] font-bold text-text-secondary shadow-2xs"
					>F9</kbd
				>
				<span>Rx History</span>
			</button>
			<button
				type="button"
				onclick={handleSaveSale}
				class="flex items-center gap-1 font-semibold text-accent hover:underline"
			>
				<kbd
					class="rounded border border-accent bg-accent px-1.5 py-0.5 font-mono text-[11px] font-bold text-white shadow-2xs"
					>F10 / Ctrl+S</kbd
				>
				<span>Save & Print</span>
			</button>
		</div>

		<div class="flex items-center gap-2 text-[11px] text-text-muted">
			<span class="flex items-center gap-1">
				<kbd class="rounded border border-border bg-surface px-1 font-mono text-[10px]">Alt+W</kbd>
				<span>→ walk-in cash</span>
			</span>
			<span>•</span>
			<span class="flex items-center gap-1">
				<kbd class="rounded border border-border bg-surface px-1 font-mono text-[10px]"
					>Enter on Qty</kbd
				>
				<span>→ next item</span>
			</span>
			<span>•</span>
			<span class="flex items-center gap-1">
				<kbd class="rounded border border-border bg-surface px-1 font-mono text-[10px]"
					>Ctrl+Del</kbd
				>
				<span>→ delete row</span>
			</span>
		</div>
	</div>

	<!-- 65 / 35 ERGONOMIC SPLIT SCREEN CONTAINER -->
	<div class="grid min-h-0 flex-1 grid-cols-1 items-start gap-2.5 overflow-hidden lg:grid-cols-12">
		<!-- LEFT COLUMN (65% WIDTH = lg:col-span-8 approx 66.6% or flex-[65]) -->
		<div class="flex h-full min-h-0 flex-col gap-2 overflow-hidden lg:col-span-8">
			<!-- Statutory Schedule H/H1 Regulatory Banner -->
			{#if hasH1Item}
				<div
					class="flex items-center justify-between rounded-xl border-2 border-danger/60 bg-danger-light/40 px-3.5 py-2 text-xs text-danger shadow-2xs"
				>
					<div class="flex items-center gap-2">
						<ShieldAlert size={16} class="shrink-0 text-danger animate-pulse" />
						<span class="font-bold">
							SCHEDULE H/H1 STATUTORY REGULATION: Bill contains restricted medicines. Patient Name, Prescribing Doctor and Council Reg No are mandatory before finalization.
						</span>
					</div>
					<span class="rounded bg-danger px-2 py-0.5 font-mono text-[10px] font-bold text-white uppercase tracking-wider">
						Mandatory Entry
					</span>
				</div>
			{/if}

			<!-- Anchored Medicine Search Bar (Hero on Load) -->
			<div class="shrink-0 rounded-xl border border-border bg-surface p-2.5 shadow-2xs">
				<ProductSearch
					onSelectBatch={handleInlineBatchSelect}
					bind:inputRef={searchInputRef}
					disabled={!isCustomerSelected}
					onFocusCustomer={() => {
						customerInputRef?.focus();
						customerInputRef?.select();
					}}
				/>
			</div>

			<!-- Line Items Grid (Flex-Scrollable Viewport) -->
			<div
				class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xs"
			>
				<div class="min-h-0 flex-1 overflow-y-auto">
					<InvoiceItemsTable
						bind:items
						bind:activeIndex={activeItemIndex}
						onRemoveItem={handleRemoveItem}
						onFocusSearch={() => {
							if (!isCustomerSelected) {
								customerInputRef?.focus();
								customerInputRef?.select();
							} else {
								searchInputRef?.focus();
							}
						}}
						disabled={!isCustomerSelected}
						onSelectWalkIn={() => handleCustomerSelect(null, true)}
					/>
				</div>

				{#if quoteError}
					<div
						class="shrink-0 border-t border-danger/30 bg-danger-light/50 px-3 py-1.5 text-xs font-semibold text-danger"
					>
						⚠️ {quoteError}
					</div>
				{/if}

				<!-- Collapsible Sales History Radar -->
				<div
					class="flex shrink-0 items-center justify-between border-t border-border/60 bg-surface-secondary/40 px-3 py-1.5 text-xs"
				>
					<button
						type="button"
						class="pressable flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-text-muted transition-colors hover:text-text-primary"
						onclick={() => (showSalesHistory = !showSalesHistory)}
					>
						<Clock size={12} class="text-accent" />
						<span>Sales History & Rates</span>
						<span
							class="py-0.2 rounded border border-border bg-surface px-1.5 font-mono text-[10px]"
						>
							{showSalesHistory ? 'Hide ▲' : 'Show ▼'}
						</span>
					</button>
					{#if activeItem}
						<span class="max-w-xs truncate font-mono text-[10px] text-text-muted">
							Active: {activeItem.productName} ({activeItem.batchNumber})
						</span>
					{/if}
				</div>

				{#if showSalesHistory}
					<div class="max-h-40 shrink-0 overflow-y-auto border-t border-border/50">
						<SalesHistoryPanel
							productId={activeItem?.productId}
							productName={activeItem?.productName}
							batchNo={activeItem?.batchNumber}
							packSize={activeItem?.packSize || 10}
							customerId={selectedCustomer?.id}
							saleType={customerType}
						/>
					</div>
				{/if}
			</div>

			<!-- ACTIVE ITEM INSPECTOR STRIP AT BOTTOM -->
			<div class="shrink-0 rounded-xl border border-border bg-surface p-2.5 shadow-2xs">
				<div class="mb-2 flex items-center justify-between border-b border-border pb-1.5 text-xs">
					<div class="flex items-center gap-2">
						<span
							class="flex h-2 w-2 rounded-full {activeItem
								? 'animate-pulse bg-success'
								: 'bg-text-muted'}"
						></span>
						<span class="text-[11px] font-bold tracking-wider text-text-primary uppercase"
							>Active Item Inspector</span
						>
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
					<div class="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
						<!-- Salt / Generic Name -->
						<div class="space-y-0.5">
							<div class="text-[10px] font-semibold text-text-muted uppercase">
								Generic / Salt Composition
							</div>
							<div class="truncate font-bold text-text-primary" title={activeItem.genericName}>
								{activeItem.genericName || 'Standard Chemical Entity'}
							</div>
							<div class="text-[10px] text-text-muted">
								{activeItem.category || 'Pharmaceuticals'}
							</div>
						</div>

						<!-- Selected Batch & Expiry -->
						<div class="space-y-0.5">
							<div class="text-[10px] font-semibold text-text-muted uppercase">
								Selected Batch & Expiry
							</div>
							<div class="flex items-center gap-1.5 font-mono">
								<span class="font-bold text-text-primary">{activeItem.batchNumber}</span>
								<span class="text-[11px] text-text-muted"
									>Exp: {activeItem.expiryDate?.substring(0, 7) || '-'}</span
								>
							</div>
							{#if activeItem.drugSchedule && activeItem.drugSchedule !== 'none'}
								<span
									class="inline-block rounded border border-danger/20 bg-danger-light px-1 text-[9px] font-bold text-danger uppercase"
								>
									Schedule {activeItem.drugSchedule}
								</span>
							{/if}
						</div>

						<!-- Available Stock -->
						<div class="space-y-0.5">
							<div class="text-[10px] font-semibold text-text-muted uppercase">
								Batch Stock Available
							</div>
							<div class="flex items-center gap-1.5 font-mono">
								<span class="text-sm font-black text-accent tabular-nums">
									{activeItem.availableStock !== undefined ? activeItem.availableStock : '—'}
								</span>
								<span class="text-[10px] text-text-muted">Units in Hand</span>
							</div>
							<div class="text-[10px] font-medium text-success">FEFO Verified</div>
						</div>

						<!-- Shelf / Rack Location -->
						<div class="space-y-0.5">
							<div class="text-[10px] font-semibold text-text-muted uppercase">
								Pharmacy Rack / Shelf
							</div>
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
		<div class="flex h-full flex-col gap-2.5 overflow-y-auto pr-0.5 lg:col-span-4">
			<!-- CUSTOMER & DOCTOR COMPLIANCE PANEL (F3) -->
			<div class="space-y-3 rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
				<div class="flex items-center justify-between border-b border-border pb-1">
					<div class="flex items-center gap-1.5 text-xs font-bold text-text-primary">
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
					<label
						for="customer-search-input"
						class="mb-1 block text-[11px] font-semibold text-text-secondary"
					>
						Search Customer / Mobile (F3)
					</label>
					<CustomerSearch
						onSelect={handleCustomerSelect}
						bind:selectedCustomer
						bind:isWalkIn
						bind:inputRef={customerInputRef}
					/>
				</div>

				<!-- Pricing & Payment Controls -->
				<div class="grid grid-cols-2 gap-2 border-t border-border-subtle pt-1">
					<div>
						<label
							for="sale-type-sel"
							class="mb-0.5 block text-[10px] font-semibold text-text-muted uppercase"
						>
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
						<label
							for="payment-mode-sel"
							class="mb-0.5 block text-[10px] font-semibold text-text-muted uppercase"
						>
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
					<div
						class="mt-2 space-y-2 rounded-lg border border-warning/40 bg-warning-light/30 p-2.5 text-xs"
					>
						<div class="flex items-center gap-1.5 text-[11px] font-bold text-warning">
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
			<div class="space-y-2 rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
				<div class="flex items-center justify-between border-b border-border pb-1">
					<span class="text-xs font-bold text-text-primary">Bill Totals</span>
					<span class="font-mono text-[11px] text-text-muted"
						>{items.length} {items.length === 1 ? 'item' : 'items'}</span
					>
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

					<div class="flex justify-between text-[11px] text-text-muted">
						<span>CGST Output:</span>
						<span class="font-mono tabular-nums">₹{cgstTotal.toFixed(2)}</span>
					</div>

					<div class="flex justify-between text-[11px] text-text-muted">
						<span>SGST Output:</span>
						<span class="font-mono tabular-nums">₹{sgstTotal.toFixed(2)}</span>
					</div>

					{#if Math.abs(roundOff) > 0.001}
						<div class="flex justify-between text-[11px] text-text-muted">
							<span>Round-Off:</span>
							<span class="font-mono tabular-nums">₹{roundOff.toFixed(2)}</span>
						</div>
					{/if}

					<!-- Grand Total Highlight -->
					<div class="flex items-center justify-between border-t border-border pt-2">
						<span class="text-xs font-bold text-text-primary uppercase">Grand Total:</span>
						<span class="font-mono text-2xl font-black text-accent tabular-nums">
							₹{grandTotal.toFixed(2)}
						</span>
					</div>
				</div>
			</div>

			<!-- TENDERED CASH & GREEN "CHANGE TO RETURN" PANEL -->
			<div class="space-y-3 rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
				<div class="flex items-center justify-between">
					<label for="amountTendered" class="text-xs font-bold text-text-primary">
						{customerType === 'retail' ? 'Cash Tendered (₹)' : 'Immediate Payment (₹)'}:
					</label>
					{#if isQuoting}
						<span class="animate-pulse text-[10px] font-medium text-accent">calculating...</span>
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
						class="rounded-md border border-border bg-surface-secondary px-2.5 py-1.5 font-mono text-xs font-semibold whitespace-nowrap text-text-secondary hover:bg-surface-hover hover:text-text-primary"
					>
						Exact
					</button>
				</div>

				<!-- Quick Tender Chips: Presets & Roundups -->
				<div class="space-y-1.5">
					<!-- Row 1: Note Roundups / Exact -->
					<div class="flex flex-wrap items-center gap-1.5">
						<button
							type="button"
							onclick={() => setQuickTender(grandTotal)}
							class="rounded-md border border-accent/40 bg-accent-light/50 px-2 py-1 font-mono text-[11px] font-bold text-accent hover:bg-accent hover:text-white transition-colors"
							title="Tender Exact Amount (Alt+E)"
						>
							Exact ₹{Math.round(grandTotal)}
						</button>
						{#if next50 > Math.round(grandTotal)}
							<button
								type="button"
								onclick={() => setQuickTender(next50)}
								class="rounded-md border border-border bg-surface-secondary px-2 py-1 font-mono text-[11px] font-semibold text-text-primary hover:bg-surface-hover"
							>
								₹{next50}
							</button>
						{/if}
						{#if next100 > next50 && next100 > Math.round(grandTotal)}
							<button
								type="button"
								onclick={() => setQuickTender(next100)}
								class="rounded-md border border-border bg-surface-secondary px-2 py-1 font-mono text-[11px] font-semibold text-text-primary hover:bg-surface-hover"
							>
								₹{next100}
							</button>
						{/if}
						{#if next500 > next100 && next500 > Math.round(grandTotal)}
							<button
								type="button"
								onclick={() => setQuickTender(next500)}
								class="rounded-md border border-border bg-surface-secondary px-2 py-1 font-mono text-[11px] font-semibold text-text-primary hover:bg-surface-hover"
							>
								₹{next500}
							</button>
						{/if}
					</div>

					<!-- Row 2: Cash Additions -->
					<div class="grid grid-cols-4 gap-1.5">
						<button
							type="button"
							onclick={() => addQuickTender(10)}
							class="rounded border border-border bg-surface-secondary py-1 text-center font-mono text-[11px] font-semibold text-text-secondary hover:bg-surface-hover"
						>
							+₹10
						</button>
						<button
							type="button"
							onclick={() => addQuickTender(50)}
							class="rounded border border-border bg-surface-secondary py-1 text-center font-mono text-[11px] font-semibold text-text-secondary hover:bg-surface-hover"
						>
							+₹50
						</button>
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
					</div>
				</div>

				<!-- Real-time Green "Change to Return" Display -->
				{#if customerType === 'retail'}
					<div
						class="flex items-center justify-between rounded-lg border border-success/30 bg-success-light/40 p-2.5"
					>
						<div>
							<div class="text-[10px] font-bold tracking-wider text-success uppercase">
								Change to Return
							</div>
							<div class="text-[11px] text-text-muted">Return to customer</div>
						</div>
						<div class="font-mono text-2xl font-black text-success tabular-nums">
							₹{changeDue.toFixed(2)}
						</div>
					</div>
				{:else}
					<div
						class="flex items-center justify-between rounded-lg border border-warning/30 bg-warning-light/30 p-2.5"
					>
						<div>
							<div class="text-[10px] font-bold tracking-wider text-warning uppercase">
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
					class="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-accent-hover focus:outline-none active:scale-[0.99] disabled:opacity-50"
				>
					{#if isSaving}
						<span
							class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
						></span>
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

<!-- PATIENT PRESCRIPTION HISTORY MODAL -->
<PatientHistoryModal
	bind:open={patientHistoryOpen}
	customer={selectedCustomer}
	onRepeatItem={handleRepeatItem}
	onRepeatAll={handleRepeatAll}
/>

<!-- KEYBOARD SHORTCUTS REFERENCE MODAL -->
<KeyboardShortcutsModal bind:open={shortcutsOpen} onclose={() => (shortcutsOpen = false)} />

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
