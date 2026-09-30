<script lang="ts">
	import { Badge } from '$lib/components/common';

	type Props = {
		quantity: number;
		lowStockThreshold?: number;
		status?: 'healthy' | 'low-stock' | 'out-of-stock';
	};

	let { quantity, lowStockThreshold = 10, status }: Props = $props();

	let derivedStatus = $derived.by(() => {
		if (status) return status;

		if (quantity <= 0) return 'out-of-stock';
		if (quantity <= lowStockThreshold) return 'low-stock';
		return 'healthy';
	});

	let variant: 'warning' | 'danger' | 'neutral' = $derived(
		derivedStatus === 'healthy'
			? 'neutral' // Normal stock shouldn't draw too much attention
			: derivedStatus === 'low-stock'
				? 'warning'
				: 'danger'
	);
</script>

<Badge {variant} size="sm">
	{quantity} units
</Badge>
