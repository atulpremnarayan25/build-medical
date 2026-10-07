<script lang="ts">
	import type { Customer, PaymentMethod } from '$lib/types/index.js';

	export interface PrintableInvoiceData {
		invoiceNumber: string;
		createdAt: string;
		saleType: 'retail' | 'wholesale';
		paymentMethod: PaymentMethod;
		subtotal: number;
		discountTotal: number;
		taxableTotal: number;
		cgstTotal: number;
		sgstTotal: number;
		gstTotal: number;
		roundOff: number;
		grandTotal: number;
		amountTendered: number;
		changeDue: number;
		customer: Customer | null;
		items: Array<{
			productName: string;
			batchNumber: string;
			expiryDate?: string;
			quantity: number;
			mrp: number;
			rate: number;
			discount: number;
			gstRate: number;
			hsnCode?: string;
			lineTotal: number;
			drugSchedule?: string;
		}>;
		patientName?: string;
		prescriberName?: string;
		prescriberRegNo?: string;
	}

	export interface StoreData {
		name: string;
		address?: string | null;
		phone?: string | null;
		email?: string | null;
		gstin?: string | null;
		drugLicenseNo?: string | null;
		drugLicenseNo2?: string | null;
		invoiceTerms?: string | null;
	}

	let {
		invoice,
		store,
		cashierName = 'Pharmacist',
		printMode = 'thermal'
	}: {
		invoice: PrintableInvoiceData | null;
		store: StoreData;
		cashierName?: string;
		printMode?: 'thermal' | 'tax-invoice';
	} = $props();

	function formatDate(isoStr?: string) {
		if (!isoStr) return new Date().toLocaleDateString('en-IN');
		try {
			return new Date(isoStr).toLocaleDateString('en-IN', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric'
			});
		} catch {
			return isoStr;
		}
	}

	function formatTime(isoStr?: string) {
		if (!isoStr) return new Date().toLocaleTimeString('en-IN');
		try {
			return new Date(isoStr).toLocaleTimeString('en-IN', {
				hour: '2-digit',
				minute: '2-digit',
				hour12: true
			});
		} catch {
			return '';
		}
	}

	function formatExpiry(dateStr?: string) {
		if (!dateStr) return '-';
		try {
			const d = new Date(dateStr);
			return d.toLocaleDateString('en-IN', { month: '2-digit', year: '2-digit' });
		} catch {
			return dateStr.substring(0, 7);
		}
	}
</script>

{#if invoice}
	<div class="print-container">
		{#if printMode === 'thermal'}
			<!-- 80MM THERMAL RECEIPT LAYOUT -->
			<div class="thermal-receipt">
				<!-- Header -->
				<div class="text-center pb-2 border-b border-dashed border-black">
					<h1 class="text-base font-bold tracking-tight uppercase">{store.name}</h1>
					<p class="text-[10px] whitespace-pre-line leading-tight mt-0.5">{store.address}</p>
					<p class="text-[10px] mt-0.5">Ph: {store.phone}</p>
					{#if store.gstin}
						<p class="text-[10px] font-bold">GSTIN: {store.gstin}</p>
					{/if}
					<div class="text-[9px] mt-0.5">
						{#if store.drugLicenseNo}<span>DL: {store.drugLicenseNo}</span>{/if}
						{#if store.drugLicenseNo2}<span> | {store.drugLicenseNo2}</span>{/if}
					</div>
				</div>

				<!-- Invoice Metadata -->
				<div class="py-1.5 border-b border-dashed border-black text-[10px] space-y-0.5">
					<div class="flex justify-between">
						<span><strong>Inv:</strong> {invoice.invoiceNumber}</span>
						<span>{formatDate(invoice.createdAt)} {formatTime(invoice.createdAt)}</span>
					</div>
					<div class="flex justify-between">
						<span><strong>Cashier:</strong> {cashierName}</span>
						<span><strong>Mode:</strong> {invoice.paymentMethod.toUpperCase()}</span>
					</div>
					<div class="flex justify-between">
						<span class="truncate max-w-[180px]"><strong>Cust:</strong> {invoice.customer ? invoice.customer.name : 'Walk-in Customer'}</span>
						{#if invoice.customer?.phone}
							<span>{invoice.customer.phone}</span>
						{/if}
					</div>
					{#if invoice.prescriberName || invoice.prescriberRegNo}
						<div class="border-t border-dotted border-black/50 pt-0.5 mt-0.5">
							<div><strong>Dr:</strong> {invoice.prescriberName || 'Registered Medical Practitioner'}</div>
							{#if invoice.prescriberRegNo}<div><strong>Reg No:</strong> {invoice.prescriberRegNo}</div>{/if}
							{#if invoice.patientName}<div><strong>Patient:</strong> {invoice.patientName}</div>{/if}
						</div>
					{/if}
				</div>

				<!-- Compact Items Table -->
				<div class="py-1.5 border-b border-dashed border-black">
					<table class="w-full text-left text-[10px]">
						<thead>
							<tr class="border-b border-black text-[9px] uppercase font-bold">
								<th class="py-0.5">Item</th>
								<th class="py-0.5 text-center">Batch/Exp</th>
								<th class="py-0.5 text-right">Qty</th>
								<th class="py-0.5 text-right">Rate</th>
								<th class="py-0.5 text-right">Total</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-dotted divide-black/40">
							{#each invoice.items as item}
								<tr>
									<td class="py-1 pr-1 font-semibold leading-tight">
										<div>{item.productName}</div>
										{#if item.drugSchedule && item.drugSchedule !== 'none'}
											<span class="text-[8px] font-bold">[Sch {item.drugSchedule}]</span>
										{/if}
									</td>
									<td class="py-1 text-center font-mono text-[9px]">
										<div>{item.batchNumber}</div>
										<div>{formatExpiry(item.expiryDate)}</div>
									</td>
									<td class="py-1 text-right font-mono font-bold">{item.quantity}</td>
									<td class="py-1 text-right font-mono">{item.rate.toFixed(2)}</td>
									<td class="py-1 text-right font-mono font-bold">
										{(item.quantity * item.rate * (1 - item.discount / 100)).toFixed(2)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- GST & Totals Summary -->
				<div class="py-1.5 border-b border-dashed border-black text-[10px] space-y-0.5">
					<div class="flex justify-between">
						<span>Subtotal:</span>
						<span class="font-mono">₹{invoice.subtotal.toFixed(2)}</span>
					</div>
					{#if invoice.discountTotal > 0}
						<div class="flex justify-between">
							<span>Discount:</span>
							<span class="font-mono">-₹{invoice.discountTotal.toFixed(2)}</span>
						</div>
					{/if}
					<div class="flex justify-between">
						<span>Taxable Turnover:</span>
						<span class="font-mono">₹{invoice.taxableTotal.toFixed(2)}</span>
					</div>
					<div class="flex justify-between">
						<span>CGST ({((invoice.cgstTotal / (invoice.taxableTotal || 1)) * 100).toFixed(1)}%):</span>
						<span class="font-mono">₹{invoice.cgstTotal.toFixed(2)}</span>
					</div>
					<div class="flex justify-between">
						<span>SGST ({((invoice.sgstTotal / (invoice.taxableTotal || 1)) * 100).toFixed(1)}%):</span>
						<span class="font-mono">₹{invoice.sgstTotal.toFixed(2)}</span>
					</div>
					{#if Math.abs(invoice.roundOff) > 0.001}
						<div class="flex justify-between text-[9px]">
							<span>Round-off:</span>
							<span class="font-mono">₹{invoice.roundOff.toFixed(2)}</span>
						</div>
					{/if}
					<div class="flex justify-between text-xs font-bold pt-1 border-t border-black">
						<span>NET AMOUNT:</span>
						<span class="font-mono text-sm">₹{invoice.grandTotal.toFixed(2)}</span>
					</div>
					<div class="flex justify-between pt-0.5">
						<span>Cash Tendered:</span>
						<span class="font-mono">₹{invoice.amountTendered.toFixed(2)}</span>
					</div>
					<div class="flex justify-between font-bold">
						<span>Change Returned:</span>
						<span class="font-mono">₹{invoice.changeDue.toFixed(2)}</span>
					</div>
				</div>

				<!-- Footer & Terms -->
				<div class="pt-2 text-center text-[9px] space-y-0.5">
					<p class="font-bold">Thank you for visiting {store.name}!</p>
					{#if store.invoiceTerms}
						<p class="whitespace-pre-line text-[8px] text-gray-700 leading-tight mt-1">{store.invoiceTerms}</p>
					{/if}
					<p class="text-[8px] text-gray-500 pt-1">Software: MedStock ERP</p>
				</div>
			</div>
		{:else}
			<!-- A4 / A5 FORMAL GST TAX INVOICE -->
			<div class="tax-invoice-a4">
				<!-- Top Header Banner -->
				<div class="border-b-2 border-black pb-3 mb-3">
					<div class="flex justify-between items-start">
						<div>
							<h1 class="text-xl font-bold uppercase tracking-tight">{store.name}</h1>
							<p class="text-xs text-gray-700 whitespace-pre-line leading-tight mt-0.5">{store.address}</p>
							<p class="text-xs mt-0.5">Phone: {store.phone} {store.email ? `| Email: ${store.email}` : ''}</p>
							<div class="text-xs font-semibold mt-1">
								<span>GSTIN: <strong>{store.gstin}</strong></span>
								<span class="ml-3">DL No: <strong>{store.drugLicenseNo}</strong> {store.drugLicenseNo2 ? `/ ${store.drugLicenseNo2}` : ''}</span>
							</div>
						</div>
						<div class="text-right">
							<div class="inline-block bg-black text-white px-3 py-1 font-bold text-sm tracking-wider uppercase mb-1">
								TAX INVOICE
							</div>
							<div class="text-xs font-mono">
								<p><strong>Invoice No:</strong> {invoice.invoiceNumber}</p>
								<p><strong>Date:</strong> {formatDate(invoice.createdAt)}</p>
								<p><strong>Time:</strong> {formatTime(invoice.createdAt)}</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Billed To & Compliance Details -->
				<div class="grid grid-cols-2 gap-4 border border-black p-2.5 mb-3 text-xs">
					<div>
						<div class="font-bold uppercase text-[10px] text-gray-600 mb-0.5">Details of Receiver / Billed To:</div>
						<div class="font-bold text-sm">{invoice.customer ? invoice.customer.name : 'Walk-in Customer'}</div>
						{#if invoice.customer?.address}
							<div class="text-gray-700">{invoice.customer.address}</div>
						{/if}
						{#if invoice.customer?.phone}
							<div>Phone: {invoice.customer.phone}</div>
						{/if}
						{#if invoice.customer?.gstin}
							<div class="font-bold">GSTIN: {invoice.customer.gstin}</div>
						{/if}
					</div>
					<div>
						<div class="font-bold uppercase text-[10px] text-gray-600 mb-0.5">Prescription & Payment:</div>
						<div><strong>Payment Mode:</strong> {invoice.paymentMethod.toUpperCase()} ({invoice.saleType.toUpperCase()})</div>
						<div><strong>Cashier:</strong> {cashierName}</div>
						{#if invoice.prescriberName || invoice.prescriberRegNo}
							<div class="mt-1 pt-1 border-t border-gray-300">
								<div><strong>Prescribed by:</strong> {invoice.prescriberName || 'Registered Doctor'}</div>
								{#if invoice.prescriberRegNo}<div><strong>Doctor Reg No:</strong> {invoice.prescriberRegNo}</div>{/if}
								{#if invoice.patientName}<div><strong>Patient Name:</strong> {invoice.patientName}</div>{/if}
							</div>
						{/if}
					</div>
				</div>

				<!-- Detailed Line Items Table -->
				<table class="w-full border-collapse border border-black text-xs mb-3">
					<thead>
						<tr class="bg-gray-100 border-b border-black text-[10px] uppercase font-bold text-center">
							<th class="border border-black p-1 w-8">#</th>
							<th class="border border-black p-1 text-left">Description of Goods</th>
							<th class="border border-black p-1 w-16">HSN</th>
							<th class="border border-black p-1 w-20">Batch</th>
							<th class="border border-black p-1 w-16">Exp</th>
							<th class="border border-black p-1 w-12">Qty</th>
							<th class="border border-black p-1 w-16 text-right">MRP (₹)</th>
							<th class="border border-black p-1 w-16 text-right">Rate (₹)</th>
							<th class="border border-black p-1 w-12 text-right">Dis%</th>
							<th class="border border-black p-1 w-12 text-right">GST%</th>
							<th class="border border-black p-1 w-20 text-right">Amount (₹)</th>
						</tr>
					</thead>
					<tbody>
						{#each invoice.items as item, idx}
							<tr class="text-[11px] leading-tight">
								<td class="border border-black p-1 text-center font-mono">{idx + 1}</td>
								<td class="border border-black p-1">
									<div class="font-bold">{item.productName}</div>
									{#if item.drugSchedule && item.drugSchedule !== 'none'}
										<span class="text-[9px] font-bold text-gray-700">Schedule {item.drugSchedule} Drug</span>
									{/if}
								</td>
								<td class="border border-black p-1 text-center font-mono text-[10px]">{item.hsnCode || '3004'}</td>
								<td class="border border-black p-1 text-center font-mono">{item.batchNumber}</td>
								<td class="border border-black p-1 text-center font-mono">{formatExpiry(item.expiryDate)}</td>
								<td class="border border-black p-1 text-center font-mono font-bold">{item.quantity}</td>
								<td class="border border-black p-1 text-right font-mono">{item.mrp.toFixed(2)}</td>
								<td class="border border-black p-1 text-right font-mono">{item.rate.toFixed(2)}</td>
								<td class="border border-black p-1 text-right font-mono">{item.discount}%</td>
								<td class="border border-black p-1 text-right font-mono">{item.gstRate}%</td>
								<td class="border border-black p-1 text-right font-mono font-bold">
									{(item.quantity * item.rate * (1 - item.discount / 100)).toFixed(2)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>

				<!-- Financial Breakdown & Bank Terms -->
				<div class="grid grid-cols-2 gap-4 border border-black p-3 text-xs mb-3">
					<div>
						<div class="font-bold mb-1">Terms & Conditions:</div>
						<p class="whitespace-pre-line text-[10px] text-gray-700 leading-normal">
							{store.invoiceTerms || '1. Goods once sold will not be taken back without original bill.\n2. Medicines must be stored as per manufacturer guidelines.\n3. Consult physician before consumption.'}
						</p>
					</div>
					<div class="space-y-1 font-mono text-xs">
						<div class="flex justify-between">
							<span class="font-sans">Sub Total:</span>
							<span>₹{invoice.subtotal.toFixed(2)}</span>
						</div>
						{#if invoice.discountTotal > 0}
							<div class="flex justify-between">
								<span class="font-sans">Total Discount:</span>
								<span>-₹{invoice.discountTotal.toFixed(2)}</span>
							</div>
						{/if}
						<div class="flex justify-between">
							<span class="font-sans">Taxable Value:</span>
							<span>₹{invoice.taxableTotal.toFixed(2)}</span>
						</div>
						<div class="flex justify-between">
							<span class="font-sans">CGST Output:</span>
							<span>₹{invoice.cgstTotal.toFixed(2)}</span>
						</div>
						<div class="flex justify-between">
							<span class="font-sans">SGST Output:</span>
							<span>₹{invoice.sgstTotal.toFixed(2)}</span>
						</div>
						{#if Math.abs(invoice.roundOff) > 0.001}
							<div class="flex justify-between">
								<span class="font-sans">Round Off:</span>
								<span>₹{invoice.roundOff.toFixed(2)}</span>
							</div>
						{/if}
						<div class="flex justify-between border-t-2 border-black pt-1 font-bold text-sm">
							<span class="font-sans">Grand Total:</span>
							<span>₹{invoice.grandTotal.toFixed(2)}</span>
						</div>
					</div>
				</div>

				<!-- Signature & Sign-off -->
				<div class="flex justify-between items-end pt-4 text-xs">
					<div class="text-[10px] text-gray-600">
						E. & O.E. • This is a computer generated invoice.
					</div>
					<div class="text-right border-t border-black pt-2 px-8">
						<div class="font-bold">For {store.name}</div>
						<div class="text-[10px] mt-4">Authorized Signatory / Registered Pharmacist</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	@media screen {
		.print-container {
			display: none !important;
		}
	}

	@media print {
		.print-container {
			display: block !important;
			background: white !important;
			color: black !important;
		}

		.thermal-receipt {
			width: 76mm;
			max-width: 80mm;
			margin: 0 auto;
			font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
			font-size: 10px;
			line-height: 1.25;
			color: black;
			padding: 2mm 0;
		}

		.tax-invoice-a4 {
			width: 100%;
			max-width: 210mm;
			margin: 0 auto;
			font-family: system-ui, -apple-system, sans-serif;
			font-size: 11px;
			color: black;
			padding: 6mm;
		}
	}
</style>
