<script lang="ts">
	import { page } from '$app/state';
	import { saleService } from '$lib/services/index.js';
	import type { Sale } from '$lib/types/index.js';
	import { PageHeader, LoadingState, EmptyState, Badge, Button } from '$lib/components/common/index.js';
	import { goto } from '$app/navigation';
	import { Printer, Receipt, ArrowLeft, CreditCard, ShieldAlert, CheckCircle2, User, Stethoscope, Building2 } from '@lucide/svelte';
	import { formatCurrency, formatDate, formatDateTime, numberToWordsRupees } from '$lib/utils/formatters.js';

	let saleId = $derived(page.params.id as string);
	let sale = $state<Sale | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	$effect(() => {
		let isCancelled = false;
		loading = true;
		error = null;

		saleService
			.getSale(saleId)
			.then((s) => {
				if (!isCancelled) {
					sale = s;
					loading = false;
				}
			})
			.catch((e) => {
				if (!isCancelled) {
					console.error(e);
					error = 'Failed to load invoice details.';
					loading = false;
				}
			});

		return () => {
			isCancelled = true;
		};
	});

	// Compute HSN summary breakdown
	let hsnSummary = $derived.by(() => {
		if (!sale || !sale.items) return [];
		const map = new Map<number, { gstRate: number; taxableAmount: number; cgstAmount: number; sgstAmount: number; totalGst: number }>();
		for (const item of sale.items) {
			const rate = item.gstRate || 0;
			const existing = map.get(rate) || {
				gstRate: rate,
				taxableAmount: 0,
				cgstAmount: 0,
				sgstAmount: 0,
				totalGst: 0
			};
			const itemTaxable = item.taxableAmount || (item.quantity * item.rate * (1 - (item.discount || 0) / 100));
			const itemGst = item.gstAmount || (itemTaxable * rate) / 100;
			existing.taxableAmount += itemTaxable;
			existing.cgstAmount += itemGst / 2;
			existing.sgstAmount += itemGst / 2;
			existing.totalGst += itemGst;
			map.set(rate, existing);
		}
		return Array.from(map.values()).sort((a, b) => a.gstRate - b.gstRate);
	});

	let hasH1Items = $derived.by(() => {
		if (!sale) return false;
		return Boolean(sale.prescriberName || sale.prescriberRegNo || sale.patientName);
	});

	function handlePrint() {
		window.print();
	}
</script>

<svelte:head>
	<title>{sale ? `Invoice ${sale.invoiceNumber} - MedStock ERP` : 'Tax Invoice - MedStock ERP'}</title>
</svelte:head>

<div class="mx-auto max-w-5xl space-y-4 print:max-w-none print:p-0">
	<!-- Actions Bar (Screen Only) -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
		<div class="flex items-center gap-2">
			<Button variant="ghost" size="sm" onclick={() => goto('/sales')}>
				<ArrowLeft size={16} class="mr-1" />
				<span>Sales Register</span>
			</Button>
			<span class="text-xs text-text-muted">/</span>
			<span class="font-mono text-xs font-semibold text-text-primary">{sale?.invoiceNumber || 'Invoice'}</span>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			{#if sale && sale.paymentStatus !== 'paid'}
				<Button variant="secondary" size="sm" onclick={() => goto(`/payments/receive?saleId=${sale?.id}`)}>
					<CreditCard size={14} class="mr-1.5" />
					<span>Record Payment</span>
				</Button>
			{/if}
			<Button variant="primary" size="sm" onclick={handlePrint}>
				<Printer size={14} class="mr-1.5" />
				<span>Print Tax Invoice (A4 / Thermal)</span>
			</Button>
		</div>
	</div>

	{#if loading}
		<LoadingState message="Retrieving invoice ledger and batch audit records..." />
	{:else if !sale}
		<EmptyState title="Invoice Not Found" message="The requested invoice record does not exist or has been archived." />
	{:else}
		<!-- Main Tax Invoice Sheet -->
		<div class="overflow-hidden rounded-xl border border-border bg-surface shadow-sm print:rounded-none print:border-none print:bg-white print:p-0 print:shadow-none">
			<!-- Invoice Header & Statutory Identity -->
			<div class="border-b border-border bg-surface-secondary p-5 print:border-b-2 print:border-black print:bg-white print:p-4">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<div class="flex items-center gap-2">
							<span class="rounded bg-accent px-2 py-0.5 font-mono text-[11px] font-bold text-white uppercase tracking-wider">
								MedStock ERP
							</span>
							<span class="font-mono text-xs font-bold text-text-primary uppercase tracking-widest">
								Tax Invoice / Cash Memo
							</span>
						</div>
						<h1 class="mt-1 text-xl font-bold text-text-primary print:text-black">
							MEDSTOCK PHARMACY & SURGICALS
						</h1>
						<p class="text-xs text-text-secondary print:text-gray-700">
							Shop 4-5, Ground Floor, Central Medical Complex, Station Road, Mumbai - 400001
						</p>
						<div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-text-secondary print:text-black">
							<span><strong>DL Nos:</strong> 20B/MH-TZ5-49281, 21B/MH-TZ5-49282</span>
							<span><strong>GSTIN:</strong> 27AABCU9603R1ZM</span>
							<span><strong>FSSAI:</strong> 11521018000492</span>
							<span><strong>Phone:</strong> +91 22 2847 9900</span>
						</div>
					</div>

					<div class="rounded-lg border border-border bg-surface p-3 text-right font-mono text-xs print:border print:border-black print:bg-white">
						<div class="text-[10px] font-bold uppercase tracking-wider text-text-muted print:text-gray-600">Invoice Reference</div>
						<div class="text-base font-bold text-text-primary print:text-black">{sale.invoiceNumber}</div>
						<div class="mt-1 text-[11px] text-text-secondary print:text-black">
							<strong>Date:</strong> {formatDateTime(sale.date || sale.createdAt)}
						</div>
						<div class="mt-0.5 text-[11px] text-text-secondary print:text-black">
							<strong>Type:</strong> <span class="uppercase">{sale.saleType || 'Retail'} Counter</span>
						</div>
						<div class="mt-1 flex items-center justify-end gap-1.5">
							<span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase {sale.paymentStatus === 'paid' ? 'bg-success-light text-success' : sale.paymentStatus === 'partial' ? 'bg-warning-light text-warning' : 'bg-danger-light text-danger'}">
								{sale.paymentStatus}
							</span>
							<span class="inline-flex items-center rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] font-bold uppercase text-text-secondary border border-border">
								{sale.paymentMethod || 'Cash'}
							</span>
						</div>
					</div>
				</div>

				<!-- Schedule H1 Audit Banner (if applicable) -->
				{#if hasH1Items}
					<div class="mt-3 flex items-start gap-2.5 rounded-lg border border-schedule-h1/30 bg-schedule-h1-light/40 p-2.5 text-xs text-text-primary dark:border-schedule-h1/30 dark:bg-schedule-h1-light/20 print:border print:border-black print:bg-gray-100 print:text-black">
						<ShieldAlert size={16} class="mt-0.5 shrink-0 text-schedule-h1" />
						<div>
							<span class="font-bold uppercase tracking-wide text-schedule-h1">Schedule H1 / Regulated Drug Statutory Audit:</span>
							<span> Sold under registered medical practitioner prescription. Details recorded in tamper-proof Schedule H1 register under D&C Act Rules.</span>
						</div>
					</div>
				{/if}
			</div>

			<!-- Customer & Doctor Details Grid -->
			<div class="grid grid-cols-1 border-b border-border sm:grid-cols-2 print:grid-cols-2 print:border-b print:border-black">
				<!-- Billed Customer -->
				<div class="border-b border-border p-4 sm:border-b-0 sm:border-r print:border-r print:border-black print:p-3">
					<div class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted print:text-gray-600">
						<User size={12} />
						<span>Billed To (Customer / Patient)</span>
					</div>
					<div class="mt-1 text-sm font-bold text-text-primary print:text-black">
						{sale.customerName || 'Walk-in Retail Customer'}
					</div>
					{#if sale.patientName && sale.patientName !== sale.customerName}
						<div class="mt-0.5 text-xs text-text-secondary print:text-black">
							<strong>Patient:</strong> {sale.patientName}
						</div>
					{/if}
					<div class="mt-0.5 text-xs text-text-muted print:text-gray-600 font-mono">
						Customer Code: {sale.customerId}
					</div>
				</div>

				<!-- Prescribing Doctor -->
				<div class="p-4 print:p-3">
					<div class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted print:text-gray-600">
						<Stethoscope size={12} />
						<span>Prescribing Medical Practitioner</span>
					</div>
					{#if sale.prescriberName || sale.prescriberRegNo}
						<div class="mt-1 text-sm font-bold text-text-primary print:text-black">
							{sale.prescriberName || 'Registered Medical Practitioner'}
						</div>
						<div class="mt-0.5 font-mono text-xs text-text-secondary print:text-black">
							<strong>Doctor Reg No:</strong> {sale.prescriberRegNo || 'Verified'}
						</div>
					{:else}
						<div class="mt-1 text-xs text-text-muted italic print:text-gray-600">
							General OTC Sale / Doctor prescription not required
						</div>
					{/if}
				</div>
			</div>

			<!-- Itemized Line Items Table -->
			<div class="overflow-x-auto print:overflow-visible">
				<table class="w-full text-left text-xs border-collapse">
					<thead>
						<tr class="border-b border-border bg-surface-secondary text-[10px] font-bold uppercase tracking-wider text-text-secondary print:border-b print:border-black print:bg-gray-100 print:text-black">
							<th class="px-3 py-2 text-center w-8">#</th>
							<th class="px-3 py-2">Item Description</th>
							<th class="px-3 py-2 text-center">Batch No</th>
							<th class="px-3 py-2 text-center">Exp Date</th>
							<th class="px-3 py-2 text-right">Qty</th>
							<th class="px-3 py-2 text-right">MRP (₹)</th>
							<th class="px-3 py-2 text-right">Rate (₹)</th>
							<th class="px-3 py-2 text-right">Dis%</th>
							<th class="px-3 py-2 text-right">GST%</th>
							<th class="px-3 py-2 text-right">Amount (₹)</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border font-mono text-[11px] print:divide-black">
						{#each sale.items as item, index (item.id)}
							<tr class="hover:bg-surface-hover print:hover:bg-transparent">
								<td class="px-3 py-2.5 text-center text-text-muted print:text-gray-600">{index + 1}</td>
								<td class="px-3 py-2.5 font-sans">
									<div class="font-bold text-text-primary print:text-black">{item.productName}</div>
								</td>
								<td class="px-3 py-2.5 text-center font-bold text-text-secondary print:text-black">{item.batchNumber}</td>
								<td class="px-3 py-2.5 text-center text-text-secondary print:text-black">
									{item.expiryDate ? item.expiryDate.substring(0, 7) : '-'}
								</td>
								<td class="px-3 py-2.5 text-right font-bold text-text-primary print:text-black">{item.quantity}</td>
								<td class="px-3 py-2.5 text-right text-text-muted print:text-gray-600 tabular-nums">
									{item.mrp ? item.mrp.toFixed(2) : item.rate.toFixed(2)}
								</td>
								<td class="px-3 py-2.5 text-right font-medium text-text-primary print:text-black tabular-nums">
									{item.rate.toFixed(2)}
								</td>
								<td class="px-3 py-2.5 text-right tabular-nums {item.discount > 0 ? 'text-danger font-bold' : 'text-text-muted'}">
									{item.discount > 0 ? `${item.discount}%` : '-'}
								</td>
								<td class="px-3 py-2.5 text-right text-text-secondary print:text-black tabular-nums">
									{item.gstRate}%
								</td>
								<td class="px-3 py-2.5 text-right font-bold text-text-primary print:text-black tabular-nums">
									{((item.taxableAmount || (item.quantity * item.rate * (1 - item.discount / 100))) + (item.gstAmount || 0)).toFixed(2)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Lower Summary & Statutory Audit Section -->
			<div class="grid grid-cols-1 border-t border-border lg:grid-cols-12 print:grid-cols-12 print:border-t-2 print:border-black">
				<!-- Left Column: HSN Summary, Words & Declarations (7 Cols) -->
				<div class="border-b border-border p-4 lg:col-span-7 lg:border-b-0 lg:border-r print:col-span-7 print:border-r print:border-black print:p-3">
					<!-- GST / HSN Summary Table -->
					<div class="rounded border border-border bg-surface-secondary/40 p-2.5 print:border print:border-black print:bg-white">
						<div class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted print:text-gray-600">
							Statutory GST Tax Summary
						</div>
						<table class="w-full text-left font-mono text-[10px]">
							<thead>
								<tr class="border-b border-border text-text-secondary print:border-black print:text-black">
									<th class="py-1">GST Rate</th>
									<th class="py-1 text-right">Taxable Val (₹)</th>
									<th class="py-1 text-right">CGST (₹)</th>
									<th class="py-1 text-right">SGST (₹)</th>
									<th class="py-1 text-right">Total Tax (₹)</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-border/60 print:divide-black">
								{#each hsnSummary as taxRow}
									<tr>
										<td class="py-1 font-bold">{taxRow.gstRate}%</td>
										<td class="py-1 text-right tabular-nums">{taxRow.taxableAmount.toFixed(2)}</td>
										<td class="py-1 text-right tabular-nums">{taxRow.cgstAmount.toFixed(2)}</td>
										<td class="py-1 text-right tabular-nums">{taxRow.sgstAmount.toFixed(2)}</td>
										<td class="py-1 text-right font-bold tabular-nums">{taxRow.totalGst.toFixed(2)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					<!-- Amount in Words -->
					<div class="mt-3 rounded border border-border bg-surface p-2.5 print:border print:border-black">
						<div class="text-[10px] font-bold uppercase tracking-wider text-text-muted print:text-gray-600">Invoice Amount in Words</div>
						<div class="mt-0.5 text-xs font-semibold text-text-primary print:text-black">
							{numberToWordsRupees(sale.grandTotal)}
						</div>
					</div>

					<!-- Terms & Conditions / Statutory Disclaimer -->
					<div class="mt-3 text-[10px] leading-relaxed text-text-muted print:text-gray-600">
						<div class="font-bold uppercase tracking-wider text-text-secondary print:text-black">Terms of Sale:</div>
						<ol class="list-decimal pl-3.5 space-y-0.5 mt-0.5">
							<li>Medicines requiring cold storage (2°C - 8°C) cannot be returned or exchanged.</li>
							<li>Goods once sold will not be accepted back without original invoice within 7 days.</li>
							<li>Schedule H & H1 drugs sold only on valid prescription of a Registered Medical Practitioner.</li>
							<li>Subject to Mumbai jurisdiction only.</li>
						</ol>
					</div>
				</div>

				<!-- Right Column: Financial Totals & Signatures (5 Cols) -->
				<div class="flex flex-col justify-between p-4 lg:col-span-5 print:col-span-5 print:p-3">
					<div class="space-y-1.5 font-mono text-xs">
						<div class="flex justify-between text-text-secondary print:text-black">
							<span>Gross Subtotal:</span>
							<span class="tabular-nums">₹{sale.subtotal.toFixed(2)}</span>
						</div>
						{#if sale.discountTotal > 0}
							<div class="flex justify-between font-medium text-danger">
								<span>Total Item Discount:</span>
								<span class="tabular-nums">-₹{sale.discountTotal.toFixed(2)}</span>
							</div>
						{/if}
						<div class="flex justify-between text-text-secondary print:text-black">
							<span>Taxable Value:</span>
							<span class="tabular-nums">₹{sale.taxableTotal.toFixed(2)}</span>
						</div>
						<div class="flex justify-between text-text-secondary print:text-black">
							<span>Total GST (CGST + SGST):</span>
							<span class="tabular-nums">+₹{sale.gstTotal.toFixed(2)}</span>
						</div>
						{#if sale.roundOff !== 0}
							<div class="flex justify-between text-text-muted print:text-gray-600">
								<span>Round Off:</span>
								<span class="tabular-nums">{sale.roundOff > 0 ? '+' : ''}₹{sale.roundOff.toFixed(2)}</span>
							</div>
						{/if}

						<div class="my-2 border-t-2 border-border pt-2 print:border-black">
							<div class="flex items-center justify-between text-base font-bold text-text-primary print:text-black">
								<span>Net Payable:</span>
								<span class="font-mono text-lg tabular-nums">₹{sale.grandTotal.toFixed(2)}</span>
							</div>
						</div>

						<div class="border-t border-border/80 pt-2 space-y-1">
							<div class="flex justify-between text-success font-semibold">
								<span>Amount Received ({sale.paymentMethod || 'Cash'}):</span>
								<span class="tabular-nums">₹{(sale.paidAmount || 0).toFixed(2)}</span>
							</div>
							{#if (sale.dueAmount || 0) > 0}
								<div class="flex justify-between font-bold text-warning">
									<span>Balance Due / Ledger:</span>
									<span class="tabular-nums">₹{sale.dueAmount.toFixed(2)}</span>
								</div>
							{:else}
								<div class="flex items-center gap-1 text-[11px] font-bold text-success">
									<CheckCircle2 size={12} />
									<span>Invoice Fully Settled</span>
								</div>
							{/if}
						</div>
					</div>

					<!-- Pharmacist Signature Box -->
					<div class="mt-6 border-t border-dashed border-border pt-3 text-right font-sans text-xs print:border-black print:mt-8">
						<div class="h-8 print:h-12"></div>
						<div class="font-bold text-text-primary print:text-black">For MEDSTOCK PHARMACY</div>
						<div class="text-[10px] text-text-muted print:text-gray-600">Authorized Pharmacist / Reg. No. 198421</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	@media print {
		:global(body) {
			background: white !important;
			color: black !important;
			font-size: 11px !important;
		}
		:global(header), :global(nav), :global(aside) {
			display: none !important;
		}
	}
</style>
