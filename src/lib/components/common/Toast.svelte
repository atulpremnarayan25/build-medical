<script lang="ts">
	import type { ToastType } from '$lib/stores/toastStore.svelte.js';
	import { removeToast } from '$lib/stores/toastStore.svelte.js';

	interface ToastProps {
		id: string;
		type: ToastType;
		message: string;
	}

	let { id, type, message }: ToastProps = $props();

	const typeClasses: Record<ToastType, string> = {
		success: 'border-success/30 bg-success-light text-success',
		error: 'border-danger/30 bg-danger-light text-danger',
		warning: 'border-warning/30 bg-warning-light text-warning',
		info: 'border-info/30 bg-info-light text-info'
	};
</script>

<div
	class="flex w-80 items-start gap-2.5 rounded-md border px-3.5 py-2.5 shadow-md {typeClasses[
		type
	]}"
	role="alert"
>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		class="mt-0.5 shrink-0"
	>
		{#if type === 'success'}
			<polyline points="20 6 9 17 4 12"></polyline>
		{:else if type === 'error'}
			<line x1="18" y1="6" x2="6" y2="18"></line>
			<line x1="6" y1="6" x2="18" y2="18"></line>
		{:else if type === 'warning'}
			<path
				d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
			></path>
			<line x1="12" y1="9" x2="12" y2="13"></line>
			<line x1="12" y1="17" x2="12.01" y2="17"></line>
		{:else}
			<circle cx="12" cy="12" r="10"></circle>
			<line x1="12" y1="16" x2="12" y2="12"></line>
			<line x1="12" y1="8" x2="12.01" y2="8"></line>
		{/if}
	</svg>

	<p class="flex-1 text-sm font-medium">{message}</p>

	<button
		type="button"
		class="shrink-0 cursor-pointer rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
		onclick={() => removeToast(id)}
		aria-label="Dismiss"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<line x1="18" y1="6" x2="6" y2="18"></line>
			<line x1="6" y1="6" x2="18" y2="18"></line>
		</svg>
	</button>
</div>
