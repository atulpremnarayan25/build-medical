<script lang="ts">
	import { BarChart, Search, Box, IndianRupee, Truck, Layers, Filter, FileSpreadsheet, ShieldAlert } from '@lucide/svelte';

	const reportCategories = [
		{
			title: 'Sales & Revenue Intelligence',
			items: [
				{
					name: 'Sales Summary',
					desc: 'Daily, monthly, and fiscal year turnover and invoice counts',
					icon: BarChart,
					href: '/reports/sales'
				},
				{
					name: 'Customer Receivables',
					desc: 'Outstanding dues, credit limits, and aging debtor ledgers',
					icon: IndianRupee,
					href: '/reports/ledger?type=receivable'
				},
				{
					name: 'GST Tax Filings (GSTR-1)',
					desc: 'B2B & B2C tax liability summaries, CGST, SGST, and IGST',
					icon: Filter,
					href: '/reports/gst'
				}
			]
		},
		{
			title: 'Procurement & Vendor Payables',
			items: [
				{
					name: 'Purchase / GRN Ledger',
					desc: 'Inward purchase logs, distributor bills, and input tax credits',
					icon: Truck,
					href: '/reports/purchases'
				},
				{
					name: 'Supplier Payables',
					desc: 'Outstanding dues to distributors, payment aging, and remittances',
					icon: IndianRupee,
					href: '/reports/ledger?type=payable'
				}
			]
		},
		{
			title: 'Inventory, FEFO & Regulatory Compliance',
			items: [
				{
					name: 'Schedule H / H1 / X Register',
					desc: 'Statutory Form 35 controlled substance log (Rule 65 inspection audit)',
					icon: ShieldAlert,
					href: '/reports/schedule-h1'
				},
				{
					name: 'Stock Valuation Summary',
					desc: 'Current warehouse stock value at cost and MRP valuations',
					icon: Box,
					href: '/reports/stock'
				},
				{
					name: 'Low Stock & Reorder Radar',
					desc: 'Medicines breaching reorder thresholds requiring procurement',
					icon: Layers,
					href: '/inventory/batches?status=low-stock'
				},
				{
					name: 'FEFO Expiry Risk Audit',
					desc: 'Near-expiry (<90d) batches and expired stock disposal reports',
					icon: Search,
					href: '/inventory/batches?status=near-expiry'
				}
			]
		}
	];
</script>

<svelte:head>
	<title>Financial & Inventory Reports - MedStock ERP</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<div class="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-0.5 text-[11px] font-bold text-teal-700 border border-teal-200/80 mb-1.5">
				<BarChart size={12} class="text-teal-600" />
				<span>Axiscare Financial & Regulatory Hub</span>
			</div>
			<h1 class="text-2xl font-extrabold tracking-tight text-slate-900">Executive Reports & Analytics</h1>
			<p class="text-xs text-slate-500">GST tax statements, party ledgers, valuation summaries, and compliance audit logs</p>
		</div>
	</div>

	<!-- Report Sections -->
	<div class="space-y-8">
		{#each reportCategories as category}
			<section class="space-y-3.5">
				<div class="flex items-center gap-2">
					<span class="h-2 w-2 rounded-full bg-teal-600"></span>
					<h2 class="text-xs font-bold uppercase tracking-wider text-slate-600">{category.title}</h2>
				</div>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each category.items as item}
						<a
							href={item.href}
							class="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-teal-300 hover:shadow-md hover:-translate-y-0.5"
						>
							<div>
								<div class="flex items-center justify-between mb-3">
									<div
										class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 border border-teal-100 group-hover:scale-110 group-hover:bg-teal-600 group-hover:text-white transition-all"
									>
										<item.icon size={18} />
									</div>
									<span class="text-xs font-semibold text-teal-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
										<span>Open</span>
										<span>&rarr;</span>
									</span>
								</div>
								<h3 class="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors">{item.name}</h3>
								<p class="mt-1.5 text-xs text-slate-500 leading-relaxed">{item.desc}</p>
							</div>
						</a>
					{/each}
				</div>
			</section>
		{/each}
	</div>
</div>
