<script lang="ts">
	import type { Snippet } from 'svelte';
	import { PackageSearch } from '@lucide/svelte';

	interface EmptyStateProps {
		title?: string;
		message?: string;
		icon?: Snippet;
		action?: Snippet;
		class?: string;
	}

	let {
		title = 'No records found',
		message,
		icon,
		action,
		class: className = ''
	}: EmptyStateProps = $props();
</script>

<div class="flex flex-col items-center justify-center px-4 py-12 text-center {className}">
	<div class="mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-secondary border border-border/80 text-text-muted shadow-xs">
		{#if icon}
			{@render icon()}
		{:else}
			<PackageSearch class="h-6 w-6 stroke-[1.5]" />
		{/if}
	</div>

	<h3 class="text-sm font-semibold text-text-primary tracking-tight">{title}</h3>

	{#if message}
		<p class="mt-1 max-w-sm text-xs text-text-muted leading-relaxed">{message}</p>
	{/if}

	{#if action}
		<div class="mt-4">
			{@render action()}
		</div>
	{/if}
</div>
