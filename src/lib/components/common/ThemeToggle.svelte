<script lang="ts">
	import { getTheme, setTheme } from '$lib/stores/appStore.svelte.js';
	import type { Theme } from '$lib/types/app.js';
	import { Sun, Moon, Monitor } from '@lucide/svelte';

	interface Props {
		compact?: boolean;
		class?: string;
	}

	let { compact = false, class: className = '' }: Props = $props();

	let currentTheme = $derived(getTheme());

	function toggle() {
		const next: Theme = currentTheme === 'light' ? 'dark' : currentTheme === 'dark' ? 'system' : 'light';
		setTheme(next);
	}
</script>

{#if compact}
	<button
		type="button"
		class="relative rounded-md p-1.5 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary {className}"
		onclick={toggle}
		title={`Theme: ${currentTheme} (click to toggle)`}
		aria-label={`Current theme: ${currentTheme}. Click to switch theme.`}
	>
		{#if currentTheme === 'dark'}
			<Moon size={18} class="text-warning" />
		{:else if currentTheme === 'light'}
			<Sun size={18} class="text-warning" />
		{:else}
			<Monitor size={18} class="text-accent" />
		{/if}
	</button>
{:else}
	<div class="inline-flex items-center rounded-lg border border-border bg-surface-secondary p-0.5 text-xs {className}">
		<button
			type="button"
			class="flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors {currentTheme === 'light' ? 'bg-surface text-text-primary shadow-xs font-semibold' : 'text-text-muted hover:text-text-primary'}"
			onclick={() => setTheme('light')}
			aria-label="Light theme"
		>
			<Sun size={13} class={currentTheme === 'light' ? 'text-warning' : ''} />
			<span>Light</span>
		</button>
		<button
			type="button"
			class="flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors {currentTheme === 'dark' ? 'bg-surface text-text-primary shadow-xs font-semibold' : 'text-text-muted hover:text-text-primary'}"
			onclick={() => setTheme('dark')}
			aria-label="Dark theme"
		>
			<Moon size={13} class={currentTheme === 'dark' ? 'text-warning' : ''} />
			<span>Dark</span>
		</button>
		<button
			type="button"
			class="flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors {currentTheme === 'system' ? 'bg-surface text-text-primary shadow-xs font-semibold' : 'text-text-muted hover:text-text-primary'}"
			onclick={() => setTheme('system')}
			aria-label="System theme"
		>
			<Monitor size={13} class={currentTheme === 'system' ? 'text-accent' : ''} />
			<span>Auto</span>
		</button>
	</div>
{/if}
