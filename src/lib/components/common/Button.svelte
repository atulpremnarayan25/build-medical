<script lang="ts">
	import type { Snippet } from 'svelte';

	type ButtonVariant = 'primary' | 'royal' | 'teal' | 'mint' | 'secondary' | 'outline' | 'danger' | 'ghost';
	type ButtonSize = 'sm' | 'md' | 'lg';

	interface ButtonProps {
		variant?: ButtonVariant;
		size?: ButtonSize;
		disabled?: boolean;
		type?: 'button' | 'submit';
		class?: string;
		'data-testid'?: string;
		onclick?: (e: MouseEvent) => void;
		children: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		type = 'button',
		class: className = '',
		'data-testid': dataTestId,
		onclick,
		children
	}: ButtonProps = $props();

	const variantClasses: Record<ButtonVariant, string> = {
		primary: 'bg-teal-600 text-white shadow-xs hover:bg-teal-700 active:scale-[0.98] disabled:bg-teal-600/50',
		royal: 'bg-[#1d4ed8] text-white shadow-xs hover:bg-blue-700 active:scale-[0.98] disabled:bg-blue-600/50',
		teal: 'bg-teal-600 text-white shadow-xs hover:bg-teal-700 active:scale-[0.98] disabled:bg-teal-600/50',
		mint: 'bg-[#2dd4bf] text-slate-900 font-bold shadow-xs hover:bg-teal-300 active:scale-[0.98] disabled:opacity-50',
		secondary:
			'bg-white text-slate-800 border border-slate-200 shadow-2xs hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] disabled:opacity-50',
		outline:
			'bg-transparent border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] disabled:opacity-50',
		danger: 'bg-rose-600 text-white shadow-xs hover:bg-rose-700 active:scale-[0.98] disabled:bg-rose-400',
		ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50'
	};

	const sizeClasses: Record<ButtonSize, string> = {
		sm: 'px-3 py-1.5 min-h-[36px] text-xs',
		md: 'px-4 py-2 min-h-[44px] text-xs sm:text-sm font-medium',
		lg: 'px-5 py-2.5 min-h-[48px] text-sm sm:text-base font-semibold'
	};
</script>

<button
	{type}
	{disabled}
	data-testid={dataTestId}
	class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:pointer-events-none {variantClasses[
		variant
	]} {sizeClasses[size]} {className}"
	{onclick}
>
	{@render children()}
</button>
