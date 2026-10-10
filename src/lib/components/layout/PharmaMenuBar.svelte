<script lang="ts">
	import {
		ShoppingCart,
		PackageCheck,
		Users,
		Truck,
		Pill,
		FileSpreadsheet,
		ShieldAlert,
		Clock,
		BookOpen,
		Landmark,
		Receipt,
		RotateCcw,
		ChevronDown
	} from '@lucide/svelte';

	let openMenu = $state<string | null>(null);

	function toggleMenu(menu: string) {
		openMenu = openMenu === menu ? null : menu;
	}

	function closeMenu() {
		openMenu = null;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.altKey && e.key.toLowerCase() === 'f') {
			e.preventDefault();
			toggleMenu('file');
		} else if (e.altKey && e.key.toLowerCase() === 'r') {
			e.preventDefault();
			toggleMenu('report');
		} else if (e.altKey && e.key.toLowerCase() === 'a') {
			e.preventDefault();
			toggleMenu('account');
		} else if (e.key === 'Escape') {
			closeMenu();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- ERP Command Menus matching PKS Images 3, 4, 5 -->
<div class="relative hidden lg:flex items-center gap-1 font-mono text-xs select-none">
	<!-- File Menu -->
	<div class="relative">
		<button
			type="button"
			class="flex items-center gap-1 rounded px-2 py-1 font-bold transition-colors
				{openMenu === 'file' ? 'bg-surface-hover text-accent' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'}"
			onclick={() => toggleMenu('file')}
			aria-expanded={openMenu === 'file'}
		>
			<span class="underline decoration-accent">F</span>ile
			<ChevronDown size={11} class="opacity-60" />
		</button>

		{#if openMenu === 'file'}
			<!-- Backdrop to close -->
			<button
				type="button"
				class="fixed inset-0 z-40 cursor-default bg-transparent"
				onclick={closeMenu}
				aria-label="Close menu"
			></button>

			<div class="absolute left-0 top-full z-50 mt-1 w-56 rounded-md border border-border bg-surface py-1 shadow-lg font-sans text-xs ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95">
				<!-- Sales section -->
				<div class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
					Billing & Outward
				</div>
				<a
					href="/sales/new"
					onclick={closeMenu}
					class="flex items-center gap-2 px-3 py-1.5 text-text-primary hover:bg-accent-light/50 hover:text-accent"
				>
					<ShoppingCart size={14} class="text-accent" />
					<div class="flex-1 font-medium">Sale Bill (POS)</div>
					<kbd class="font-mono text-[10px] text-text-muted">F2</kbd>
				</a>
				<a
					href="/sales"
					onclick={closeMenu}
					class="flex items-center gap-2 px-3 py-1.5 text-text-primary hover:bg-surface-hover"
				>
					<Receipt size={14} class="text-text-muted" />
					<div class="flex-1 font-medium">Sale Invoices</div>
				</a>

				<div class="my-1 border-t border-border"></div>

				<!-- Purchasing section -->
				<div class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
					Inward & GRN
				</div>
				<a
					href="/purchases/new"
					onclick={closeMenu}
					class="flex items-center gap-2 px-3 py-1.5 text-text-primary hover:bg-accent-light/50 hover:text-accent"
				>
					<PackageCheck size={14} class="text-info" />
					<div class="flex-1 font-medium">Purchase Bill (GRN)</div>
					<kbd class="font-mono text-[10px] text-text-muted">F10</kbd>
				</a>
				<a
					href="/purchases"
					onclick={closeMenu}
					class="flex items-center gap-2 px-3 py-1.5 text-text-primary hover:bg-surface-hover"
				>
					<Receipt size={14} class="text-text-muted" />
					<div class="flex-1 font-medium">Purchase Invoices</div>
				</a>

				<div class="my-1 border-t border-border"></div>

				<!-- Masters section -->
				<div class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
					Pharma Masters
				</div>
				<a
					href="/customers"
					onclick={closeMenu}
					class="flex items-center gap-2 px-3 py-1.5 text-text-primary hover:bg-surface-hover"
				>
					<Users size={14} class="text-text-muted" />
					<div class="flex-1 font-medium">Customer Master (F8)</div>
				</a>
				<a
					href="/suppliers"
					onclick={closeMenu}
					class="flex items-center gap-2 px-3 py-1.5 text-text-primary hover:bg-surface-hover"
				>
					<Truck size={14} class="text-text-muted" />
					<div class="flex-1 font-medium">Supplier Master (F3)</div>
				</a>
				<a
					href="/inventory/products"
					onclick={closeMenu}
					class="flex items-center gap-2 px-3 py-1.5 text-text-primary hover:bg-surface-hover"
				>
					<Pill size={14} class="text-text-muted" />
					<div class="flex-1 font-medium">Products & Batches</div>
				</a>
			</div>
		{/if}
	</div>

	<!-- Report Menu -->
	<div class="relative">
		<button
			type="button"
			class="flex items-center gap-1 rounded px-2 py-1 font-bold transition-colors
				{openMenu === 'report' ? 'bg-surface-hover text-accent' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'}"
			onclick={() => toggleMenu('report')}
			aria-expanded={openMenu === 'report'}
		>
			<span class="underline decoration-accent">R</span>eport
			<ChevronDown size={11} class="opacity-60" />
		</button>

		{#if openMenu === 'report'}
			<button
				type="button"
				class="fixed inset-0 z-40 cursor-default bg-transparent"
				onclick={closeMenu}
				aria-label="Close menu"
			></button>

			<div class="absolute left-0 top-full z-50 mt-1 w-56 rounded-md border border-border bg-surface py-1 shadow-lg font-sans text-xs ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95">
				<div class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
					Statutory & Compliance
				</div>
				<a
					href="/reports/gst"
					onclick={closeMenu}
					class="flex items-center gap-2 px-3 py-1.5 text-text-primary hover:bg-accent-light/50 hover:text-accent"
				>
					<FileSpreadsheet size={14} class="text-success" />
					<div class="flex-1 font-medium">GST Filings (GSTR-1, 3B)</div>
				</a>
				<a
					href="/reports/schedule-h1"
					onclick={closeMenu}
					class="flex items-center gap-2 px-3 py-1.5 text-text-primary hover:bg-accent-light/50 hover:text-accent"
				>
					<ShieldAlert size={14} class="text-schedule-h1" />
					<div class="flex-1 font-medium">Form 35 / Schedule H1</div>
				</a>
				<a
					href="/reports/expiry"
					onclick={closeMenu}
					class="flex items-center gap-2 px-3 py-1.5 text-text-primary hover:bg-accent-light/50 hover:text-accent"
				>
					<Clock size={14} class="text-warning" />
					<div class="flex-1 font-medium">Near-Expiry Register</div>
				</a>
			</div>
		{/if}
	</div>

	<!-- Account Menu -->
	<div class="relative">
		<button
			type="button"
			class="flex items-center gap-1 rounded px-2 py-1 font-bold transition-colors
				{openMenu === 'account' ? 'bg-surface-hover text-accent' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'}"
			onclick={() => toggleMenu('account')}
			aria-expanded={openMenu === 'account'}
		>
			<span class="underline decoration-accent">A</span>ccount
			<ChevronDown size={11} class="opacity-60" />
		</button>

		{#if openMenu === 'account'}
			<button
				type="button"
				class="fixed inset-0 z-40 cursor-default bg-transparent"
				onclick={closeMenu}
				aria-label="Close menu"
			></button>

			<div class="absolute left-0 top-full z-50 mt-1 w-56 rounded-md border border-border bg-surface py-1 shadow-lg font-sans text-xs ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95">
				<div class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
					Khata & Double-Entry Ledgers
				</div>
				<a
					href="/customers"
					onclick={closeMenu}
					class="flex items-center gap-2 px-3 py-1.5 text-text-primary hover:bg-accent-light/50 hover:text-accent"
				>
					<BookOpen size={14} class="text-accent" />
					<div class="flex-1 font-medium">Customer Khata (Receivables)</div>
				</a>
				<a
					href="/suppliers"
					onclick={closeMenu}
					class="flex items-center gap-2 px-3 py-1.5 text-text-primary hover:bg-accent-light/50 hover:text-accent"
				>
					<Landmark size={14} class="text-info" />
					<div class="flex-1 font-medium">Supplier Ledger (Payables)</div>
				</a>
			</div>
		{/if}
	</div>
</div>
