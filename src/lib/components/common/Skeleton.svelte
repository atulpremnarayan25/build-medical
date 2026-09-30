<script lang="ts">
	type RoundedType = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

	let {
		class: className = '',
		rounded = 'md',
		pulse = true
	} = $props<{
		class?: string;
		rounded?: RoundedType;
		pulse?: boolean;
	}>();

	const roundedClasses: Record<RoundedType, string> = {
		none: 'rounded-none',
		sm: 'rounded-sm',
		md: 'rounded-md',
		lg: 'rounded-lg',
		xl: 'rounded-xl',
		full: 'rounded-full'
	};
</script>

<div
	class="bg-border/60 {roundedClasses[rounded as RoundedType]} {pulse
		? 'animate-pulse'
		: ''} {className}"
	aria-hidden="true"
></div>
