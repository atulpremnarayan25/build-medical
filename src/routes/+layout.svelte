<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	import { Sidebar, Topbar, BottomNav } from '$lib/components/layout';
	import { ToastContainer, Button } from '$lib/components/common';
	import { isSidebarCollapsed, isSubscriptionActive } from '$lib/stores/appStore.svelte.js';
	import { page } from '$app/state';
	import { Lock, ShieldAlert } from '@lucide/svelte';

	let { children } = $props();

	let isSubActive = $derived(isSubscriptionActive());
	let currentPath = $derived(page.url.pathname);

	// Marketing routes have no sidebar/topbar and no subscription barrier
	let isMarketing = $derived(
		currentPath === '/' || currentPath.startsWith('/login') || currentPath.startsWith('/register')
	);

	// Unrestricted routes within the app shell (like logout, subscription portal)
	let isUnrestrictedAppRoute = $derived(
		currentPath.startsWith('/subscription') || currentPath.startsWith('/logout')
	);

	let isLocked = $derived(!isSubActive && !isUnrestrictedAppRoute);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>MedStock ERP</title>
</svelte:head>

{#if isMarketing}
	<div class="min-h-screen bg-surface-secondary font-sans text-text-primary">
		{@render children()}
	</div>
	<ToastContainer />
{:else}
	<div
		class="flex h-screen w-full overflow-hidden bg-surface-secondary font-sans text-text-primary"
	>
		<!-- Sidebar -->
		<Sidebar />

		<div
			class="flex min-w-0 flex-1 flex-col transition-all duration-200 ease-in-out {isSidebarCollapsed()
				? 'lg:pl-16'
				: 'lg:pl-60'}"
		>
			<!-- Topbar -->
			<Topbar />

			<!-- Main Content -->
			<main class="relative flex-1 overflow-y-auto p-4 pb-20 md:p-6 lg:p-8 lg:pb-8">
				<div class="mx-auto h-full max-w-7xl">
					{#if isLocked}
						<div
							class="flex h-full min-h-[400px] flex-col items-center justify-center rounded-xl border border-danger-light bg-surface p-8 text-center shadow-lg"
						>
							<div
								class="mb-4 rounded-full bg-danger-light p-4 text-danger"
							>
								<ShieldAlert size={48} />
							</div>
							<h2 class="text-2xl font-bold text-text-primary">
								Subscription Payment Required
							</h2>
							<p class="mt-2 max-w-md text-sm text-text-secondary">
								As a wholesaler stockist, you must have an active paid subscription to use
								inventory, billing, sales, and ledger functions.
							</p>
							<div class="mt-6 flex gap-3">
								<a href="/subscription">
									<Button variant="primary" size="lg">Pay & Activate License</Button>
								</a>
							</div>
						</div>
					{:else}
						{@render children()}
					{/if}
				</div>
			</main>
		</div>

		<!-- Toasts -->
		<BottomNav />
		<ToastContainer />
	</div>
{/if}
