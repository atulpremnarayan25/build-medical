<script lang="ts">
	import {
		getSyncStatus,
		getPendingChanges,
		toggleSidebar,
		setSidebarOpen,
		isSubscriptionActive
	} from '$lib/stores/appStore.svelte.js';
	import { addToast } from '$lib/stores/toastStore.svelte.js';
	import GlobalSearch from '../common/GlobalSearch.svelte';
	import ThemeToggle from '../common/ThemeToggle.svelte';
	import {
		Menu,
		PanelLeftClose,
		PanelLeftOpen,
		Search,
		Bell,
		LogOut,
		ChevronDown,
		ShieldCheck,
		AlertTriangle,
		Receipt
	} from '@lucide/svelte';
	import { isSidebarCollapsed } from '$lib/stores/appStore.svelte.js';
	import type { SyncStatus } from '$lib/types/app.js';

	import { page } from '$app/stores';

	let userMenuOpen = $state(false);
	let subActive = $derived(isSubscriptionActive());

	let user = $derived($page.data.user || { name: 'Guest', role: 'Not Logged In' });
	let notifications = $derived($page.data.notifications || []);
	let notificationsOpen = $state(false);

	const syncConfig: Record<SyncStatus, { color: string; label: string }> = {
		synced: { color: 'bg-success', label: 'Synced' },
		offline: { color: 'bg-text-muted', label: 'Offline' },
		syncing: { color: 'bg-info', label: 'Syncing...' },
		pending: { color: 'bg-warning', label: 'Pending' },
		error: { color: 'bg-danger', label: 'Sync error' }
	};

	let sync = $derived(syncConfig[getSyncStatus()]);
	let pending = $derived(getPendingChanges());

	function closeUserMenu() {
		userMenuOpen = false;
	}
</script>

<svelte:window
	onclick={(e) => {
		// Close user menu when clicking outside
		const target = e.target as HTMLElement;
		if (userMenuOpen && !target.closest('[data-user-menu]')) {
			closeUserMenu();
		}
	}}
/>

<header class="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
	<!-- Left section -->
	<div class="flex items-center gap-2">
		<!-- Mobile menu button -->
		<button
			class="rounded-md p-1.5 text-text-secondary hover:bg-surface-hover hover:text-text-primary lg:hidden"
			onclick={() => setSidebarOpen(true)}
			aria-label="Open sidebar"
		>
			<Menu size={20} />
		</button>

		<!-- Desktop collapse toggle -->
		<button
			class="hidden rounded-md p-1.5 text-text-secondary hover:bg-surface-hover hover:text-text-primary lg:flex"
			onclick={toggleSidebar}
			aria-label={isSidebarCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'}
		>
			{#if isSidebarCollapsed()}
				<PanelLeftOpen size={20} />
			{:else}
				<PanelLeftClose size={20} />
			{/if}
		</button>
	</div>

	<!-- Search trigger -->
	<GlobalSearch />

	<!-- Spacer -->
	<div class="flex-1 sm:hidden"></div>

	<!-- Right section -->
	<div class="flex items-center gap-2 sm:gap-3">
		<!-- Quick Billing Terminal Button -->
		<a
			href="/sales/new"
			class="hidden items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-white shadow-xs transition-all hover:bg-accent-hover active:scale-95 md:flex"
			title="Open High-Speed Billing Terminal"
		>
			<Receipt size={14} />
			<span>New Bill</span>
		</a>

		<!-- Theme Toggle -->
		<ThemeToggle compact={true} />

		<!-- Subscription status link -->
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

		<!-- Sync status -->
		<div
			class="hidden items-center gap-1.5 text-xs text-text-secondary sm:flex"
			title={pending > 0 ? `${pending} pending changes` : sync.label}
		>
			<span class="h-2 w-2 rounded-full {sync.color}"></span>
			<span>{sync.label}</span>
		</div>

		<!-- Notifications -->
		<div class="relative">
			<button
				class="relative rounded-md p-1.5 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
				aria-label="Notifications ({notifications.length} unread)"
				onclick={() => {
					notificationsOpen = !notificationsOpen;
					userMenuOpen = false;
				}}
			>
				<Bell size={20} />
				{#if notifications.length > 0}
					<span
						class="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white"
					>
						{notifications.length}
					</span>
				{/if}
			</button>

			<!-- Dropdown -->
			{#if notificationsOpen}
				<div
					class="absolute top-full right-0 z-50 mt-1 w-64 rounded-md border border-border bg-surface py-2 shadow-lg ring-1 ring-black/5"
				>
					<div class="border-b border-border px-4 py-2">
						<h3 class="text-sm font-semibold text-text-primary">Notifications</h3>
					</div>
					<div class="max-h-60 overflow-y-auto">
						{#if notifications.length === 0}
							<div class="px-4 py-4 text-center text-sm text-text-muted">No new alerts</div>
						{:else}
							<div class="space-y-1 py-1">
								{#each notifications as msg}
									<a
										href="/inventory/batches"
										onclick={() => (notificationsOpen = false)}
										class="block border-l-2 border-transparent px-4 py-2 text-sm text-text-secondary transition-colors hover:border-accent hover:bg-surface-hover hover:text-text-primary"
									>
										<p>{msg}</p>
									</a>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- User menu -->
		<div class="relative" data-user-menu>
			<button
				class="flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-surface-hover"
				onclick={() => {
					userMenuOpen = !userMenuOpen;
					notificationsOpen = false;
				}}
				aria-expanded={userMenuOpen}
				aria-haspopup="true"
			>
				<!-- Avatar placeholder -->
				<div
					class="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white"
				>
					{user ? user.name.charAt(0).toUpperCase() : '?'}
				</div>
				<div class="hidden text-left sm:block">
					<p class="text-sm leading-tight font-medium text-text-primary">
						{user?.name ?? 'Guest'}
					</p>
					<p class="text-xs leading-tight text-text-muted capitalize">
						{user?.role?.replace(/[-_]/g, ' ') ?? 'Not logged in'}
					</p>
				</div>
				<ChevronDown size={14} class="hidden text-text-muted sm:block" />
			</button>

			<!-- Dropdown -->
			{#if userMenuOpen}
				<div
					class="absolute right-0 z-50 mt-1 w-48 rounded-md border border-border bg-surface py-1 shadow-lg"
					role="menu"
				>
					{#if user}
						<div class="border-b border-border px-3 py-2 sm:hidden">
							<p class="text-sm font-medium text-text-primary">{user.name}</p>
							<p class="text-xs text-text-muted capitalize">{user.role.replace(/[-_]/g, ' ')}</p>
						</div>
					{/if}
					<form method="POST" action="/logout" data-sveltekit-reload>
						<button
							type="submit"
							class="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary"
							role="menuitem"
						>
							<LogOut size={16} />
							<span>Log out</span>
						</button>
					</form>
				</div>
			{/if}
		</div>
	</div>
</header>
