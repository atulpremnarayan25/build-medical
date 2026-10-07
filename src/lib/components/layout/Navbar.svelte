<script lang="ts">
	import { page } from '$app/state';
	import {
		getSyncStatus,
		getPendingChanges,
		isSidebarOpen,
		setSidebarOpen,
		isSubscriptionActive
	} from '$lib/stores/appStore.svelte.js';
	import GlobalSearch from '../common/GlobalSearch.svelte';
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
		AlertTriangle,
		Bell,
		LogOut,
		ChevronDown,
		Receipt,
		Menu,
		X,
		Plus,
		Cross
	} from '@lucide/svelte';
	import type { Component } from 'svelte';
	import type { SyncStatus } from '$lib/types/app.js';

	let userMenuOpen = $state(false);
	let notificationsOpen = $state(false);

	let subActive = $derived(isSubscriptionActive());
	let user = $derived(page.data?.user || { name: 'System Admin', role: 'Admin' });
	let notifications = $derived<string[]>(page.data?.notifications || []);

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
			badge: subActive ? undefined : 'PAY'
		}
	]);

	const syncConfig: Record<SyncStatus, { color: string; label: string }> = {
		synced: { color: 'bg-success', label: 'Synced' },
		offline: { color: 'bg-text-muted', label: 'Offline' },
		syncing: { color: 'bg-info animate-pulse', label: 'Syncing...' },
		pending: { color: 'bg-warning', label: 'Pending' },
		error: { color: 'bg-danger', label: 'Sync error' }
	};

	let sync = $derived(syncConfig[getSyncStatus()] || syncConfig.synced);
	let pending = $derived(getPendingChanges());

	function isActive(href: string): boolean {
		const pathname = page.url.pathname;
		if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
		return pathname.startsWith(href);
	}

	function closeUserMenu() {
		userMenuOpen = false;
	}

	function handleMobileNavClick() {
		setSidebarOpen(false);
	}
</script>

<svelte:window
	onclick={(e) => {
		const target = e.target as HTMLElement;
		if (userMenuOpen && !target.closest('[data-user-menu]')) {
			closeUserMenu();
		}
		if (notificationsOpen && !target.closest('[data-notifications-menu]')) {
			notificationsOpen = false;
		}
	}}
/>

<!-- Top Navigation Bar Container (Sticky at top) -->
<header
	class="sticky top-0 z-40 w-full border-b border-border bg-surface/95 backdrop-blur-md shadow-2xs"
>
	<!-- Tier 1: Brand, Search, Status & Profile Actions -->
	<div class="border-b border-border/50 px-3 sm:px-6">
		<div class="flex h-14 w-full items-center justify-between gap-2 sm:gap-4">
			<!-- Left: Mobile Toggle & Brand Logo -->
			<div class="flex items-center gap-3">
				<!-- Mobile Menu Toggle Button -->
				<button
					class="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-secondary text-text-secondary hover:bg-surface-hover hover:text-text-primary lg:hidden"
					onclick={() => setSidebarOpen(!isSidebarOpen())}
					aria-label={isSidebarOpen() ? 'Close navigation' : 'Open navigation'}
				>
					{#if isSidebarOpen()}
						<X size={18} />
					{:else}
						<Menu size={18} />
					{/if}
				</button>

				<!-- Brand Logo -->
				<a href="/dashboard" class="flex items-center gap-2.5 transition-opacity hover:opacity-90">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-white shadow-xs ring-2 ring-teal-100"
					>
						<Plus size={18} strokeWidth={3} />
					</div>
					<div class="flex items-center gap-1.5">
						<span class="text-base font-bold tracking-tight text-teal-950">MedERP</span>
						<span
							class="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-teal-700 uppercase border border-teal-200"
						>
							Store Portal
						</span>
					</div>
				</a>
			</div>

			<!-- Center: Global Search Bar -->
			<div class="flex-1 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-2 sm:mx-4">
				<GlobalSearch />
			</div>

			<!-- Right: Quick Actions & Status -->
			<div class="flex items-center gap-2 sm:gap-2.5">

				<!-- Quick Billing Action -->
				<a
					href="/sales/new"
					class="hidden items-center gap-1.5 rounded-lg bg-[#1d4ed8] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-blue-700 active:scale-95 sm:flex min-h-[38px]"
					title="Open High-Speed Billing Terminal (Sale)"
				>
					<Receipt size={14} />
					<span>New Bill</span>
				</a>

				<!-- Subscription Status Badge -->
				<a
					href="/subscription"
					class="hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors sm:flex
					{subActive
						? 'bg-success-light text-success hover:opacity-90'
						: 'bg-danger-light text-danger hover:opacity-90'}"
					title={subActive ? 'Subscription Active' : 'Subscription Expired - Click to Pay'}
				>
					{#if subActive}
						<ShieldCheck size={14} />
						<span>Subscribed</span>
					{:else}
						<AlertTriangle size={14} />
						<span>Pay to Unlock</span>
					{/if}
				</a>

				<!-- Live Sync Status -->
				<div
					class="hidden items-center gap-1.5 text-xs text-text-secondary md:flex"
					title={pending > 0 ? `${pending} pending changes` : sync.label}
				>
					<span class="h-2 w-2 rounded-full {sync.color}"></span>
					<span class="font-medium">{sync.label}</span>
				</div>

				<!-- Notifications Bell -->
				<div class="relative" data-notifications-menu>
					<button
						class="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
						aria-label="Notifications ({notifications.length} unread)"
						onclick={() => {
							notificationsOpen = !notificationsOpen;
							userMenuOpen = false;
						}}
					>
						<Bell size={16} />
						{#if notifications.length > 0}
							<span
								class="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white shadow-xs"
							>
								{notifications.length}
							</span>
						{/if}
					</button>

					<!-- Notifications Dropdown -->
					{#if notificationsOpen}
						<div
							class="absolute top-full right-0 z-50 mt-1.5 w-72 rounded-xl border border-border bg-surface py-2 shadow-xl ring-1 ring-black/5"
						>
							<div class="border-b border-border px-4 py-2 flex items-center justify-between">
								<h3 class="text-xs font-bold text-text-primary uppercase tracking-wider">
									Notifications
								</h3>
								<span class="text-[11px] text-text-muted">{notifications.length} alerts</span>
							</div>
							<div class="max-h-64 overflow-y-auto">
								{#if notifications.length === 0}
									<div class="px-4 py-6 text-center text-xs text-text-muted">
										No new notifications
									</div>
								{:else}
									<div class="divide-y divide-border/50">
										{#each notifications as msg}
											<a
												href="/inventory/batches"
												onclick={() => (notificationsOpen = false)}
												class="block px-4 py-2.5 text-xs text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
											>
												<p class="leading-relaxed">{msg}</p>
											</a>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					{/if}
				</div>

				<!-- User Menu -->
				<div class="relative" data-user-menu>
					<button
						class="flex items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1 text-sm transition-all hover:bg-surface-hover shadow-2xs"
						onclick={() => {
							userMenuOpen = !userMenuOpen;
							notificationsOpen = false;
						}}
						aria-expanded={userMenuOpen}
						aria-haspopup="true"
					>
						<div
							class="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-2xs"
						>
							{user?.name && user.name !== 'Guest' ? user.name.charAt(0).toUpperCase() : 'S'}
						</div>
						<div class="hidden text-left md:block">
							<p class="text-xs leading-none font-semibold text-text-primary">
								{user?.name && user.name !== 'Guest' ? user.name : 'System Admin'}
							</p>
						</div>
						<ChevronDown size={12} class="hidden text-text-muted md:block" />
					</button>

					<!-- User Dropdown Menu -->
					{#if userMenuOpen}
						<div
							class="absolute right-0 z-50 mt-1.5 w-52 rounded-xl border border-border bg-surface py-1.5 shadow-xl ring-1 ring-black/5"
							role="menu"
						>
							<div class="border-b border-border px-3 py-2">
								<p class="text-xs font-bold text-text-primary">
									{user?.name ?? 'System Admin'}
								</p>
								<p class="text-[11px] text-text-muted capitalize">
									{user?.role ? user.role.replace(/[-_]/g, ' ') : 'Administrator'}
								</p>
							</div>

							<a
								href="/settings"
								onclick={() => (userMenuOpen = false)}
								class="flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
								role="menuitem"
							>
								<Settings size={14} />
								<span>Settings</span>
							</a>

							<form method="POST" action="/logout" data-sveltekit-reload>
								<button
									type="submit"
									class="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-danger hover:bg-danger-light"
									role="menuitem"
								>
									<LogOut size={14} />
									<span>Log out</span>
								</button>
							</form>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Tier 2: Horizontal Navigation Bar Tabs -->
	<div class="px-3 sm:px-6 bg-surface-secondary/40">
		<div class="w-full">
			<nav
				class="no-scrollbar flex items-center gap-1 overflow-x-auto py-1.5 text-xs font-medium"
				aria-label="Main navigation"
			>
				{#each navItems as item (item.href)}
					{@const active = isActive(item.href)}
					<a
						href={item.href}
						class="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all min-h-[36px]
							{active
							? 'bg-teal-600 text-white font-semibold shadow-xs'
							: 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'}"
						aria-current={active ? 'page' : undefined}
					>
						<item.icon size={15} />
						<span>{item.label}</span>
						{#if item.badge}
							<span
								class="rounded px-1.5 py-0.2 text-[9px] font-bold uppercase
								{active ? 'bg-white/20 text-white' : 'bg-red-500 text-white'}"
							>
								{item.badge}
							</span>
						{/if}
					</a>
				{/each}
			</nav>
		</div>
	</div>
</header>

<!-- Mobile Navigation Drawer Overlay (When hamburger is clicked) -->
{#if isSidebarOpen()}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs lg:hidden"
		onclick={() => setSidebarOpen(false)}
		onkeydown={(e) => e.key === 'Escape' && setSidebarOpen(false)}
		role="button"
		tabindex="-1"
		aria-label="Close navigation"
	></div>

	<!-- Slide-in Drawer -->
	<div
		class="fixed top-0 left-0 bottom-0 z-50 flex w-72 flex-col border-r border-border bg-surface p-4 shadow-2xl lg:hidden"
	>
		<!-- Drawer Header -->
		<div class="flex items-center justify-between border-b border-border pb-3">
			<div class="flex items-center gap-2.5">
				<div
					class="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 text-white shadow-xs ring-2 ring-teal-100"
				>
					<Plus size={18} strokeWidth={3} />
				</div>
				<div>
					<h2 class="text-sm font-bold text-teal-950">MedERP Store Portal</h2>
					<p class="text-[11px] text-text-muted">Wholesale & Retail ERP</p>
				</div>
			</div>
			<button
				class="flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-hover hover:text-text-primary"
				onclick={() => setSidebarOpen(false)}
				aria-label="Close menu"
			>
				<X size={20} />
			</button>
		</div>

		<!-- Quick Actions in Mobile Drawer -->
		<div class="mt-3 flex flex-col gap-2">
			<a
				href="/sales/new"
				onclick={handleMobileNavClick}
				class="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#1d4ed8] px-3 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-98"
			>
				<Receipt size={16} />
				<span>New Bill / Sale</span>
			</a>
		</div>

		<!-- Navigation Links -->
		<nav class="mt-4 flex-1 overflow-y-auto" aria-label="Mobile navigation">
			<ul class="flex flex-col gap-1.5">
				{#each navItems as item (item.href)}
					{@const active = isActive(item.href)}
					<li>
						<a
							href={item.href}
							onclick={handleMobileNavClick}
							class="flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
								{active
								? 'bg-teal-600 text-white font-semibold shadow-xs'
								: 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'}"
							aria-current={active ? 'page' : undefined}
						>
							<item.icon size={18} />
							<span class="flex-1">{item.label}</span>
							{#if item.badge}
								<span class="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
									{item.badge}
								</span>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<!-- Drawer Footer with User Info and Logout -->
		<div class="border-t border-border pt-3">
			<div class="mb-3 flex items-center gap-2.5 px-2">
				<div
					class="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white"
				>
					{user?.name && user.name !== 'Guest' ? user.name.charAt(0).toUpperCase() : 'A'}
				</div>
				<div class="flex-1 overflow-hidden">
					<p class="truncate text-xs font-semibold text-text-primary">
						{user?.name ?? 'Clinical Admin'}
					</p>
					<p class="truncate text-[11px] text-text-muted capitalize">
						{user?.role ? user.role.replace(/[-_]/g, ' ') : 'Administrator'}
					</p>
				</div>
			</div>
			<form method="POST" action="/logout" data-sveltekit-reload>
				<button
					type="submit"
					class="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-danger hover:bg-danger-light active:scale-98"
				>
					<LogOut size={16} />
					<span>Log out</span>
				</button>
			</form>
		</div>
	</div>
{/if}
