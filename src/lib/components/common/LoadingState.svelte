<script lang="ts">
	import Skeleton from './Skeleton.svelte';

	interface LoadingStateProps {
		message?: string;
	}

	let { message = 'Loading...' }: LoadingStateProps = $props();
</script>

<div class="flex flex-col gap-4 p-6">
	<!-- Example Skeleton Layout replacing dots -->
	<div class="flex items-center justify-between">
		<Skeleton class="h-8 w-1/4" rounded="md" />
		<Skeleton class="h-8 w-32" rounded="md" />
	</div>

	<div class="mt-4 space-y-3">
		<Skeleton class="h-10 w-full" rounded="md" />
		<Skeleton class="h-10 w-full" rounded="md" />
		<Skeleton class="h-10 w-full" rounded="md" />
		<Skeleton class="h-10 w-3/4" rounded="md" />
	</div>

	<div class="mt-4 flex justify-center text-sm text-text-muted">
		{message}
	</div>
</div>
