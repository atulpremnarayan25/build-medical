<script lang="ts">
	import { Modal, Button } from '$lib/components/common';
	import { Keyboard } from '@lucide/svelte';

	interface Props {
		open?: boolean;
		onclose?: () => void;
	}

	let { open = $bindable(false), onclose }: Props = $props();

	const shortcuts = [
		{ key: 'F2', label: 'Product Search', desc: 'Focus medicine search input' },
		{ key: 'F3', label: 'Customer Search', desc: 'Focus customer name/phone search' },
		{ key: 'F4', label: 'Payment Mode', desc: 'Cycle Cash → UPI / Bank → Credit' },
		{ key: 'F6', label: 'Hold / Recall Bill', desc: 'Save current draft or recall held bills' },
		{ key: 'F8', label: 'Sale Type', desc: 'Toggle Retail ⟷ Wholesale pricing' },
		{ key: 'Ctrl + S', label: 'Save & Print', desc: 'Complete sale and open print invoice' },
		{ key: 'Enter', label: 'Next Cell', desc: 'Advance from Qty → Rate → Disc% → Search' },
		{ key: 'Ctrl + Del', label: 'Delete Row', desc: 'Remove currently active line item' },
		{ key: 'Esc', label: 'Close / Cancel', desc: 'Dismiss active dropdown or modal' },
		{ key: '?', label: 'Help / Shortcuts', desc: 'Toggle this keyboard shortcut guide' }
	];
</script>

<Modal {open} {onclose} title="Billing Keyboard Shortcuts (High-Speed POS)" size="md">
	<div class="space-y-4">
		<div class="flex items-center gap-2 rounded-md bg-accent-light/50 p-2.5 text-xs text-text-primary">
			<Keyboard size={18} class="text-accent shrink-0" />
			<span>Use keyboard shortcuts for 100% mouse-free rapid invoice generation.</span>
		</div>

		<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
			{#each shortcuts as sc}
				<div class="flex items-center justify-between rounded-md border border-border bg-surface-secondary px-3 py-2">
					<div>
						<div class="text-xs font-semibold text-text-primary">{sc.label}</div>
						<div class="text-[11px] text-text-muted">{sc.desc}</div>
					</div>
					<kbd class="rounded border border-border-strong bg-surface px-2 py-0.5 font-mono text-xs font-bold text-accent shadow-2xs">
						{sc.key}
					</kbd>
				</div>
			{/each}
		</div>
	</div>

	{#snippet footer()}
		<Button variant="secondary" size="sm" onclick={onclose}>Close</Button>
	{/snippet}
</Modal>
