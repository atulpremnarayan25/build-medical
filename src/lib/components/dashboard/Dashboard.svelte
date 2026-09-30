<script lang="ts">
	import { onMount } from 'svelte';
	import { saleService, purchaseService, batchService, customerService, supplierService } from '$lib/services';
	import type { Sale, Purchase } from '$lib/types';
	import { LoadingState, EmptyState, Badge, Button } from '$lib/components/common';
	import {
		TrendingUp,
		ShoppingCart,
		AlertTriangle,
		Clock,
		PackageOpen,
		ArrowUpRight,
		ArrowDownRight,
		CreditCard,
		Plus,
		Package,
		UserPlus,
		Truck,
		Receipt,
		ArrowRight,
		SlidersHorizontal
	} from '@lucide/svelte';
	import { goto } from '$app/navigation';

	// Dashboard state
	let loading = $state(true);
	let error = $state<string | null>(null);

	let summary = $state({
		todaySalesCount: 0,
		todaySalesTotal: 0,
		todayPurchasesCount: 0,
		todayPurchasesTotal: 0,
		receivables: 0,
		payables: 0,
		itemsSold: 0
	});

	let recentSales = $state<Sale[]>([]);
	let recentPurchases = $state<Purchase[]>([]);

	let stockAlerts = $state({
		lowStock: 0,
		outOfStock: 0,
		nearExpiry: 0,
		expired: 0
	});

	onMount(async () => {
		try {
			loading = true;

			// Fetch metrics in parallel
			const [
				salesDashboard,
				purchasesDashboard,
				allSales,
				allPurchases,
				lowStock,
				expired,
				expiring,
				outOfStockCount
			] = await Promise.all([
				saleService.getDashboardSummary(),
				purchaseService.getDashboardSummary(),
				saleService.getSales(),
				purchaseService.getPurchases(),
				batchService.getLowStockBatches(10),
				batchService.getExpiredBatches(),
				batchService.getExpiringBatches(90),
				batchService.getOutOfStockProductCount()
			]);

			summary = {
				todaySalesCount: salesDashboard.todaySalesCount,
				todaySalesTotal: salesDashboard.todaySalesTotal,
				todayPurchasesCount: purchasesDashboard.todayPurchasesCount,
				todayPurchasesTotal: purchasesDashboard.todayPurchasesTotal,
				receivables: salesDashboard.totalReceivables,
				payables: purchasesDashboard.totalPayables,
				itemsSold: salesDashboard.todayItemsSold
			};

			recentSales = allSales
				.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
				.slice(0, 5);

			recentPurchases = allPurchases
				.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
				.slice(0, 5);

			stockAlerts = {
				lowStock: lowStock.length,
				outOfStock: outOfStockCount,
				nearExpiry: expiring.length,
				expired: expired.length
			};

			loading = false;
		} catch (e) {
			console.error(e);
			error = 'Failed to load dashboard data.';
			loading = false;
		}
	});
</script>

{#if loading}
	<LoadingState message="Loading dashboard intelligence..." />
{:else if error}
	<EmptyState title="Error Loading Dashboard" message={error} />
{:else}
	<div class="space-y-5">
		<!-- Page Header & Quick Launch -->
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h1 class="text-xl font-bold text-text-primary">Executive Dashboard</h1>
				<p class="text-xs text-text-muted">Real-time pharmacy sales, inventory health, and cash flow</p>
			</div>
			<div class="flex flex-wrap items-center gap-2 text-xs">
				<Button variant="primary" size="sm" onclick={() => goto('/sales/new')}>
					<Plus size={14} class="mr-1" />
					<span>+ New Sale (POS)</span>
				</Button>
				<Button variant="secondary" size="sm" onclick={() => goto('/purchases/new')}>
					<Plus size={14} class="mr-1" />
					<span>+ Inward GRN</span>
				</Button>
				<Button variant="outline" size="sm" onclick={() => goto('/inventory/products/new')}>
					<Package size={14} class="mr-1" />
					<span>+ Product</span>
				</Button>
			</div>
		</div>

		<!-- Top Financial KPIs -->
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<!-- Today's Sales -->
			<div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-text-muted">Today's Revenue</span>
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-light text-accent">
						<TrendingUp size={16} />
					</div>
				</div>
				<div class="mt-2 flex items-baseline gap-2">
					<span class="font-mono text-2xl font-black text-text-primary tabular-nums">
						₹{summary.todaySalesTotal.toLocaleString('en-IN', {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2
						})}
					</span>
				</div>
				<div class="mt-1 text-[11px] text-text-muted">
					{summary.todaySalesCount} invoices ({summary.itemsSold} units sold)
				</div>
			</div>

			<!-- Today's Purchases -->
			<div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-text-muted">Today's Purchases</span>
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-info-light text-info">
						<ShoppingCart size={16} />
					</div>
				</div>
				<div class="mt-2 flex items-baseline gap-2">
					<span class="font-mono text-2xl font-black text-info tabular-nums">
						₹{summary.todayPurchasesTotal.toLocaleString('en-IN', {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2
						})}
					</span>
				</div>
				<div class="mt-1 text-[11px] text-text-muted">
					{summary.todayPurchasesCount} inward supplier bills
				</div>
			</div>

			<!-- Total Receivables -->
			<div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-text-muted">Customer Receivables</span>
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-success-light text-success">
						<ArrowDownRight size={16} />
					</div>
				</div>
				<div class="mt-2 flex items-baseline gap-2">
					<span class="font-mono text-2xl font-black text-success tabular-nums">
						₹{summary.receivables.toLocaleString('en-IN', {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2
						})}
					</span>
				</div>
				<div class="mt-1 text-[11px] text-text-muted">
					Pending customer credit collection
				</div>
			</div>

			<!-- Total Payables -->
			<div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-text-muted">Supplier Payables</span>
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-light text-warning">
						<ArrowUpRight size={16} />
					</div>
				</div>
				<div class="mt-2 flex items-baseline gap-2">
					<span class="font-mono text-2xl font-black text-warning tabular-nums">
						₹{summary.payables.toLocaleString('en-IN', {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2
						})}
					</span>
				</div>
				<div class="mt-1 text-[11px] text-text-muted">
					Outstanding dues to distributors
				</div>
			</div>
		</div>

		<!-- Middle layer: Stock Health Radar & Fast Actions -->
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
			<!-- Stock Alerts Panel -->
			<div class="rounded-xl border border-border bg-surface shadow-2xs lg:col-span-2">
				<div class="flex items-center justify-between border-b border-border px-4 py-3">
					<div class="flex items-center gap-2">
						<AlertTriangle size={16} class="text-warning" />
						<h3 class="text-xs font-bold uppercase tracking-wider text-text-primary">Stock & Compliance Radar</h3>
					</div>
					<a href="/inventory/batches" class="flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
						<span>Batches View</span>
						<ArrowRight size={12} />
					</a>
				</div>
				<div class="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
					<!-- Out of stock -->
					<a
						href="/inventory/products"
						class="flex flex-col items-center rounded-lg border border-danger-light bg-danger-light/50 p-3 text-center transition-all hover:scale-[1.02] hover:shadow-xs"
					>
						<AlertTriangle size={20} class="mb-1 text-danger" />
						<span class="font-mono text-2xl font-black text-danger">
							{stockAlerts.outOfStock}
						</span>
						<span class="mt-0.5 text-[10px] font-bold tracking-wider text-danger uppercase">
							Out of Stock
						</span>
					</a>

					<!-- Low stock -->
					<a
						href="/inventory/batches"
						class="flex flex-col items-center rounded-lg border border-warning-light bg-warning-light/50 p-3 text-center transition-all hover:scale-[1.02] hover:shadow-xs"
					>
						<PackageOpen size={20} class="mb-1 text-warning" />
						<span class="font-mono text-2xl font-black text-warning">
							{stockAlerts.lowStock}
						</span>
						<span class="mt-0.5 text-[10px] font-bold tracking-wider text-warning uppercase">
							Low Stock
						</span>
					</a>

					<!-- Near Expiry -->
					<a
						href="/inventory/batches"
						class="flex flex-col items-center rounded-lg border border-warning-light bg-warning-light/40 p-3 text-center transition-all hover:scale-[1.02] hover:shadow-xs"
					>
						<Clock size={20} class="mb-1 text-warning" />
						<span class="font-mono text-2xl font-black text-warning">
							{stockAlerts.nearExpiry}
						</span>
						<span class="mt-0.5 text-[10px] font-bold tracking-wider text-warning uppercase">
							Near Expiry (&lt;90d)
						</span>
					</a>

					<!-- Expired -->
					<a
						href="/inventory/batches"
						class="flex flex-col items-center rounded-lg border border-danger-light bg-danger-light/50 p-3 text-center transition-all hover:scale-[1.02] hover:shadow-xs"
					>
						<AlertTriangle size={20} class="mb-1 text-danger" />
						<span class="font-mono text-2xl font-black text-danger">
							{stockAlerts.expired}
						</span>
						<span class="mt-0.5 text-[10px] font-bold tracking-wider text-danger uppercase">
							Expired Batches
						</span>
					</a>
				</div>
			</div>

			<!-- Quick Actions Panel -->
			<div class="rounded-xl border border-border bg-surface shadow-2xs">
				<div class="border-b border-border px-4 py-3">
					<h3 class="text-xs font-bold uppercase tracking-wider text-text-primary">Operational Shortcuts</h3>
				</div>
				<div class="grid grid-cols-2 gap-2 p-3">
					<a
						href="/customers/new"
						class="flex flex-col items-start gap-1 rounded-lg border border-border bg-surface-secondary p-2.5 text-xs text-text-primary transition-all hover:border-accent hover:bg-surface-hover"
					>
						<UserPlus size={16} class="text-accent" />
						<span class="font-semibold">Add Customer</span>
						<span class="text-[10px] text-text-muted">Retail/Wholesale</span>
					</a>

					<a
						href="/suppliers/new"
						class="flex flex-col items-start gap-1 rounded-lg border border-border bg-surface-secondary p-2.5 text-xs text-text-primary transition-all hover:border-accent hover:bg-surface-hover"
					>
						<Truck size={16} class="text-accent" />
						<span class="font-semibold">Add Supplier</span>
						<span class="text-[10px] text-text-muted">Vendor Onboarding</span>
					</a>

					<a
						href="/inventory/stock-adjustments/new"
						class="flex flex-col items-start gap-1 rounded-lg border border-border bg-surface-secondary p-2.5 text-xs text-text-primary transition-all hover:border-accent hover:bg-surface-hover"
					>
						<SlidersHorizontal size={16} class="text-accent" />
						<span class="font-semibold">Stock Audit</span>
						<span class="text-[10px] text-text-muted">Quantity adjustments</span>
					</a>

					<a
						href="/reports"
						class="flex flex-col items-start gap-1 rounded-lg border border-border bg-surface-secondary p-2.5 text-xs text-text-primary transition-all hover:border-accent hover:bg-surface-hover"
					>
						<Receipt size={16} class="text-accent" />
						<span class="font-semibold">GST Reports</span>
						<span class="text-[10px] text-text-muted">GSTR-1 & Compliance</span>
					</a>
				</div>
			</div>
		</div>

		<!-- Bottom layer: Recent Sales & Inward Purchases Grid -->
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<!-- Recent Sales -->
			<div class="overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
				<div class="flex items-center justify-between border-b border-border px-4 py-3">
					<div class="flex items-center gap-2">
						<Receipt size={16} class="text-accent" />
						<h3 class="text-xs font-bold uppercase tracking-wider text-text-primary">Recent Invoices</h3>
					</div>
					<a href="/sales" class="text-xs font-semibold text-accent hover:underline">View All</a>
				</div>
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs">
						<thead class="border-b border-border bg-surface-secondary text-[11px] font-semibold text-text-muted uppercase">
							<tr>
								<th class="px-3 py-2.5">Invoice No</th>
								<th class="px-3 py-2.5">Customer</th>
								<th class="px-3 py-2.5 text-right">Amount (₹)</th>
								<th class="px-3 py-2.5 text-center">Status</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border-subtle">
							{#if recentSales.length === 0}
								<tr>
									<td colspan="4" class="px-4 py-6 text-center text-text-muted">No recent sales recorded.</td>
								</tr>
							{:else}
								{#each recentSales as sale (sale.id)}
									<tr class="transition-colors hover:bg-surface-hover cursor-pointer" onclick={() => goto(`/sales/${sale.id}`)}>
										<td class="px-3 py-2.5 font-mono font-bold text-accent whitespace-nowrap">{sale.invoiceNumber}</td>
										<td class="px-3 py-2.5 font-medium text-text-primary max-w-[140px] truncate">
											{sale.customerName || sale.customerId || 'Walk-in'}
										</td>
										<td class="px-3 py-2.5 text-right font-mono font-bold text-text-primary tabular-nums">
											₹{sale.grandTotal.toFixed(2)}
										</td>
										<td class="px-3 py-2.5 text-center">
											<Badge
												variant={sale.paymentStatus === 'paid' ? 'success' : sale.paymentStatus === 'partial' ? 'warning' : 'danger'}
												size="sm"
											>
												{sale.paymentStatus}
											</Badge>
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>

			<!-- Recent Purchases -->
			<div class="overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
				<div class="flex items-center justify-between border-b border-border px-4 py-3">
					<div class="flex items-center gap-2">
						<ShoppingCart size={16} class="text-info" />
						<h3 class="text-xs font-bold uppercase tracking-wider text-text-primary">Recent Inward Purchases</h3>
					</div>
					<a href="/purchases" class="text-xs font-semibold text-accent hover:underline">View All</a>
				</div>
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs">
						<thead class="border-b border-border bg-surface-secondary text-[11px] font-semibold text-text-muted uppercase">
							<tr>
								<th class="px-3 py-2.5">GRN / Inv No</th>
								<th class="px-3 py-2.5">Supplier</th>
								<th class="px-3 py-2.5 text-right">Amount (₹)</th>
								<th class="px-3 py-2.5 text-center">Status</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border-subtle">
							{#if recentPurchases.length === 0}
								<tr>
									<td colspan="4" class="px-4 py-6 text-center text-text-muted">No recent inward purchases.</td>
								</tr>
							{:else}
								{#each recentPurchases as purchase (purchase.id)}
									<tr class="transition-colors hover:bg-surface-hover cursor-pointer" onclick={() => goto(`/purchases/${purchase.id}`)}>
										<td class="px-3 py-2.5 font-mono font-bold text-info whitespace-nowrap">{purchase.invoiceNumber}</td>
										<td class="px-3 py-2.5 font-medium text-text-primary max-w-[140px] truncate">
											{purchase.supplierName || purchase.supplierId || 'Supplier'}
										</td>
										<td class="px-3 py-2.5 text-right font-mono font-bold text-text-primary tabular-nums">
											₹{purchase.grandTotal.toFixed(2)}
										</td>
										<td class="px-3 py-2.5 text-center">
											<Badge
												variant={purchase.paymentStatus === 'paid' ? 'success' : purchase.paymentStatus === 'partial' ? 'warning' : 'danger'}
												size="sm"
											>
												{purchase.paymentStatus}
											</Badge>
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
{/if}
