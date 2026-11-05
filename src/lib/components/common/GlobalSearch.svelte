<script lang="ts">
	import { Search, X, Loader2, Package, Users, Truck, FileText } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let open = $state(false);
	let query = $state('');
	let loading = $state(false);
	let results = $state<
		Array<{ type: string; title: string; subtitle: string; href: string; icon: any }>
	>([]);

	function toggleSearch() {
		open = !open;
		if (open) {
			query = '';
			results = [];
			setTimeout(() => {
				document.getElementById('global-search-input')?.focus();
			}, 50);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			toggleSearch();
		}
		if (e.key === 'Escape' && open) {
			open = false;
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});

	const typeIconMap: Record<string, any> = {
		Product: Package,
		Customer: Users,
		Supplier: Truck,
		Sale: FileText,
		Purchase: FileText
	};

	let debounceTimer: ReturnType<typeof setTimeout>;

	async function performSearch() {
		if (query.trim().length < 2) {
			results = [];
			return;
		}

		loading = true;
		try {
			const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
			if (res.ok) {
				const json = await res.json();
				const items: any[] = json?.data?.items || json?.items || [];
				results = items.map((item) => ({
					type: item.type,
					title: item.title,
					subtitle: item.subtitle,
					href: item.href,
					icon: typeIconMap[item.type] || FileText
				}));
			} else {
				results = [];
			}
		} catch (e) {
			console.error('Global search error:', e);
			results = [];
		} finally {
			loading = false;
		}
	}

	function onInput() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(performSearch, 300);
	}

	function selectResult(href: string) {
		open = false;
		goto(href);
	}
</script>

<button
	class="flex flex-1 items-center gap-2 rounded-md border border-border bg-surface-secondary px-3 py-1.5 text-sm text-text-muted transition-colors hover:border-border-strong hover:text-text-secondary sm:max-w-xs"
	onclick={toggleSearch}
	aria-label="Search"
>
	<Search size={16} />
	<span class="hidden sm:inline">Search...</span>
	<kbd
		class="ml-auto hidden rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-text-muted sm:inline"
	>
		Ctrl+K
	</kbd>
</button>

{#if open}
	<div class="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24">
		<!-- Backdrop -->
		<button
			type="button"
			class="fixed inset-0 cursor-default appearance-none bg-black/50 transition-opacity outline-none"
			onclick={toggleSearch}
			aria-label="Close search"
		></button>

		<!-- Dialog -->
		<div
			class="relative mx-4 w-full max-w-2xl overflow-hidden rounded-xl bg-surface shadow-2xl ring-1 ring-black/5"
		>
			<div class="flex items-center gap-3 border-b border-border p-4">
				<Search size={20} class="text-text-muted" />
				<input
					id="global-search-input"
					type="text"
					bind:value={query}
					oninput={onInput}
					class="flex-1 bg-transparent text-lg text-text-primary placeholder:text-text-muted focus:outline-none"
					placeholder="Search products, customers, invoices..."
					autocomplete="off"
				/>
				<button
					onclick={toggleSearch}
					class="rounded p-1 text-text-muted hover:bg-surface-hover hover:text-text-primary"
				>
					<X size={20} />
				</button>
			</div>

			<div class="max-h-96 overflow-y-auto p-2">
				{#if loading}
					<div class="flex items-center justify-center p-8 text-text-muted">
						<Loader2 class="h-6 w-6 animate-spin" />
					</div>
				{:else if query.length > 0 && query.length < 2}
					<div class="p-8 text-center text-sm text-text-muted">
						Type at least 2 characters to search...
					</div>
				{:else if query.length >= 2 && results.length === 0}
					<div class="p-8 text-center text-sm text-text-muted">
						No results found for "{query}"
					</div>
				{:else if results.length > 0}
					<div class="mt-2 space-y-1">
						{#each results as result}
							<button
								class="flex w-full items-center gap-3 rounded-md p-3 text-left transition-colors hover:bg-surface-hover"
								onclick={() => selectResult(result.href)}
							>
								<div
									class="bg-background flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary"
								>
									<result.icon size={20} />
								</div>
								<div class="flex-1 overflow-hidden">
									<h4 class="truncate text-sm font-medium text-text-primary">{result.title}</h4>
									<p class="truncate text-xs text-text-muted">
										{result.type} • {result.subtitle}
									</p>
								</div>
							</button>
						{/each}
					</div>
				{:else}
					<div class="p-8 text-center text-sm text-text-muted">Start typing to search...</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
