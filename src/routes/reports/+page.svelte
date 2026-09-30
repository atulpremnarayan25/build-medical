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
			<h1 class="text-xl font-bold text-text-primary">Executive Reports & Analytics</h1>
			<p class="text-xs text-text-muted">GST tax statements, party ledgers, valuation summaries, and compliance audit logs</p>
		</div>
	</div>

	<!-- Report Sections -->
	<div class="space-y-6">
		{#each reportCategories as category}
			<section class="space-y-3">
				<h2 class="text-xs font-bold uppercase tracking-wider text-text-muted">{category.title}</h2>
				<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{#each category.items as item}
						<a
							href={item.href}
							class="group flex items-start gap-3.5 rounded-xl border border-border bg-surface p-4 shadow-2xs transition-all hover:border-accent hover:shadow-xs"
						>
							<div
								class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-light/60 text-accent transition-colors group-hover:bg-accent group-hover:text-white"
							>
								<item.icon size={18} />
							</div>
							<div>
								<h3 class="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">{item.name}</h3>
								<p class="mt-1 text-xs text-text-muted leading-relaxed">{item.desc}</p>
							</div>
						</a>
					{/each}
				</div>
			</section>
		{/each}
	</div>
</div>
