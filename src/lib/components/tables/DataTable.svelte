<script lang="ts" generics="T">
	type Props = {
		items: T[];
		columns: {
			header: string;
			key?: keyof T | ((item: T) => unknown);
			align?: 'left' | 'right' | 'center';
			class?: string;
		}[];
		row: import('svelte').Snippet<[T]>;
		emptyMessage?: string;
	};

	let { items, columns, row, emptyMessage = 'No data available.' }: Props = $props();
</script>

<div
	class="overflow-x-auto rounded-xl border border-border bg-surface shadow-2xs"
>
	<table class="w-full text-left text-xs text-text-secondary">
		<thead
			class="border-b border-border bg-surface-secondary text-[11px] font-semibold tracking-wider text-text-muted uppercase"
		>
			<tr>
				{#each columns as col (col.header)}
					<th
						class="px-4 py-3 {col.class || ''}"
						class:text-right={col.align === 'right'}
						class:text-center={col.align === 'center'}
						class:text-left={!col.align || col.align === 'left'}
					>
						{col.header}
					</th>
				{/each}
			</tr>
		</thead>
		<tbody class="divide-y divide-border-subtle">
			{#if items.length === 0}
				<tr>
					<td
						colspan={columns.length}
						class="px-4 py-8 text-center text-text-muted"
					>
						{emptyMessage}
					</td>
				</tr>
			{:else}
				{#each items as item, index (index)}
					<tr
						class="transition-colors hover:bg-surface-hover/70"
					>
						{@render row(item)}
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>
