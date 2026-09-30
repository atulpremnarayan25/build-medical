<script lang="ts">
	import Toast from './Toast.svelte';
	import { getToasts } from '$lib/stores/toastStore.svelte.js';

	const toasts = $derived(getToasts());
</script>

{#if toasts.length > 0}
	<div class="fixed right-4 bottom-4 z-[100] flex flex-col gap-2">
		{#each toasts as toast (toast.id)}
			<Toast id={toast.id} type={toast.type} message={toast.message} />
		{/each}
	</div>
{/if}
