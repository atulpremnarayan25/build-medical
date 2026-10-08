<script lang="ts">
	import { formatCurrency, numberToWordsRupees } from '$lib/utils/formatters.js';

	export interface ReceiptSlipData {
		receiptNumber: string;
		date: string;
		partyName: string;
		partyCode?: string;
		partyPhone?: string;
		partyType: 'customer' | 'supplier';
		amount: number;
		paymentMethod: string;
		reference?: string;
		notes?: string;
		previousBalance: number;
		newBalance: number;
		invoiceNumber?: string;
	}

	export interface StoreInfo {
		name: string;
		address?: string | null;
		phone?: string | null;
		gstin?: string | null;
	}

	let {
		slip,
		store = {
			name: 'MedStock Pharmacy',
			address: '123 Healthcare Road, Medical Square',
			phone: '+91 98765 43210',
			gstin: '29ABCDE1234F1Z5'
		}
	}: {
		slip: ReceiptSlipData | null;
		store?: StoreInfo;
	} = $props();

	function formatDisplayDate(dateStr?: string) {
		if (!dateStr) return '';
		try {
			return new Date(dateStr).toLocaleDateString('en-IN', {
				day: '2-digit',
				month: 'short',
				year: 'numeric'
			});
		} catch {
			return dateStr;
		}
	}
</script>

{#if slip}
	<div class="print-receipt-container">
		<div class="receipt-slip-card">
			<!-- Header -->
			<div class="border-b-2 border-black pb-2 text-center">
				<h2 class="text-base font-bold uppercase tracking-tight">{store.name || 'MedStock Pharmacy'}</h2>
				{#if store.address}
					<p class="text-[10px] text-gray-700 leading-tight">{store.address}</p>
				{/if}
				<div class="flex justify-center gap-3 text-[10px] text-gray-800 mt-0.5">
					{#if store.phone}
						<span>Ph: {store.phone}</span>
					{/if}
					{#if store.gstin}
						<span>GSTIN: <strong>{store.gstin}</strong></span>
					{/if}
				</div>
				<div class="mt-2 inline-block border border-black bg-gray-100 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider">
					{slip.partyType === 'customer' ? 'OFFICIAL PAYMENT RECEIPT' : 'PAYMENT DISBURSEMENT VOUCHER'}
				</div>
			</div>

			<!-- Voucher Metadata -->
			<div class="grid grid-cols-2 gap-2 border-b border-black py-2 text-[10px]">
				<div>
					<span class="text-gray-600">Voucher No:</span>
					<strong class="font-mono ml-1">{slip.receiptNumber}</strong>
				</div>
				<div class="text-right">
					<span class="text-gray-600">Date:</span>
					<strong class="font-mono ml-1">{formatDisplayDate(slip.date)}</strong>
				</div>
				<div>
					<span class="text-gray-600">Party:</span>
					<strong class="ml-1">{slip.partyName}</strong>
					{#if slip.partyCode}
						<span class="text-gray-500 font-mono text-[9px]">({slip.partyCode})</span>
					{/if}
				</div>
				<div class="text-right">
					{#if slip.partyPhone}
						<span class="text-gray-600">Phone:</span>
						<span class="font-mono ml-1">{slip.partyPhone}</span>
					{/if}
				</div>
			</div>

			<!-- Main Payment Section -->
			<div class="py-2.5 border-b border-black text-xs space-y-1.5">
				<div class="flex justify-between items-baseline">
					<span class="text-gray-700 font-medium">Payment Mode:</span>
					<strong class="uppercase font-mono text-[11px] bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300">
						{slip.paymentMethod}
					</strong>
				</div>

				{#if slip.reference}
					<div class="flex justify-between items-baseline text-[10px]">
						<span class="text-gray-600">Txn / UTR / Cheque Ref:</span>
						<strong class="font-mono">{slip.reference}</strong>
					</div>
				{/if}

				{#if slip.invoiceNumber}
					<div class="flex justify-between items-baseline text-[10px]">
						<span class="text-gray-600">Settled Against Invoice:</span>
						<strong class="font-mono">{slip.invoiceNumber}</strong>
					</div>
				{/if}

				{#if slip.notes}
					<div class="text-[10px] text-gray-700">
						<span class="text-gray-500">Particulars:</span>
						<span class="italic ml-1">{slip.notes}</span>
					</div>
				{/if}

				<div class="flex justify-between items-center pt-1 border-t border-dashed border-gray-400">
					<span class="font-bold text-sm">AMOUNT RECEIVED:</span>
					<span class="font-mono text-base font-extrabold">{formatCurrency(slip.amount)}</span>
				</div>

				<div class="text-[10px] text-gray-800 italic bg-gray-50 p-1.5 rounded border border-gray-200">
					<span class="font-semibold text-gray-600 not-italic">In Words: </span>
					{numberToWordsRupees(slip.amount)}
				</div>
			</div>

			<!-- Running Balance & Ledger Position -->
			<div class="py-2 border-b border-black text-[10px] space-y-1">
				<div class="font-semibold text-gray-700 uppercase tracking-wider text-[9px]">Account Ledger Position</div>
				<div class="flex justify-between">
					<span>Previous Balance:</span>
					<span class="font-mono font-medium">{formatCurrency(slip.previousBalance)}</span>
				</div>
				<div class="flex justify-between text-success font-semibold">
					<span>Current Payment Credit:</span>
					<span class="font-mono">- {formatCurrency(slip.amount)}</span>
				</div>
				<div class="flex justify-between font-bold border-t border-gray-300 pt-0.5 text-xs">
					<span>Closing Balance Due:</span>
					<span class="font-mono">{formatCurrency(slip.newBalance)}</span>
				</div>
			</div>

			<!-- Footer & Signatures -->
			<div class="pt-4 flex justify-between items-end text-[9px] text-gray-600">
				<div>
					<p>Computer generated payment slip.</p>
					<p>MedStock ERP Khata Ledger</p>
				</div>
				<div class="text-right">
					<div class="h-6"></div>
					<div class="border-t border-black pt-1 px-4 font-bold text-black text-[10px]">
						Authorized Signatory / Cashier
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	@media screen {
		.print-receipt-container {
			display: none;
		}
	}

	@media print {
		/* Hide everything else on print */
		:global(body *) {
			visibility: hidden;
		}

		.print-receipt-container,
		.print-receipt-container * {
			visibility: visible;
		}

		.print-receipt-container {
			position: absolute;
			left: 0;
			top: 0;
			width: 100%;
			display: flex !important;
			justify-content: center;
			background: white !important;
			padding: 0;
			margin: 0;
		}

		.receipt-slip-card {
			width: 80mm;
			max-width: 80mm;
			margin: 0 auto;
			padding: 4mm;
			font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
			font-size: 10px;
			line-height: 1.3;
			color: black !important;
			border: 1px dashed black;
		}
	}
</style>
