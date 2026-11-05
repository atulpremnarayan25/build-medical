<script lang="ts">
	import TableSkeleton from './TableSkeleton.svelte';

	interface LoadingStateProps {
		message?: string;
		rows?: number;
		columns?: number;
	}

	let {
		message = 'Loading data...',
		rows = 5,
		columns = 5
	}: LoadingStateProps = $props();
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between px-1 text-xs text-text-muted">
		<span class="flex items-center gap-2">
			<span class="inline-block h-2 w-2 animate-ping rounded-full bg-accent"></span>
			<span>{message}</span>
		</span>
	</div>

	<TableSkeleton {rows} {columns} />
</div>
