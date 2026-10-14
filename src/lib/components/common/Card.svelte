<script lang="ts">
	import type { Snippet } from 'svelte';

	type CardVariant = 'default' | 'double-bezel' | 'flat' | 'elevated' | 'interactive';
	type CardPadding = 'none' | 'sm' | 'md' | 'lg';

	interface CardProps {
		variant?: CardVariant;
		padding?: CardPadding;
		title?: string;
		subtitle?: string;
		class?: string;
		header?: Snippet;
		footer?: Snippet;
		badge?: Snippet;
		children?: Snippet;
		onclick?: (e: MouseEvent) => void;
	}

	let {
		variant = 'default',
		padding = 'md',
		title,
		subtitle,
		class: className = '',
		header,
		footer,
		badge,
		children,
		onclick
	}: CardProps = $props();

	const paddingClasses: Record<CardPadding, string> = {
		none: 'p-0',
		sm: 'p-3',
		md: 'p-4 sm:p-5',
		lg: 'p-6 sm:p-7'
	};

	const variantClasses: Record<CardVariant, string> = {
		default: 'bg-surface border border-border rounded-xl shadow-xs',
		'double-bezel': 'bezel-outer',
		flat: 'bg-surface-secondary border border-border/70 rounded-xl',
		elevated: 'bg-surface-elevated border border-border/80 rounded-xl shadow-md',
		interactive:
			'bg-surface border border-border rounded-xl shadow-xs hover:border-accent hover:shadow-sm pressable cursor-pointer'
	};
</script>

{#if variant === 'double-bezel'}
	<div class="{variantClasses[variant]} {className}" role={onclick ? 'button' : undefined} {onclick}>
		<div class="bezel-inner {paddingClasses[padding]}">
			{#if title || header || badge}
				<div class="mb-3.5 flex items-start justify-between gap-3 border-b border-border/50 pb-3">
					<div>
						{#if header}
							{@render header()}
						{:else if title}
							<h3 class="text-sm font-semibold text-text-primary">{title}</h3>
							{#if subtitle}
								<p class="text-xs text-text-muted mt-0.5">{subtitle}</p>
							{/if}
						{/if}
					</div>
					{#if badge}
						{@render badge()}
					{/if}
				</div>
			{/if}

			{#if children}
				{@render children()}
			{/if}

			{#if footer}
				<div class="mt-4 border-t border-border/50 pt-3">
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
{:else}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		class="{variantClasses[variant]} {paddingClasses[padding]} {className}"
		role={onclick ? 'button' : undefined}
		tabindex={onclick ? 0 : undefined}
		{onclick}
	>
		{#if title || header || badge}
			<div class="mb-3.5 flex items-start justify-between gap-3 border-b border-border/50 pb-3">
				<div>
					{#if header}
						{@render header()}
					{:else if title}
						<h3 class="text-sm font-semibold text-text-primary">{title}</h3>
						{#if subtitle}
							<p class="text-xs text-text-muted mt-0.5">{subtitle}</p>
						{/if}
					{/if}
				</div>
				{#if badge}
					{@render badge()}
				{/if}
			</div>
		{/if}

		{#if children}
			{@render children()}
		{/if}

		{#if footer}
			<div class="mt-4 border-t border-border/50 pt-3">
				{@render footer()}
			</div>
		{/if}
	</div>
{/if}
