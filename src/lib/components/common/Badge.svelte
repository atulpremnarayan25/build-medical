<script lang="ts">
	import type { Snippet } from 'svelte';

	type BadgeVariant =
		| 'success'
		| 'danger'
		| 'warning'
		| 'info'
		| 'neutral'
		| 'teal'
		| 'mint'
		| 'royal'
		| 'purple';
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
		success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
		danger: 'bg-rose-50 text-rose-700 border border-rose-200/60',
		warning: 'bg-amber-50 text-amber-800 border border-amber-200/60',
		info: 'bg-sky-50 text-sky-700 border border-sky-200/60',
		neutral: 'bg-slate-100 text-slate-700 border border-slate-200/60',
		teal: 'bg-teal-50 text-teal-700 border border-teal-200/80 font-semibold',
		mint: 'bg-teal-100 text-teal-900 border border-teal-300 font-semibold',
		royal: 'bg-blue-50 text-blue-700 border border-blue-200/80 font-semibold',
		purple: 'bg-purple-50 text-purple-700 border border-purple-200/80 font-semibold'
	};

	const dotColors: Record<BadgeVariant, string> = {
		success: 'bg-emerald-500',
		danger: 'bg-rose-500',
		warning: 'bg-amber-500',
		info: 'bg-sky-500',
		neutral: 'bg-slate-400',
		teal: 'bg-teal-600',
		mint: 'bg-teal-400',
		royal: 'bg-blue-600',
		purple: 'bg-purple-600'
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
