<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Loader2 } from '@lucide/svelte';

	type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
	type ButtonSize = 'sm' | 'md' | 'lg';

	interface ButtonProps {
		variant?: ButtonVariant;
		size?: ButtonSize;
		disabled?: boolean;
		loading?: boolean;
		type?: 'button' | 'submit' | 'reset';
		class?: string;
		'data-testid'?: string;
		onclick?: (e: MouseEvent) => void;
		icon?: Snippet;
		children?: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		type = 'button',
		class: className = '',
		'data-testid': dataTestId,
		onclick,
		icon,
		children
	}: ButtonProps = $props();

	const variantClasses: Record<ButtonVariant, string> = {
		primary:
			'bg-accent text-white shadow-xs hover:bg-accent-hover active:bg-accent-hover/90 disabled:bg-accent/50 border border-accent/20',
		secondary:
			'bg-surface text-text-primary border border-border shadow-xs hover:bg-surface-hover hover:border-border-strong disabled:opacity-50',
		outline:
			'bg-transparent border border-border text-text-primary hover:bg-surface-hover hover:border-border-strong disabled:opacity-50',
		danger:
			'bg-danger text-white shadow-xs hover:bg-danger/90 active:bg-danger/80 disabled:bg-danger/50 border border-danger/20',
		ghost: 'bg-transparent text-text-secondary hover:bg-surface-hover disabled:opacity-50'
	};

	const sizeClasses: Record<ButtonSize, string> = {
		sm: 'px-2.5 py-1 text-xs rounded-md font-medium',
		md: 'px-3.5 py-1.5 text-sm rounded-lg font-medium',
		lg: 'px-4.5 py-2 text-base rounded-lg font-semibold'
	};
</script>

<button
	{type}
	disabled={disabled || loading}
	data-testid={dataTestId}
	class="pressable inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:pointer-events-none {variantClasses[
		variant
	]} {sizeClasses[size]} {className}"
	{onclick}
>
	{#if loading}
		<Loader2 class="h-4 w-4 animate-spin shrink-0 text-current" />
	{:else if icon}
		{@render icon()}
	{/if}
	{#if children}
		{@render children()}
	{/if}
</button>
