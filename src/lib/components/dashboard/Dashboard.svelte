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
		SlidersHorizontal,
		Shield
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
	<div class="space-y-6">
		<!-- Axiscare Portal Header Banner (Signature Gradient from Reference) -->
		<div
			class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#196575] via-[#298699] to-[#61b6c6] p-6 sm:p-7 text-white shadow-lg"
		>
			<div
				class="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl"
			></div>

			<div class="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
				<div>
					<div
						class="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold tracking-wider uppercase text-white backdrop-blur-xs border border-white/20 mb-2.5"
					>
						<Shield size={13} class="text-teal-200" />
						<span>Axiscare Clinical & Wholesale Hub</span>
					</div>
					<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
						Welcome to Axiscare Portal
					</h1>
					<p class="mt-1.5 text-xs sm:text-sm text-teal-50/90 max-w-xl">
						Monitor real-time patient dispensing, supplier inward GRN, batch expiries, and store ledgers.
					</p>
				</div>

				<div class="flex flex-wrap items-center gap-3">
					<button
						type="button"
						onclick={() => goto('/sales/new')}
						class="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#2dd4bf] px-4 py-2.5 text-xs font-bold text-slate-900 shadow-md hover:bg-teal-300 active:scale-95 transition-all"
					>
						<Receipt size={16} />
						<span>+ New Sale Bill</span>
					</button>
					<button
						type="button"
						onclick={() => goto('/purchases/new')}
						class="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-xs hover:bg-white/25 active:scale-95 transition-all"
					>
						<Package size={16} />
						<span>+ Inward Stock</span>
					</button>
				</div>
			</div>
		</div>

		<!-- Top Financial KPIs (Styled as reference cards) -->
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<!-- Today's Sales -->
			<div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md transition-shadow">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Sales</span>
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
						<TrendingUp size={18} />
					</div>
				</div>
				<div class="mt-3">
					<span class="font-mono text-2xl font-extrabold text-slate-900 tabular-nums">
						₹{summary.todaySalesTotal.toLocaleString('en-IN', {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2
						})}
					</span>
				</div>
				<div class="mt-1 text-xs text-slate-500 font-medium">
					{summary.todaySalesCount} invoices ({summary.itemsSold} units)
				</div>
			</div>

			<!-- Today's Purchases -->
			<div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md transition-shadow">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Inward</span>
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
						<ShoppingCart size={18} />
					</div>
				</div>
				<div class="mt-3">
					<span class="font-mono text-2xl font-extrabold text-slate-900 tabular-nums">
						₹{summary.todayPurchasesTotal.toLocaleString('en-IN', {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2
						})}
					</span>
				</div>
				<div class="mt-1 text-xs text-slate-500 font-medium">
					{summary.todayPurchasesCount} inward GRNs
				</div>
			</div>

			<!-- Total Receivables -->
			<div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md transition-shadow">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding Receivables</span>
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
						<ArrowDownRight size={18} />
					</div>
				</div>
				<div class="mt-3">
					<span class="font-mono text-2xl font-extrabold text-slate-900 tabular-nums">
						₹{summary.receivables.toLocaleString('en-IN', {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2
						})}
					</span>
				</div>
				<div class="mt-1 text-xs text-emerald-600 font-medium">
					From chemists & patients
				</div>
			</div>

			<!-- Total Payables -->
			<div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md transition-shadow">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payables Due</span>
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
						<ArrowUpRight size={18} />
					</div>
				</div>
				<div class="mt-3">
					<span class="font-mono text-2xl font-extrabold text-slate-900 tabular-nums">
						₹{summary.payables.toLocaleString('en-IN', {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2
						})}
					</span>
				</div>
				<div class="mt-1 text-xs text-amber-600 font-medium">
					To medicine distributors
				</div>
			</div>
		</div>

		<!-- Middle layer: Stock Alerts & Quick Actions (Axiscare Card Style) -->
		<div class="grid grid-cols-1 gap-5 lg:grid-cols-12">
			<!-- Stock Alerts Panel (Approx 70% width) -->
			<div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs lg:col-span-8 flex flex-col justify-between">
				<div class="flex items-center justify-between mb-4">
					<div class="flex items-center gap-2">
						<span class="h-2 w-2 rounded-full bg-teal-600"></span>
						<h3 class="text-sm font-bold text-slate-900 tracking-tight">Real-Time Stock Alerts</h3>
					</div>
					<a href="/inventory/batches" class="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 transition-colors">
						<span>Batches Directory</span>
						<ArrowRight size={13} />
					</a>
				</div>

				<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
					<!-- Out of stock -->
					<a
						href="/inventory/products"
						class="flex flex-col items-center justify-center rounded-2xl border border-red-200/80 bg-red-50/70 py-4 px-3 text-center transition-all hover:bg-red-100/80 hover:shadow-xs group"
					>
						<div class="mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-600 group-hover:scale-110 transition-transform">
							<AlertTriangle size={18} />
						</div>
						<span class="font-mono text-2xl font-extrabold text-red-700 tabular-nums">
							{stockAlerts.outOfStock}
						</span>
						<span class="mt-1 text-[10px] font-bold tracking-wider text-red-600 uppercase">
							OUT OF STOCK
						</span>
					</a>

					<!-- Low stock -->
					<a
						href="/inventory/batches"
						class="flex flex-col items-center justify-center rounded-2xl border border-amber-200/80 bg-amber-50/70 py-4 px-3 text-center transition-all hover:bg-amber-100/80 hover:shadow-xs group"
					>
						<div class="mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 group-hover:scale-110 transition-transform">
							<PackageOpen size={18} />
						</div>
						<span class="font-mono text-2xl font-extrabold text-amber-800 tabular-nums">
							{stockAlerts.lowStock}
						</span>
						<span class="mt-1 text-[10px] font-bold tracking-wider text-amber-700 uppercase">
							LOW STOCK
						</span>
					</a>

					<!-- Near Expiry -->
					<a
						href="/inventory/batches"
						class="flex flex-col items-center justify-center rounded-2xl border border-orange-200/80 bg-orange-50/70 py-4 px-3 text-center transition-all hover:bg-orange-100/80 hover:shadow-xs group"
					>
						<div class="mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-700 group-hover:scale-110 transition-transform">
							<Clock size={18} />
						</div>
						<span class="font-mono text-2xl font-extrabold text-orange-800 tabular-nums">
							{stockAlerts.nearExpiry}
						</span>
						<span class="mt-1 text-[10px] font-bold tracking-wider text-orange-700 uppercase">
							NEAR EXPIRY
						</span>
					</a>

					<!-- Expired -->
					<a
						href="/inventory/batches"
						class="flex flex-col items-center justify-center rounded-2xl border border-rose-200/80 bg-rose-50/70 py-4 px-3 text-center transition-all hover:bg-rose-100/80 hover:shadow-xs group"
					>
						<div class="mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700 group-hover:scale-110 transition-transform">
							<AlertTriangle size={18} />
						</div>
						<span class="font-mono text-2xl font-extrabold text-rose-800 tabular-nums">
							{stockAlerts.expired}
						</span>
						<span class="mt-1 text-[10px] font-bold tracking-wider text-rose-700 uppercase">
							EXPIRED
						</span>
					</a>
				</div>
			</div>

			<!-- Quick Actions Panel (Approx 30% width) -->
			<div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs lg:col-span-4 flex flex-col justify-between">
				<div class="flex items-center gap-2 mb-3">
					<span class="h-2 w-2 rounded-full bg-blue-600"></span>
					<h3 class="text-sm font-bold text-slate-900 tracking-tight">Express Actions</h3>
				</div>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
					<a
						href="/customers/new"
						class="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition-all hover:border-teal-300 hover:bg-teal-50/50 hover:text-teal-900 active:scale-98"
					>
						<div class="flex items-center gap-2.5">
							<div class="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
								<UserPlus size={14} />
							</div>
							<span>Add New Client / Clinic</span>
						</div>
						<ArrowRight size={13} class="text-slate-400" />
					</a>

					<a
						href="/suppliers/new"
						class="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition-all hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-900 active:scale-98"
					>
						<div class="flex items-center gap-2.5">
							<div class="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
								<Truck size={14} />
							</div>
							<span>Add Pharma Supplier</span>
						</div>
						<ArrowRight size={13} class="text-slate-400" />
					</a>

					<a
						href="/payments/receive"
						class="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition-all hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-900 active:scale-98"
					>
						<div class="flex items-center gap-2.5">
							<div class="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
								<CreditCard size={14} />
							</div>
							<span>Record Payment Receipt</span>
						</div>
						<ArrowRight size={13} class="text-slate-400" />
					</a>

					<a
						href="/inventory/stock-adjustments/new"
						class="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition-all hover:border-purple-300 hover:bg-purple-50/50 hover:text-purple-900 active:scale-98"
					>
						<div class="flex items-center gap-2.5">
							<div class="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
								<SlidersHorizontal size={14} />
							</div>
							<span>Stock Adjustment / Audit</span>
						</div>
						<ArrowRight size={13} class="text-slate-400" />
					</a>
				</div>
			</div>
		</div>

		<!-- Bottom layer: Recent Sales & Recent Purchases Grid -->
		<div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
			<!-- Recent Sales Card -->
			<div class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
				<div class="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
					<div class="flex items-center gap-2">
						<div class="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-white text-[11px] font-bold">
							<Receipt size={12} />
						</div>
						<h3 class="text-sm font-bold text-slate-900">Recent Invoices</h3>
					</div>
					<a href="/sales" class="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors">
						<span>View All</span>
						<ArrowRight size={12} />
					</a>
				</div>
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs">
						<thead class="border-b border-slate-100 bg-slate-50/40 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
							<tr>
								<th class="px-4 py-3">INV NO</th>
								<th class="px-4 py-3">CUSTOMER / CLIENT</th>
								<th class="px-4 py-3 text-right">AMOUNT</th>
								<th class="px-4 py-3 text-center">STATUS</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100">
							{#if recentSales.length === 0}
								<tr>
									<td colspan="4" class="px-4 py-8 text-center text-xs text-slate-400">No recent sales records.</td>
								</tr>
							{:else}
								{#each recentSales as sale (sale.id)}
									<tr class="transition-colors hover:bg-teal-50/40 cursor-pointer" onclick={() => goto(`/sales/${sale.id}`)}>
										<td class="px-4 py-3 font-mono font-bold text-teal-700 whitespace-nowrap">{sale.invoiceNumber}</td>
										<td class="px-4 py-3 font-medium text-slate-800 max-w-[150px] truncate">
											{sale.customerName || sale.customerId || 'Walk-in Customer'}
										</td>
										<td class="px-4 py-3 text-right font-mono font-bold text-slate-900 tabular-nums">
											₹{sale.grandTotal.toFixed(2)}
										</td>
										<td class="px-4 py-3 text-center">
											<Badge
												variant={sale.paymentStatus === 'paid' ? 'success' : sale.paymentStatus === 'partial' ? 'warning' : 'danger'}
												size="sm"
												dot
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

			<!-- Recent Purchases Card -->
			<div class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
				<div class="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
					<div class="flex items-center gap-2">
						<div class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-bold">
							<ShoppingCart size={12} />
						</div>
						<h3 class="text-sm font-bold text-slate-900">Recent Inward Purchases</h3>
					</div>
					<a href="/purchases" class="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
						<span>View All</span>
						<ArrowRight size={12} />
					</a>
				</div>
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs">
						<thead class="border-b border-slate-100 bg-slate-50/40 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
							<tr>
								<th class="px-4 py-3">GRN NO</th>
								<th class="px-4 py-3">PHARMA SUPPLIER</th>
								<th class="px-4 py-3 text-right">AMOUNT</th>
								<th class="px-4 py-3 text-center">STATUS</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100">
							{#if recentPurchases.length === 0}
								<tr>
									<td colspan="4" class="px-4 py-8 text-center text-xs text-slate-400">No inward purchase records.</td>
								</tr>
							{:else}
								{#each recentPurchases as purchase (purchase.id)}
									<tr class="transition-colors hover:bg-blue-50/40 cursor-pointer" onclick={() => goto(`/purchases/${purchase.id}`)}>
										<td class="px-4 py-3 font-mono font-bold text-blue-700 whitespace-nowrap">{purchase.invoiceNumber}</td>
										<td class="px-4 py-3 font-medium text-slate-800 max-w-[150px] truncate">
											{purchase.supplierName || purchase.supplierId || 'Supplier Distributor'}
										</td>
										<td class="px-4 py-3 text-right font-mono font-bold text-slate-900 tabular-nums">
											₹{purchase.grandTotal.toFixed(2)}
										</td>
										<td class="px-4 py-3 text-center">
											<Badge
												variant={purchase.paymentStatus === 'paid' ? 'success' : purchase.paymentStatus === 'partial' ? 'warning' : 'danger'}
												size="sm"
												dot
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
