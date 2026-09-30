<script lang="ts">
	interface InputProps {
		label: string;
		name: string;
		type?: string;
		value?: string;
		placeholder?: string;
		error?: string;
		required?: boolean;
		disabled?: boolean;
		class?: string;
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
		class: className = ''
	}: InputProps = $props();
</script>

<div class="flex flex-col gap-1 {className}">
	<label for={name} class="text-sm font-medium text-text-primary">
		{label}
		{#if required}
			<span class="text-danger" aria-label="required">*</span>
		{/if}
	</label>

	<input
		{type}
		id={name}
		{name}
		bind:value
		{placeholder}
		{required}
		{disabled}
		class="rounded-md border px-3 py-1.5 text-sm text-text-primary transition-colors outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:bg-surface-hover disabled:opacity-60 {error
			? 'border-danger'
			: 'border-border'} bg-surface"
	/>

	{#if error}
		<p class="text-xs text-danger" role="alert">{error}</p>
	{/if}
</div>
