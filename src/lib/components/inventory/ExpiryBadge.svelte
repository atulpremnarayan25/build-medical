<script lang="ts">
	import { Badge } from '$lib/components/common';

	type Props = {
		date: string; // YYYY-MM or YYYY-MM-DD
		status?: 'healthy' | 'expiring-soon' | 'expired'; // If backend provides status, use it
	};

	let { date, status }: Props = $props();

	// If status not provided, calculate roughly
	let derivedStatus = $derived.by(() => {
		if (status) return status;

		const expiryDate = new Date(date);
		const now = new Date();
		const diffTime = expiryDate.getTime() - now.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays < 0) return 'expired';
		if (diffDays <= 90) return 'expiring-soon';
		return 'healthy';
	});

	let variant: 'success' | 'warning' | 'danger' = $derived(
		derivedStatus === 'healthy'
			? 'success'
			: derivedStatus === 'expiring-soon'
				? 'warning'
				: 'danger'
	);

	let formattedDate = $derived.by(() => {
		try {
			const d = new Date(date);
			return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
		} catch {
			return date;
		}
	});
</script>

<Badge {variant} size="sm" dot={true}>
	{formattedDate}
</Badge>
