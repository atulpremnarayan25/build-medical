<script lang="ts">
	import type { Snippet } from 'svelte';
	import { X } from '@lucide/svelte';

	interface InputProps {
		label?: string;
		name: string;
		type?: string;
		value?: string;
		placeholder?: string;
		error?: string;
		required?: boolean;
		disabled?: boolean;
		class?: string;
		shortcut?: string;
		prefixIcon?: Snippet;
		suffixIcon?: Snippet;
		clearable?: boolean;
		oninput?: (e: Event) => void;
		onkeydown?: (e: KeyboardEvent) => void;
	}

	let {
		label,
		name,
		type = 'text',
		value = $bindable(''),
		placeholder = '',
		error = '',
		required = false,
		disabled = false,
		class: className = '',
		shortcut,
		prefixIcon,
		suffixIcon,
		clearable = false,
		oninput,
		onkeydown
	}: InputProps = $props();

	function handleClear() {
		value = '';
	}
</script>

<div class="flex flex-col gap-1.5 {className}">
	{#if label}
		<div class="flex items-center justify-between">
			<label for={name} class="text-xs font-semibold tracking-wide text-text-secondary">
				{label}
				{#if required}
					<span class="text-danger ml-0.5" aria-label="required">*</span>
				{/if}
			</label>
			{#if shortcut}
				<span class="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[10px] font-mono text-text-muted bg-surface-secondary">
					{shortcut}
				</span>
			{/if}
		</div>
	{/if}

	<div class="relative flex items-center">
		{#if prefixIcon}
			<div class="pointer-events-none absolute left-3 flex items-center text-text-muted">
				{@render prefixIcon()}
			</div>
		{/if}

		<input
			{type}
			id={name}
			{name}
			bind:value
			{placeholder}
			{required}
			{disabled}
			{oninput}
			{onkeydown}
			class="w-full rounded-lg border px-3 py-1.5 text-sm text-text-primary transition-all outline-none placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:bg-surface-hover disabled:opacity-60 {error
				? 'border-danger focus:border-danger focus:ring-danger/15'
				: 'border-border'} bg-surface {prefixIcon ? 'pl-9' : ''} {suffixIcon || (clearable && value) ? 'pr-9' : ''}"
		/>

		{#if clearable && value && !disabled}
			<button
				type="button"
				class="absolute right-2.5 flex items-center text-text-muted hover:text-text-primary p-0.5 rounded cursor-pointer transition-colors"
				onclick={handleClear}
				aria-label="Clear input"
			>
				<X class="h-3.5 w-3.5" />
			</button>
		{:else if suffixIcon}
			<div class="pointer-events-none absolute right-3 flex items-center text-text-muted">
				{@render suffixIcon()}
			</div>
		{/if}
	</div>

	{#if error}
		<p class="text-xs font-medium text-danger" role="alert">{error}</p>
	{/if}
</div>
