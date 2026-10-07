<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ArrowLeft } from '@lucide/svelte';

	interface PageHeaderProps {
		title: string;
		subtitle?: string;
		backHref?: string;
		actions?: Snippet;
	}

	let { title, subtitle, backHref, actions }: PageHeaderProps = $props();
</script>

<div class="flex items-center justify-between gap-4 pb-4">
	<div class="flex items-center gap-3">
		{#if backHref}
			<a
				href={backHref}
				class="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary shadow-2xs"
				aria-label="Go back"
			>
				<ArrowLeft size={16} />
			</a>
		{/if}

		<div>
			<h1 class="text-xl font-bold tracking-tight text-text-primary">{title}</h1>
			{#if subtitle}
				<p class="mt-0.5 text-xs text-text-muted">{subtitle}</p>
			{/if}
		</div>
	</div>

	{#if actions}
		<div class="flex items-center gap-2">
			{@render actions()}
		</div>
	{/if}
</div>
