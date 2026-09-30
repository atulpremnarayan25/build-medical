<script lang="ts">
	import type { Snippet } from 'svelte';

	type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral';
	type BadgeSize = 'sm' | 'md';

	interface BadgeProps {
		variant?: BadgeVariant;
		size?: BadgeSize;
		dot?: boolean;
		class?: string;
		children: Snippet;
	}

	let {
		variant = 'neutral',
		size = 'sm',
		dot = false,
		class: className = '',
		children
	}: BadgeProps = $props();

	const variantClasses: Record<BadgeVariant, string> = {
		success: 'bg-success-light text-success',
		danger: 'bg-danger-light text-danger',
		warning: 'bg-warning-light text-warning',
		info: 'bg-info-light text-info',
		neutral: 'bg-surface-hover text-text-secondary'
	};

	const dotColors: Record<BadgeVariant, string> = {
		success: 'bg-success',
		danger: 'bg-danger',
		warning: 'bg-warning',
		info: 'bg-info',
		neutral: 'bg-text-muted'
	};

	const sizeClasses: Record<BadgeSize, string> = {
		sm: 'px-2 py-0.5 text-xs',
		md: 'px-2.5 py-1 text-sm'
	};
</script>

<span
	class="inline-flex items-center gap-1.5 rounded-full font-medium {variantClasses[
		variant
	]} {sizeClasses[size]} {className}"
>
	{#if dot}
		<span class="h-1.5 w-1.5 rounded-full {dotColors[variant]}"></span>
	{/if}
	{@render children()}
</span>
