<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	import { Navbar } from '$lib/components/layout';
	import { ToastContainer, Button } from '$lib/components/common';
	import { isSubscriptionActive } from '$lib/stores/appStore.svelte.js';
	import { page } from '$app/state';
	import { ShieldAlert } from '@lucide/svelte';

	let { children } = $props();

	let isSubActive = $derived(isSubscriptionActive());
	let currentPath = $derived(page.url.pathname);

	// Marketing routes have no topbar navigation and no subscription barrier
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
	<title>MedERP — Wholesale & Retail Medical Store System</title>
</svelte:head>

{#if isMarketing}
	<div class="min-h-screen bg-surface-secondary font-sans text-text-primary">
		{@render children()}
	</div>
	<ToastContainer />
{:else}
	<div class="min-h-screen w-full flex flex-col bg-[#f8fafc] font-sans text-slate-900 selection:bg-teal-100 selection:text-teal-900">
		<!-- Top Navigation Bar -->
		<Navbar />

		<!-- Main Content Area -->
		<main class="relative flex-1 p-4 pb-16 md:p-6 lg:p-8">
			<div class="mx-auto w-full max-w-[1600px]">
				{#if isLocked}
					<div
						class="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-md"
					>
						<div class="mb-4 rounded-full bg-rose-50 p-4 text-rose-600 border border-rose-100">
							<ShieldAlert size={48} />
						</div>
						<h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">
							Subscription Payment Required
						</h2>
						<p class="mt-2 max-w-md text-sm text-slate-500">
							As an authorized healthcare wholesale stockist, an active paid subscription is required to unlock clinical dispensing, inventory, and ledgers.
						</p>
						<div class="mt-6 flex gap-3">
							<a href="/subscription">
								<Button variant="royal" size="lg">Pay & Activate License</Button>
							</a>
						</div>
					</div>
				{:else}
					{@render children()}
				{/if}
			</div>
		</main>

		<!-- Toasts -->
		<ToastContainer />
	</div>
{/if}
