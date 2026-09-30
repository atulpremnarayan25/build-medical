<script lang="ts">
	import { Button } from '$lib/components/common';
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';

	type Props = {
		currentPage: number;
		totalPages: number;
		totalItems: number;
		itemsPerPage: number;
		onPageChange: (page: number) => void;
	};

	let { currentPage, totalPages, totalItems, itemsPerPage, onPageChange }: Props = $props();

	let startItem = $derived(totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1);
	let endItem = $derived(Math.min(currentPage * itemsPerPage, totalItems));
</script>

<div
	class="flex items-center justify-between border-t border-border bg-surface px-4 py-3 sm:px-6"
>
	<div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
		<div>
			<p class="text-xs text-text-muted">
				Showing
				<span class="font-semibold text-text-primary">{startItem}</span>
				to
				<span class="font-semibold text-text-primary">{endItem}</span>
				of
				<span class="font-semibold text-text-primary">{totalItems}</span>
				results
			</p>
		</div>
		<div>
			<nav class="isolate inline-flex -space-x-px rounded-md shadow-2xs" aria-label="Pagination">
				<Button
					variant="secondary"
					size="sm"
					disabled={currentPage <= 1}
					onclick={() => onPageChange(currentPage - 1)}
					class="rounded-l-md rounded-r-none px-2.5"
				>
					<span class="sr-only">Previous</span>
					<ChevronLeft size={14} />
				</Button>

				<span
					class="relative inline-flex items-center bg-surface px-3.5 py-1.5 font-mono text-xs font-semibold text-text-primary ring-1 ring-border ring-inset"
				>
					{currentPage} / {totalPages || 1}
				</span>

				<Button
					variant="secondary"
					size="sm"
					disabled={currentPage >= totalPages}
					onclick={() => onPageChange(currentPage + 1)}
					class="rounded-l-none rounded-r-md px-2.5"
				>
					<span class="sr-only">Next</span>
					<ChevronRight size={14} />
				</Button>
			</nav>
		</div>
	</div>

	<!-- Mobile simple version -->
	<div class="flex flex-1 justify-between sm:hidden">
		<Button
			variant="secondary"
			size="sm"
			disabled={currentPage <= 1}
			onclick={() => onPageChange(currentPage - 1)}
		>
			Previous
		</Button>
		<Button
			variant="secondary"
			size="sm"
			disabled={currentPage >= totalPages}
			onclick={() => onPageChange(currentPage + 1)}
		>
			Next
		</Button>
	</div>
</div>
