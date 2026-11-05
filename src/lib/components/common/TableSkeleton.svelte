<script lang="ts">
	import Skeleton from './Skeleton.svelte';

	let {
		columns = 5,
		rows = 5,
		showHeader = true
	}: {
		columns?: number | string[];
		rows?: number;
		showHeader?: boolean;
	} = $props();

	let columnList = $derived(
		Array.isArray(columns)
			? columns
			: Array.from({ length: typeof columns === 'number' ? columns : 5 }, () => 'flex-1')
	);

	let rowList = $derived(Array.from({ length: rows }, (_, i) => i));
</script>

<div class="overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
	{#if showHeader}
		<div class="flex items-center gap-4 border-b border-border bg-surface-secondary/50 px-4 py-3">
			{#each columnList as colClass}
				<div class={colClass}>
					<Skeleton class="h-4 w-3/4" rounded="md" />
				</div>
			{/each}
		</div>
	{/if}

	<div class="divide-y divide-border/60">
		{#each rowList as r}
			<div class="flex items-center gap-4 px-4 py-3.5 transition-colors">
				{#each columnList as colClass, i}
					<div class={colClass}>
						{#if i === 0}
							<div class="flex items-center gap-2">
								<Skeleton class="h-6 w-6 shrink-0" rounded="full" />
								<Skeleton class="h-4 w-4/5" rounded="md" />
							</div>
						{:else if i === columnList.length - 1}
							<div class="flex justify-end">
								<Skeleton class="h-6 w-16" rounded="md" />
							</div>
						{:else}
							<Skeleton class="h-4 w-{Math.max(40, 90 - (r % 3) * 15)}%" rounded="md" />
						{/if}
					</div>
				{/each}
			</div>
		{/each}
	</div>
</div>
