<script lang="ts">
	import Modal from './Modal.svelte';
	import Button from './Button.svelte';

	interface ConfirmDialogProps {
		open: boolean;
		onconfirm: () => void;
		oncancel: () => void;
		title?: string;
		message: string;
		confirmLabel?: string;
		cancelLabel?: string;
		variant?: 'danger' | 'warning';
	}

	let {
		open,
		onconfirm,
		oncancel,
		title = 'Are you sure?',
		message,
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		variant = 'danger'
	}: ConfirmDialogProps = $props();

	const confirmVariant = $derived(variant === 'danger' ? 'danger' : 'primary');
</script>

<Modal {open} onclose={oncancel} {title} size="sm">
	<p class="text-sm text-text-secondary">{message}</p>

	{#snippet footer()}
		<Button variant="secondary" size="md" onclick={oncancel}>
			{cancelLabel}
		</Button>
		<Button variant={confirmVariant} size="md" onclick={onconfirm}>
			{confirmLabel}
		</Button>
	{/snippet}
</Modal>
