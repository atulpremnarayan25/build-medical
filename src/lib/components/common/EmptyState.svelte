<script lang="ts">
	import type { Snippet } from 'svelte';

	interface EmptyStateProps {
		title?: string;
		message?: string;
		icon?: Snippet;
		action?: Snippet;
	}

	let { title = 'No data found', message, icon, action }: EmptyStateProps = $props();
</script>

<div class="flex flex-col items-center justify-center px-4 py-12 text-center">
	{#if icon}
		<div class="mb-3 text-text-muted">
			{@render icon()}
		</div>
	{:else}
		<div class="mb-3 text-text-muted">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="40"
				height="40"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
				<polyline points="13 2 13 9 20 9"></polyline>
			</svg>
		</div>
	{/if}

	<h3 class="text-sm font-medium text-text-secondary">{title}</h3>

	{#if message}
		<p class="mt-1 max-w-sm text-sm text-text-muted">{message}</p>
	{/if}

	{#if action}
		<div class="mt-4">
			{@render action()}
		</div>
	{/if}
</div>
