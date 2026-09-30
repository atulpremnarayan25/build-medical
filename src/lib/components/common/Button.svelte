<script lang="ts">
	import type { Snippet } from 'svelte';

	type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
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
		primary: 'bg-accent text-white hover:bg-accent-hover disabled:bg-accent/50',
		secondary:
			'bg-surface text-text-primary border border-border hover:bg-surface-hover disabled:opacity-50',
		outline:
			'bg-transparent border border-border text-text-primary hover:bg-surface-hover hover:border-border-strong disabled:opacity-50',
		danger: 'bg-danger text-white hover:bg-danger/90 disabled:bg-danger/50',
		ghost: 'bg-transparent text-text-secondary hover:bg-surface-hover disabled:opacity-50'
	};

	const sizeClasses: Record<ButtonSize, string> = {
		sm: 'px-2.5 py-1 text-xs',
		md: 'px-3.5 py-1.5 text-sm',
		lg: 'px-4 py-2 text-base font-semibold'
	};
</script>

<button
	{type}
	{disabled}
	data-testid={dataTestId}
	class="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed {variantClasses[
		variant
	]} {sizeClasses[size]} {className}"
	{onclick}
>
	{@render children()}
</button>
