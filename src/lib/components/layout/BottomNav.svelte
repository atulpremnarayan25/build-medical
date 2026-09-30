<script lang="ts">
	import { page } from '$app/state';
	import { ShoppingCart, Warehouse, Users, LayoutDashboard, Menu } from '@lucide/svelte';
	import { setSidebarOpen } from '$lib/stores/appStore.svelte.js';

	const navItems = [
		{ label: 'Dash', href: '/', icon: LayoutDashboard },
		{ label: 'Sale', href: '/sales', icon: ShoppingCart },
		{ label: 'Stock', href: '/inventory', icon: Warehouse },
		{ label: 'Customers', href: '/customers', icon: Users }
	];

	function isActive(href: string): boolean {
		const pathname = page.url.pathname;
		if (href === '/') return pathname === '/';
		return pathname.startsWith(href);
	}
</script>

<nav class="pb-safe fixed bottom-0 left-0 z-40 w-full border-t border-border bg-surface lg:hidden">
	<div class="mx-auto flex max-w-md items-center justify-around px-2 py-2">
		{#each navItems as item}
			{@const active = isActive(item.href)}
			<a
				href={item.href}
				class="flex flex-col items-center gap-1 rounded-lg p-2 text-xs font-medium transition-colors {active
					? 'text-accent'
					: 'text-text-muted hover:text-text-primary'}"
			>
				<item.icon size={20} />
				<span>{item.label}</span>
			</a>
		{/each}
		<button
			class="flex flex-col items-center gap-1 rounded-lg p-2 text-xs font-medium text-text-muted transition-colors hover:text-text-primary"
			onclick={() => setSidebarOpen(true)}
		>
			<Menu size={20} />
			<span>More</span>
		</button>
	</div>
</nav>

<style>
	/* safe area for ios home indicator */
	.pb-safe {
		padding-bottom: env(safe-area-inset-bottom);
	}
</style>
