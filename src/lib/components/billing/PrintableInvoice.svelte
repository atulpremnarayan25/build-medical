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
				<div class="border-b border-dashed border-black pb-2 text-center">
					<h1 class="text-base font-bold tracking-tight uppercase">{store.name}</h1>
					<p class="mt-0.5 text-[10px] leading-tight whitespace-pre-line">{store.address}</p>
					<p class="mt-0.5 text-[10px]">Ph: {store.phone}</p>
					{#if store.gstin}
						<p class="text-[10px] font-bold">GSTIN: {store.gstin}</p>
					{/if}
					<div class="mt-0.5 text-[9px]">
						{#if store.drugLicenseNo}<span>DL: {store.drugLicenseNo}</span>{/if}
						{#if store.drugLicenseNo2}<span> | {store.drugLicenseNo2}</span>{/if}
					</div>
				</div>

				<!-- Invoice Metadata -->
				<div class="space-y-0.5 border-b border-dashed border-black py-1.5 text-[10px]">
					<div class="flex justify-between">
						<span><strong>Inv:</strong> {invoice.invoiceNumber}</span>
						<span>{formatDate(invoice.createdAt)} {formatTime(invoice.createdAt)}</span>
					</div>
					<div class="flex justify-between">
						<span><strong>Cashier:</strong> {cashierName}</span>
						<span><strong>Mode:</strong> {invoice.paymentMethod.toUpperCase()}</span>
					</div>
					<div class="flex justify-between">
						<span class="max-w-[180px] truncate"
							><strong>Cust:</strong>
							{invoice.customer ? invoice.customer.name : 'Walk-in Customer'}</span
						>
						{#if invoice.customer?.phone}
							<span>{invoice.customer.phone}</span>
						{/if}
					</div>
					{#if invoice.prescriberName || invoice.prescriberRegNo}
						<div class="mt-0.5 border-t border-dotted border-black/50 pt-0.5">
							<div>
								<strong>Dr:</strong>
								{invoice.prescriberName || 'Registered Medical Practitioner'}
							</div>
							{#if invoice.prescriberRegNo}<div>
									<strong>Reg No:</strong>
									{invoice.prescriberRegNo}
								</div>{/if}
							{#if invoice.patientName}<div>
									<strong>Patient:</strong>
									{invoice.patientName}
								</div>{/if}
						</div>
					{/if}
				</div>

				<!-- Compact Items Table -->
				<div class="border-b border-dashed border-black py-1.5">
					<table class="w-full text-left text-[10px]">
						<thead>
							<tr class="border-b border-black text-[9px] font-bold uppercase">
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
									<td class="py-1 pr-1 leading-tight font-semibold">
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
				<div class="space-y-0.5 border-b border-dashed border-black py-1.5 text-[10px]">
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
						<span
							>CGST ({((invoice.cgstTotal / (invoice.taxableTotal || 1)) * 100).toFixed(1)}%):</span
						>
						<span class="font-mono">₹{invoice.cgstTotal.toFixed(2)}</span>
					</div>
					<div class="flex justify-between">
						<span
							>SGST ({((invoice.sgstTotal / (invoice.taxableTotal || 1)) * 100).toFixed(1)}%):</span
						>
						<span class="font-mono">₹{invoice.sgstTotal.toFixed(2)}</span>
					</div>
					{#if Math.abs(invoice.roundOff) > 0.001}
						<div class="flex justify-between text-[9px]">
							<span>Round-off:</span>
							<span class="font-mono">₹{invoice.roundOff.toFixed(2)}</span>
						</div>
					{/if}
					<div class="flex justify-between border-t border-black pt-1 text-xs font-bold">
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
				<div class="space-y-0.5 pt-2 text-center text-[9px]">
					<p class="font-bold">Thank you for visiting {store.name}!</p>
					{#if store.invoiceTerms}
						<p class="mt-1 text-[8px] leading-tight whitespace-pre-line text-gray-700">
							{store.invoiceTerms}
						</p>
					{/if}
					<p class="pt-1 text-[8px] text-gray-500">Software: MedStock ERP</p>
				</div>
			</div>
		{:else}
			<!-- A4 / A5 FORMAL GST TAX INVOICE -->
			<div class="tax-invoice-a4">
				<!-- Top Header Banner -->
				<div class="mb-3 border-b-2 border-black pb-3">
					<div class="flex items-start justify-between">
						<div>
							<h1 class="text-xl font-bold tracking-tight uppercase">{store.name}</h1>
							<p class="mt-0.5 text-xs leading-tight whitespace-pre-line text-gray-700">
								{store.address}
							</p>
							<p class="mt-0.5 text-xs">
								Phone: {store.phone}
								{store.email ? `| Email: ${store.email}` : ''}
							</p>
							<div class="mt-1 text-xs font-semibold">
								<span>GSTIN: <strong>{store.gstin}</strong></span>
								<span class="ml-3"
									>DL No: <strong>{store.drugLicenseNo}</strong>
									{store.drugLicenseNo2 ? `/ ${store.drugLicenseNo2}` : ''}</span
								>
							</div>
						</div>
						<div class="text-right">
							<div
								class="mb-1 inline-block bg-black px-3 py-1 text-sm font-bold tracking-wider text-white uppercase"
							>
								TAX INVOICE
							</div>
							<div class="font-mono text-xs">
								<p><strong>Invoice No:</strong> {invoice.invoiceNumber}</p>
								<p><strong>Date:</strong> {formatDate(invoice.createdAt)}</p>
								<p><strong>Time:</strong> {formatTime(invoice.createdAt)}</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Billed To & Compliance Details -->
				<div class="mb-3 grid grid-cols-2 gap-4 border border-black p-2.5 text-xs">
					<div>
						<div class="mb-0.5 text-[10px] font-bold text-gray-600 uppercase">
							Details of Receiver / Billed To:
						</div>
						<div class="text-sm font-bold">
							{invoice.customer ? invoice.customer.name : 'Walk-in Customer'}
						</div>
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
						<div class="mb-0.5 text-[10px] font-bold text-gray-600 uppercase">
							Prescription & Payment:
						</div>
						<div>
							<strong>Payment Mode:</strong>
							{invoice.paymentMethod.toUpperCase()} ({invoice.saleType.toUpperCase()})
						</div>
						<div><strong>Cashier:</strong> {cashierName}</div>
						{#if invoice.prescriberName || invoice.prescriberRegNo}
							<div class="mt-1 border-t border-gray-300 pt-1">
								<div>
									<strong>Prescribed by:</strong>
									{invoice.prescriberName || 'Registered Doctor'}
								</div>
								{#if invoice.prescriberRegNo}<div>
										<strong>Doctor Reg No:</strong>
										{invoice.prescriberRegNo}
									</div>{/if}
								{#if invoice.patientName}<div>
										<strong>Patient Name:</strong>
										{invoice.patientName}
									</div>{/if}
							</div>
						{/if}
					</div>
				</div>

				<!-- Detailed Line Items Table -->
				<table class="mb-3 w-full border-collapse border border-black text-xs">
					<thead>
						<tr
							class="border-b border-black bg-gray-100 text-center text-[10px] font-bold uppercase"
						>
							<th class="w-8 border border-black p-1">#</th>
							<th class="border border-black p-1 text-left">Description of Goods</th>
							<th class="w-16 border border-black p-1">HSN</th>
							<th class="w-20 border border-black p-1">Batch</th>
							<th class="w-16 border border-black p-1">Exp</th>
							<th class="w-12 border border-black p-1">Qty</th>
							<th class="w-16 border border-black p-1 text-right">MRP (₹)</th>
							<th class="w-16 border border-black p-1 text-right">Rate (₹)</th>
							<th class="w-12 border border-black p-1 text-right">Dis%</th>
							<th class="w-12 border border-black p-1 text-right">GST%</th>
							<th class="w-20 border border-black p-1 text-right">Amount (₹)</th>
						</tr>
					</thead>
					<tbody>
						{#each invoice.items as item, idx}
							<tr class="text-[11px] leading-tight">
								<td class="border border-black p-1 text-center font-mono">{idx + 1}</td>
								<td class="border border-black p-1">
									<div class="font-bold">{item.productName}</div>
									{#if item.drugSchedule && item.drugSchedule !== 'none'}
										<span class="text-[9px] font-bold text-gray-700"
											>Schedule {item.drugSchedule} Drug</span
										>
									{/if}
								</td>
								<td class="border border-black p-1 text-center font-mono text-[10px]"
									>{item.hsnCode || '3004'}</td
								>
								<td class="border border-black p-1 text-center font-mono">{item.batchNumber}</td>
								<td class="border border-black p-1 text-center font-mono"
									>{formatExpiry(item.expiryDate)}</td
								>
								<td class="border border-black p-1 text-center font-mono font-bold"
									>{item.quantity}</td
								>
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
				<div class="mb-3 grid grid-cols-2 gap-4 border border-black p-3 text-xs">
					<div>
						<div class="mb-1 font-bold">Terms & Conditions:</div>
						<p class="text-[10px] leading-normal whitespace-pre-line text-gray-700">
							{store.invoiceTerms ||
								'1. Goods once sold will not be taken back without original bill.\n2. Medicines must be stored as per manufacturer guidelines.\n3. Consult physician before consumption.'}
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
						<div class="flex justify-between border-t-2 border-black pt-1 text-sm font-bold">
							<span class="font-sans">Grand Total:</span>
							<span>₹{invoice.grandTotal.toFixed(2)}</span>
						</div>
					</div>
				</div>

				<!-- Signature & Sign-off -->
				<div class="flex items-end justify-between pt-4 text-xs">
					<div class="text-[10px] text-gray-600">
						E. & O.E. • This is a computer generated invoice.
					</div>
					<div class="border-t border-black px-8 pt-2 text-right">
						<div class="font-bold">For {store.name}</div>
						<div class="mt-4 text-[10px]">Authorized Signatory / Registered Pharmacist</div>
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
			font-family:
				system-ui,
				-apple-system,
				sans-serif;
			font-size: 11px;
			color: black;
			padding: 6mm;
		}
	}
</style>
