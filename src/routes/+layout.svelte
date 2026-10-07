<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	import { Sidebar, Topbar, BottomNav } from '$lib/components/layout';
	import { ToastContainer } from '$lib/components/common';
	import { isSidebarCollapsed } from '$lib/stores/appStore.svelte.js';
	import { page } from '$app/state';

	let { children } = $props();

	let currentPath = $derived(page.url.pathname);

	// Marketing routes have no sidebar/topbar
	let isMarketing = $derived(
		currentPath === '/' || currentPath.startsWith('/login') || currentPath.startsWith('/register')
	);
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
					{@render children()}
				</div>
			</main>
		</div>

		<!-- Toasts -->
		<BottomNav />
		<ToastContainer />
	</div>
{/if}
