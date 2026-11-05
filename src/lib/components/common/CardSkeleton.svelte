<script lang="ts">
	import Skeleton from './Skeleton.svelte';

	let {
		count = 3,
		class: className = ''
	}: {
		count?: number;
		class?: string;
	} = $props();

	let items = $derived(Array.from({ length: count }, (_, i) => i));
</script>

<div class="grid grid-cols-1 gap-3 sm:grid-cols-{count} {className}">
	{#each items as _}
		<div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
			<div class="flex items-center justify-between">
				<Skeleton class="h-4 w-24" rounded="md" />
				<Skeleton class="h-7 w-7" rounded="lg" />
			</div>
			<div class="mt-3">
				<Skeleton class="h-7 w-32" rounded="md" />
			</div>
			<div class="mt-2 flex items-center gap-1.5">
				<Skeleton class="h-3 w-16" rounded="sm" />
				<Skeleton class="h-3 w-28" rounded="sm" />
			</div>
		</div>
	{/each}
</div>
