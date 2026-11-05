<script lang="ts">
	import Skeleton from '$lib/components/common/Skeleton.svelte';
	import CardSkeleton from '$lib/components/common/CardSkeleton.svelte';
	import TableSkeleton from '$lib/components/common/TableSkeleton.svelte';
</script>

<div class="space-y-5 animate-pulse" aria-busy="true" aria-label="Loading dashboard...">
	<!-- Header Skeleton -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<Skeleton class="h-6 w-48" rounded="md" />
			<Skeleton class="mt-1 h-3.5 w-72" rounded="sm" />
		</div>
		<div class="flex items-center gap-2">
			<Skeleton class="h-8 w-28" rounded="lg" />
			<Skeleton class="h-8 w-28" rounded="lg" />
			<Skeleton class="h-8 w-24" rounded="lg" />
		</div>
	</div>

	<!-- Primary Metrics Skeleton (4 Cards) -->
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
		{#each Array(4) as _}
			<div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
				<div class="flex items-center justify-between">
					<Skeleton class="h-3.5 w-24" rounded="sm" />
					<Skeleton class="h-7 w-7" rounded="lg" />
				</div>
				<div class="mt-3">
					<Skeleton class="h-7 w-32" rounded="md" />
				</div>
				<div class="mt-2 flex items-center gap-2">
					<Skeleton class="h-3 w-16" rounded="sm" />
					<Skeleton class="h-3 w-24" rounded="sm" />
				</div>
			</div>
		{/each}
	</div>

	<!-- Stock Health & Compliance Alerts Skeleton -->
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		{#each Array(4) as _}
			<div class="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
				<div class="flex items-center gap-2">
					<Skeleton class="h-6 w-6" rounded="md" />
					<Skeleton class="h-4 w-20" rounded="sm" />
				</div>
				<div class="mt-2">
					<Skeleton class="h-6 w-12" rounded="md" />
				</div>
			</div>
		{/each}
	</div>

	<!-- Dual Tables Skeleton: Recent Sales & Recent Purchases -->
	<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
		<div class="space-y-2">
			<div class="flex items-center justify-between px-1">
				<Skeleton class="h-4 w-32" rounded="sm" />
				<Skeleton class="h-3.5 w-16" rounded="sm" />
			</div>
			<TableSkeleton columns={['w-24', 'flex-1', 'w-20']} rows={5} />
		</div>
		<div class="space-y-2">
			<div class="flex items-center justify-between px-1">
				<Skeleton class="h-4 w-32" rounded="sm" />
				<Skeleton class="h-3.5 w-16" rounded="sm" />
			</div>
			<TableSkeleton columns={['w-24', 'flex-1', 'w-20']} rows={5} />
		</div>
	</div>
</div>
