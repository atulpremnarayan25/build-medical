<script lang="ts">
	import type { ToastType } from '$lib/stores/toastStore.svelte.js';
	import { removeToast } from '$lib/stores/toastStore.svelte.js';
	import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from '@lucide/svelte';

	interface ToastProps {
		id: string;
		type: ToastType;
		message: string;
	}

	let { id, type, message }: ToastProps = $props();

	const typeStyles: Record<
		ToastType,
		{ container: string; iconColor: string }
	> = {
		success: {
			container: 'border-success/30 bg-surface-elevated text-text-primary shadow-lg',
			iconColor: 'text-success'
		},
		error: {
			container: 'border-danger/30 bg-surface-elevated text-text-primary shadow-lg',
			iconColor: 'text-danger'
		},
		warning: {
			container: 'border-warning/30 bg-surface-elevated text-text-primary shadow-lg',
			iconColor: 'text-warning'
		},
		info: {
			container: 'border-info/30 bg-surface-elevated text-text-primary shadow-lg',
			iconColor: 'text-info'
		}
	};
</script>

<div
	class="flex w-84 items-start gap-3 rounded-xl border px-4 py-3 shadow-xl backdrop-blur-xs transition-all duration-150 {typeStyles[
		type
	].container}"
	role="alert"
>
	<div class="mt-0.5 shrink-0 {typeStyles[type].iconColor}">
		{#if type === 'success'}
			<CheckCircle2 class="h-4 w-4" />
		{:else if type === 'error'}
			<AlertCircle class="h-4 w-4" />
		{:else if type === 'warning'}
			<AlertTriangle class="h-4 w-4" />
		{:else}
			<Info class="h-4 w-4" />
		{/if}
	</div>

	<p class="flex-1 text-xs font-medium leading-relaxed">{message}</p>

	<button
		type="button"
		class="pressable shrink-0 cursor-pointer rounded-md p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
		onclick={() => removeToast(id)}
		aria-label="Dismiss"
	>
		<X class="h-3.5 w-3.5" />
	</button>
</div>
