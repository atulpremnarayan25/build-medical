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
	class="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs"
>
	<table class="w-full text-left text-xs text-slate-700">
		<thead
			class="border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold tracking-wider text-slate-500 uppercase"
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
		<tbody class="divide-y divide-slate-100">
			{#if items.length === 0}
				<tr>
					<td
						colspan={columns.length}
						class="px-4 py-8 text-center text-slate-400"
					>
						{emptyMessage}
					</td>
				</tr>
			{:else}
				{#each items as item, index (index)}
					<tr
						class="transition-colors hover:bg-teal-50/40"
					>
						{@render row(item)}
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>
