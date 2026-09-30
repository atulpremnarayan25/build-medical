<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/common';
	import {
		ShieldCheck,
		TrendingUp,
		Users,
		Activity,
		Cross,
		Box,
		LayoutDashboard
	} from '@lucide/svelte';

	let user = $derived(page.data.user);
</script>

<svelte:head>
	<title>MedStock ERP - Wholesale Pharmaceutical Management</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-surface-secondary text-text-primary">
	<!-- Navigation -->
	<header class="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-sm">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="flex h-16 items-center justify-between">
				<div class="flex items-center gap-2.5">
					<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-white shadow-2xs">
						<Cross class="h-5 w-5" />
					</div>
					<span class="text-lg font-bold tracking-tight text-text-primary">MedStock ERP</span>
				</div>
				<div class="flex items-center gap-3">
					{#if user}
						<span class="text-xs font-medium text-text-muted">Logged in as {user.name}</span>
						<a href="/dashboard">
							<Button variant="primary" size="sm">Go to Dashboard</Button>
						</a>
					{:else}
						<a
							href="/login"
							class="text-xs font-semibold text-text-secondary transition-colors hover:text-accent"
							>Log in</a
						>
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
		<div class="relative overflow-hidden border-b border-border bg-surface">
			<div class="mx-auto max-w-7xl">
				<div
					class="relative z-10 px-4 py-16 sm:px-6 sm:py-24 lg:w-full lg:max-w-2xl lg:px-8 lg:py-28"
				>
					<div class="text-center lg:text-left">
						<div
							class="mb-6 inline-flex items-center gap-1.5 rounded-full bg-accent-light px-3 py-1 text-xs font-bold text-accent"
						>
							<ShieldCheck class="h-3.5 w-3.5" /> Production Ready & Compliant
						</div>
						<h1
							class="text-3xl font-black tracking-tight text-text-primary sm:text-4xl md:text-5xl lg:text-5xl"
						>
							<span class="block">Wholesale Pharma</span>
							<span class="block text-accent">Management Made Easy</span>
						</h1>
						<p
							class="mt-4 max-w-xl text-sm leading-relaxed text-text-secondary sm:mx-auto sm:text-base lg:mx-0"
						>
							A comprehensive inventory, billing, and accounting ERP designed specifically for
							medical stockists. Track batches, expiries, GST, and ledgers in one unified workspace.
						</p>
						<div class="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
							{#if user}
								<a href="/dashboard">
									<Button
										variant="primary"
										size="lg"
										class="w-full sm:w-auto"
									>
										Go to Dashboard
									</Button>
								</a>
							{:else}
								<a href="/register">
									<Button
										variant="primary"
										size="lg"
										class="w-full sm:w-auto"
									>
										Create Stockist Account
									</Button>
								</a>
								<a href="/login">
									<Button
										variant="secondary"
										size="lg"
										class="w-full sm:w-auto"
									>
										Sign In
									</Button>
								</a>
							{/if}
						</div>
					</div>
				</div>
			</div>
			<!-- Hero Graphic / Mockup -->
			<div
				class="hidden bg-surface-secondary/60 p-12 lg:absolute lg:inset-y-0 lg:right-0 lg:flex lg:w-1/2 lg:items-center lg:justify-center"
			>
				<div
					class="relative flex aspect-[4/3] w-full max-w-lg items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-md"
				>
					<div class="flex h-full w-full flex-col gap-4">
						<div class="flex h-10 w-full items-center justify-between rounded-lg bg-accent-light/50 px-4">
							<div class="flex items-center gap-2">
								<div class="h-3 w-3 rounded-full bg-accent"></div>
								<div class="h-2.5 w-24 rounded-full bg-accent/40"></div>
							</div>
							<div class="h-2 w-12 rounded-full bg-accent/40"></div>
						</div>
						<div class="flex flex-1 gap-4 rounded-lg border border-border bg-surface-secondary p-4">
							<div class="flex w-1/3 flex-col gap-2.5">
								<div class="h-6 w-full rounded bg-surface border border-border"></div>
								<div class="h-6 w-full rounded bg-surface border border-border"></div>
								<div class="h-6 w-full rounded bg-surface border border-border"></div>
							</div>
							<div class="flex flex-1 flex-col gap-3">
								<div class="h-20 w-full rounded-lg border border-accent-light bg-accent-light/30 p-3">
									<div class="h-3 w-20 rounded bg-accent/60"></div>
									<div class="mt-2 h-4 w-12 rounded bg-accent font-mono"></div>
								</div>
								<div class="flex-1 rounded-lg border border-border bg-surface p-2">
									<div class="h-2 w-full rounded bg-border-subtle"></div>
									<div class="mt-1.5 h-2 w-3/4 rounded bg-border-subtle"></div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Features Section -->
		<div class="bg-surface-secondary py-16">
			<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div class="text-center">
					<h2 class="text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
						Everything you need to run your depot
					</h2>
					<p class="mx-auto mt-2 max-w-2xl text-xs text-text-muted">
						Purpose-built tools tailored for the strict compliance and efficiency demands of
						pharmaceutical distributors.
					</p>
				</div>

				<div class="mt-12">
					<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
						<div
							class="rounded-xl border border-border bg-surface p-6 shadow-2xs transition-all hover:border-accent/40 hover:shadow-xs"
						>
							<div
								class="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-light text-accent"
							>
								<Activity class="h-5 w-5" />
							</div>
							<h3 class="mb-1 text-base font-bold text-text-primary">FEFO Batch & Expiry</h3>
							<p class="text-xs leading-relaxed text-text-secondary">
								Automatically track inventory batches. First Expiry, First Out routing prevents
								write-offs and ensures product safety compliance before shipment.
							</p>
						</div>

						<div
							class="rounded-xl border border-border bg-surface p-6 shadow-2xs transition-all hover:border-accent/40 hover:shadow-xs"
						>
							<div
								class="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-light text-accent"
							>
								<TrendingUp class="h-5 w-5" />
							</div>
							<h3 class="mb-1 text-base font-bold text-text-primary">Keyboard-First Billing</h3>
							<p class="text-xs leading-relaxed text-text-secondary">
								Rapidly enter 100+ line item invoices with our high-speed thermal-print ready Point
								of Sale. Fully operable without ever touching a mouse.
							</p>
						</div>

						<div
							class="rounded-xl border border-border bg-surface p-6 shadow-2xs transition-all hover:border-accent/40 hover:shadow-xs"
						>
							<div
								class="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-light text-accent"
							>
								<Users class="h-5 w-5" />
							</div>
							<h3 class="mb-1 text-base font-bold text-text-primary">Ledger & Receivables</h3>
							<p class="text-xs leading-relaxed text-text-secondary">
								Manage outstanding balances, multiple credit limits, and payment cycles for retail
								pharmacies effortlessly. Drill down into individual party statements.
							</p>
						</div>

						<div
							class="rounded-xl border border-border bg-surface p-6 shadow-2xs transition-all hover:border-accent/40 hover:shadow-xs"
						>
							<div
								class="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-light text-accent"
							>
								<Box class="h-5 w-5" />
							</div>
							<h3 class="mb-1 text-base font-bold text-text-primary">Stock Adjustments</h3>
							<p class="text-xs leading-relaxed text-text-secondary">
								Handle shortages, returns, and damages seamlessly. Maintain an immutable audit trail
								of every stock deviation.
							</p>
						</div>

						<div
							class="rounded-xl border border-border bg-surface p-6 shadow-2xs transition-all hover:border-accent/40 hover:shadow-xs"
						>
							<div
								class="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-light text-accent"
							>
								<LayoutDashboard class="h-5 w-5" />
							</div>
							<h3 class="mb-1 text-base font-bold text-text-primary">Live Insights</h3>
							<p class="text-xs leading-relaxed text-text-secondary">
								A unified dashboard offers real-time business health indices, near-expiry alerts,
								low-stock warnings, and cash-flow projections at a glance.
							</p>
						</div>

						<div
							class="rounded-xl border border-border bg-surface p-6 shadow-2xs transition-all hover:border-accent/40 hover:shadow-xs"
						>
							<div
								class="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-light text-accent"
							>
								<ShieldCheck class="h-5 w-5" />
							</div>
							<h3 class="mb-1 text-base font-bold text-text-primary">Staff Access Control</h3>
							<p class="text-xs leading-relaxed text-text-secondary">
								Secure your books with granular roles: Operator, Manager, Accountant, and Admin.
								Restrict visibility while scaling your team.
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
				<span class="text-xs font-medium text-text-muted"
					>MedStock ERP &copy; 2026. All rights reserved.</span
				>
			</div>
			<div class="flex gap-4">
				<span class="text-xs text-text-muted"
					>Strictly for medical distribution and compliance workflows.</span
				>
			</div>
		</div>
	</footer>
</div>
