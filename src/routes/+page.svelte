<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/common';
	import ThemeToggle from '$lib/components/common/ThemeToggle.svelte';
	import {
		ShieldCheck,
		TrendingUp,
		Users,
		Activity,
		Cross,
		Box,
		LayoutDashboard,
		Zap,
		Barcode,
		CheckCircle2,
		ArrowRight
	} from '@lucide/svelte';

	let user = $derived(page.data.user);
</script>

<svelte:head>
	<title>MedStock ERP - Wholesale Pharmaceutical Management</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-surface-secondary text-text-primary">
	<!-- Navigation -->
	<header class="sticky top-0 z-50 border-b border-border/80 bg-surface/90 backdrop-blur-md">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="flex h-16 items-center justify-between">
				<div class="flex items-center gap-2.5">
					<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white shadow-xs">
						<Cross class="h-5 w-5" />
					</div>
					<div class="flex flex-col">
						<span class="text-base font-bold tracking-tight text-text-primary">MedStock ERP</span>
						<span class="text-[10px] font-medium uppercase tracking-wider text-accent font-mono">Pharma Distribution</span>
					</div>
				</div>

				<div class="flex items-center gap-3">
					<ThemeToggle compact={true} />
					{#if user}
						<span class="hidden sm:inline-block text-xs font-medium text-text-muted">
							{user.name}
						</span>
						<a href="/dashboard">
							<Button variant="primary" size="sm">Go to Dashboard</Button>
						</a>
					{:else}
						<a
							href="/login"
							class="text-xs font-semibold text-text-secondary transition-colors hover:text-accent"
						>
							Log in
						</a>
						<a href="/register">
							<Button variant="primary" size="sm">Get Started</Button>
						</a>
					{/if}
				</div>
			</div>
		</div>
	</header>

	<!-- Hero Section -->
	<main class="flex-grow">
		<div class="relative overflow-hidden border-b border-border/70 bg-surface">
			<div class="mx-auto max-w-7xl">
				<div class="grid grid-cols-1 items-center gap-12 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-12 lg:px-8 lg:py-20">
					<!-- Hero Text -->
					<div class="text-center lg:col-span-6 lg:text-left">
						<div class="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-light/50 px-3.5 py-1 text-xs font-semibold text-accent shadow-2xs">
							<ShieldCheck class="h-3.5 w-3.5" />
							<span>Offline-First LAN Appliance • Form 35 Compliant</span>
						</div>

						<h1 class="text-3xl font-black tracking-tight text-text-primary sm:text-4xl md:text-5xl lg:text-5xl leading-tight">
							Wholesale Pharma
							<span class="block text-accent">Management System</span>
						</h1>

						<p class="mt-4 max-w-xl text-sm leading-relaxed text-text-secondary sm:mx-auto lg:mx-0">
							High-speed counter billing, FEFO batch expiry intelligence, dual-party Khata ledger, and statutory GST filings in one offline-resilient workspace.
						</p>

						<div class="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
							{#if user}
								<a href="/dashboard">
									<Button variant="primary" size="lg" class="w-full sm:w-auto">
										<span>Open Dashboard</span>
										<ArrowRight class="h-4 w-4 ml-1" />
									</Button>
								</a>
							{:else}
								<a href="/register">
									<Button variant="primary" size="lg" class="w-full sm:w-auto">
										<span>Create Stockist Account</span>
										<ArrowRight class="h-4 w-4 ml-1" />
									</Button>
								</a>
								<a href="/login">
									<Button variant="secondary" size="lg" class="w-full sm:w-auto">
										Sign In
									</Button>
								</a>
							{/if}
						</div>

						<div class="mt-8 flex items-center justify-center gap-6 text-xs text-text-muted lg:justify-start">
							<div class="flex items-center gap-1.5">
								<CheckCircle2 class="h-4 w-4 text-accent" />
								<span>Zero-Internet Ready</span>
							</div>
							<div class="flex items-center gap-1.5">
								<CheckCircle2 class="h-4 w-4 text-accent" />
								<span>Schedule H1 Auditing</span>
							</div>
							<div class="flex items-center gap-1.5">
								<CheckCircle2 class="h-4 w-4 text-accent" />
								<span>Multi-Counter LAN</span>
							</div>
						</div>
					</div>

					<!-- Authentic High-Fidelity POS Terminal Preview Card -->
					<div class="lg:col-span-6">
						<div class="bezel-outer max-w-lg mx-auto shadow-xl">
							<div class="bezel-inner p-4 sm:p-5">
								<!-- Window Titlebar -->
								<div class="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
									<div class="flex items-center gap-2">
										<div class="h-3 w-3 rounded-full bg-danger/80"></div>
										<div class="h-3 w-3 rounded-full bg-warning/80"></div>
										<div class="h-3 w-3 rounded-full bg-success/80"></div>
										<span class="ml-2 text-xs font-mono font-semibold text-text-primary">POS Terminal • Counter 01</span>
									</div>
									<div class="flex items-center gap-1.5 text-[11px] font-mono text-accent bg-accent-light/50 px-2 py-0.5 rounded border border-accent/20">
										<span class="h-2 w-2 rounded-full bg-accent animate-pulse"></span>
										<span>STANDALONE</span>
									</div>
								</div>

								<!-- Barcode Scan Bar Mockup -->
								<div class="mb-3 flex items-center justify-between rounded-lg border border-accent/30 bg-accent-light/20 px-3 py-2 text-xs font-mono text-accent">
									<div class="flex items-center gap-2">
										<Barcode class="h-4 w-4 shrink-0" />
										<span class="font-semibold">SCAN [F1]: 8901030018821</span>
									</div>
									<span class="rounded bg-accent text-white px-1.5 py-0.5 text-[10px] font-bold">MATCHED</span>
								</div>

								<!-- Live Line Items Table Mockup -->
								<div class="overflow-hidden rounded-lg border border-border/80 bg-surface mb-3">
									<table class="w-full text-left text-xs tabular-nums">
										<thead class="bg-surface-secondary/80 text-[10px] uppercase font-semibold text-text-muted border-b border-border/60">
											<tr>
												<th class="py-1.5 px-2.5">Item & Formulation</th>
												<th class="py-1.5 px-2 text-center">Batch / Exp</th>
												<th class="py-1.5 px-2 text-right">Qty</th>
												<th class="py-1.5 px-2.5 text-right">Amount</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-border/40 text-xs">
											<tr>
												<td class="py-2 px-2.5">
													<div class="font-semibold text-text-primary">Paracetamol 650mg</div>
													<div class="text-[10px] text-text-muted">Dolo-650 (Micro Labs)</div>
												</td>
												<td class="py-2 px-2 text-center font-mono text-[11px]">
													<span class="text-text-secondary">DL-9082</span>
													<span class="text-text-muted block text-[10px]">08/27</span>
												</td>
												<td class="py-2 px-2 text-right font-mono font-medium">20</td>
												<td class="py-2 px-2.5 text-right font-mono font-semibold text-text-primary">₹650.00</td>
											</tr>
											<tr class="bg-schedule-h1-light/20">
												<td class="py-2 px-2.5">
													<div class="flex items-center gap-1.5">
														<span class="font-semibold text-text-primary">Amoxicillin + Clav 625</span>
														<span class="rounded bg-schedule-h1 text-white px-1 py-0.2 text-[9px] font-bold">H1</span>
													</div>
													<div class="text-[10px] text-schedule-h1 font-medium">Dr. R. Sharma (Req)</div>
												</td>
												<td class="py-2 px-2 text-center font-mono text-[11px]">
													<span class="text-text-secondary">AX-4411</span>
													<span class="text-text-muted block text-[10px]">11/26</span>
												</td>
												<td class="py-2 px-2 text-right font-mono font-medium">10</td>
												<td class="py-2 px-2.5 text-right font-mono font-semibold text-text-primary">₹1,280.00</td>
											</tr>
											<tr>
												<td class="py-2 px-2.5">
													<div class="font-semibold text-text-primary">Pantoprazole 40mg</div>
													<div class="text-[10px] text-text-muted">Pan-40 (Alkem)</div>
												</td>
												<td class="py-2 px-2 text-center font-mono text-[11px]">
													<span class="text-text-secondary">PT-1033</span>
													<span class="text-text-muted block text-[10px]">03/27</span>
												</td>
												<td class="py-2 px-2 text-right font-mono font-medium">15</td>
												<td class="py-2 px-2.5 text-right font-mono font-semibold text-text-primary">₹1,260.00</td>
											</tr>
										</tbody>
									</table>
								</div>

								<!-- Financial Calculation Footer Mockup -->
								<div class="rounded-lg border border-border/80 bg-surface-secondary/70 p-3">
									<div class="flex items-center justify-between text-xs text-text-muted pb-1 border-b border-border/40 font-mono">
										<span>Items: 3 | Total Units: 45</span>
										<span>GST (12%): ₹382.80</span>
									</div>
									<div class="mt-2 flex items-center justify-between">
										<div>
											<span class="text-[10px] uppercase font-bold tracking-wider text-text-muted">Net Payable</span>
											<div class="text-lg font-black font-mono tracking-tight text-accent">₹3,572.80</div>
										</div>
										<button type="button" class="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-xs">
											<Zap class="h-3.5 w-3.5" />
											<span>Tender [F4]</span>
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Features Section with Double-Bezel Cards -->
		<div class="bg-surface-secondary py-16">
			<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div class="text-center">
					<h2 class="text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
						Engineered for Commercial Pharmacy Depots
					</h2>
					<p class="mx-auto mt-2 max-w-2xl text-xs text-text-muted">
						Every workflow is calibrated for high-throughput counters, regulatory audits, and offline reliability.
					</p>
				</div>

				<div class="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					<div class="bezel-outer">
						<div class="bezel-inner p-5">
							<div class="mb-3.5 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-light text-accent">
								<Activity class="h-5 w-5" />
							</div>
							<h3 class="mb-1 text-base font-bold text-text-primary">FEFO Batch & Expiry</h3>
							<p class="text-xs leading-relaxed text-text-secondary">
								First Expiry, First Out routing prevents write-offs and ensures product safety compliance before shipment with color-coded risk alerts.
							</p>
						</div>
					</div>

					<div class="bezel-outer">
						<div class="bezel-inner p-5">
							<div class="mb-3.5 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-light text-accent">
								<TrendingUp class="h-5 w-5" />
							</div>
							<h3 class="mb-1 text-base font-bold text-text-primary">Keyboard-First Billing</h3>
							<p class="text-xs leading-relaxed text-text-secondary">
								Rapidly enter 100+ line item invoices with our high-speed thermal-ready POS. Complete an entire sale using only F1–F12 hotkeys.
							</p>
						</div>
					</div>

					<div class="bezel-outer">
						<div class="bezel-inner p-5">
							<div class="mb-3.5 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-light text-accent">
								<Users class="h-5 w-5" />
							</div>
							<h3 class="mb-1 text-base font-bold text-text-primary">Dual-Party Khata Ledger</h3>
							<p class="text-xs leading-relaxed text-text-secondary">
								Manage outstanding balances, credit limits, and FIFO voucher settlement for retail pharmacies and distributors with instant audit trails.
							</p>
						</div>
					</div>

					<div class="bezel-outer">
						<div class="bezel-inner p-5">
							<div class="mb-3.5 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-light text-accent">
								<Box class="h-5 w-5" />
							</div>
							<h3 class="mb-1 text-base font-bold text-text-primary">Goods Received Notes (GRN)</h3>
							<p class="text-xs leading-relaxed text-text-secondary">
								Streamlined inward shipment entry with dual purchase rate checks, automatic batch extraction, and supplier balance credit updates.
							</p>
						</div>
					</div>

					<div class="bezel-outer">
						<div class="bezel-inner p-5">
							<div class="mb-3.5 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-light text-accent">
								<LayoutDashboard class="h-5 w-5" />
							</div>
							<h3 class="mb-1 text-base font-bold text-text-primary">Statutory Tax & Form 35</h3>
							<p class="text-xs leading-relaxed text-text-secondary">
								Generate Drug Inspector-ready Schedule H1 narcotic registers and GSTR-1 B2B/B2C summaries with single-click CSV export.
							</p>
						</div>
					</div>

					<div class="bezel-outer">
						<div class="bezel-inner p-5">
							<div class="mb-3.5 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-light text-accent">
								<ShieldCheck class="h-5 w-5" />
							</div>
							<h3 class="mb-1 text-base font-bold text-text-primary">Multi-Terminal LAN Pairing</h3>
							<p class="text-xs leading-relaxed text-text-secondary">
								Pair counter cashiers and secondary tablet terminals over local WiFi via QR Code without requiring an internet connection.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</main>

	<!-- Footer -->
	<footer class="border-t border-border bg-surface">
		<div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
			<div class="flex items-center gap-2">
				<Cross class="h-4 w-4 text-accent" />
				<span class="text-xs font-medium text-text-muted">
					MedStock ERP &copy; 2026. All rights reserved.
				</span>
			</div>
			<div class="flex gap-4">
				<span class="text-xs text-text-muted">
					Strictly for medical distribution and compliance workflows.
				</span>
			</div>
		</div>
	</footer>
</div>
