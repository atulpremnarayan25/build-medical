<script lang="ts">
	import { page } from '$app/state';
	import {
		isSidebarCollapsed,
		isSidebarOpen,
		setSidebarOpen,
		isSubscriptionActive
	} from '$lib/stores/appStore.svelte.js';
	import {
		LayoutDashboard,
		ShoppingCart,
		Package,
		Warehouse,
		Users,
		Truck,
		CreditCard,
		Undo2,
		BarChart3,
		Settings,
		ShieldCheck,
		X
	} from '@lucide/svelte';
	import type { Component } from 'svelte';

	let activeSub = $derived(isSubscriptionActive());

	interface NavItem {
		label: string;
		href: string;
		icon: Component;
		badge?: string;
	}

	let navItems = $derived<NavItem[]>([
		{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
		{ label: 'Sales', href: '/sales', icon: ShoppingCart },
		{ label: 'Purchases', href: '/purchases', icon: Package },
		{ label: 'Inventory', href: '/inventory', icon: Warehouse },
		{ label: 'Customers', href: '/customers', icon: Users },
		{ label: 'Suppliers', href: '/suppliers', icon: Truck },
		{ label: 'Payments', href: '/payments', icon: CreditCard },
		{ label: 'Returns', href: '/returns', icon: Undo2 },
		{ label: 'Reports', href: '/reports', icon: BarChart3 },
		{ label: 'Settings', href: '/settings', icon: Settings },
		{
			label: 'Subscription',
			href: '/subscription',
			icon: ShieldCheck,
			badge: activeSub ? undefined : 'PAY'
		}
	]);

	function isActive(href: string): boolean {
		const pathname = page.url.pathname;
		if (href === '/') return pathname === '/';
		return pathname.startsWith(href);
	}

	function handleOverlayClick() {
		setSidebarOpen(false);
	}

	function handleNavClick() {
		// Close mobile overlay on navigation
		if (isSidebarOpen()) {
			setSidebarOpen(false);
		}
	}
</script>

<!-- Mobile overlay backdrop -->
{#if isSidebarOpen()}
	<div
		class="fixed inset-0 z-40 bg-black/50 lg:hidden"
		onclick={handleOverlayClick}
		onkeydown={(e) => e.key === 'Escape' && handleOverlayClick()}
		role="button"
		tabindex="-1"
		aria-label="Close sidebar"
	></div>
{/if}

<!-- Sidebar -->
<aside
	class="fixed top-0 left-0 z-50 flex h-full flex-col bg-sidebar transition-all duration-200 ease-in-out
		{isSidebarCollapsed() ? 'w-16' : 'w-60'}
		{isSidebarOpen() ? 'translate-x-0' : '-translate-x-full'}
		lg:translate-x-0"
>
	<!-- Logo area -->
	<div class="flex h-14 shrink-0 items-center border-b border-white/10 px-4">
		{#if !isSidebarCollapsed()}
			<span class="text-lg font-bold tracking-tight text-white">MedStock</span>
		{:else}
			<span class="mx-auto text-lg font-bold text-white">M</span>
		{/if}

		<!-- Mobile close button -->
		<button
			class="ml-auto rounded p-1 text-sidebar-text hover:text-white lg:hidden"
			onclick={() => setSidebarOpen(false)}
			aria-label="Close sidebar"
		>
			<X size={18} />
		</button>
	</div>

	<!-- Navigation -->
	<nav class="flex-1 overflow-y-auto px-2 py-3" aria-label="Main navigation">
		<ul class="flex flex-col gap-0.5">
			{#each navItems as item (item.href)}
				{@const active = isActive(item.href)}
				<li>
					<a
						href={item.href}
						onclick={handleNavClick}
						class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all
							{active
							? 'bg-blue-600 text-white font-semibold shadow-xs'
							: 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active'}
							{isSidebarCollapsed() ? 'justify-center px-0' : ''}"
						aria-current={active ? 'page' : undefined}
						title={isSidebarCollapsed() ? item.label : undefined}
					>
						<item.icon size={20} />
						{#if !isSidebarCollapsed()}
							<span class="flex-1 text-left">{item.label}</span>
							{#if item.badge}
								<span
									class="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase"
								>
									{item.badge}
								</span>
							{/if}
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<!-- Bottom branding -->
	{#if !isSidebarCollapsed()}
		<div class="shrink-0 border-t border-white/10 px-4 py-3">
			<p class="text-xs text-sidebar-text/60">BuildMedical ERP</p>
		</div>
	{/if}
</aside>
