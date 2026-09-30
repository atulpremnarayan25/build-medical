<script lang="ts">
	import type { Snippet } from 'svelte';

	type ModalSize = 'sm' | 'md' | 'lg';

	interface ModalProps {
		open?: boolean;
		onclose?: () => void;
		title: string;
		size?: ModalSize;
		children: Snippet;
		footer?: Snippet;
	}

	let {
		open = $bindable(false),
		onclose,
		title,
		size = 'md',
		children,
		footer
	}: ModalProps = $props();

	const sizeClasses: Record<ModalSize, string> = {
		sm: 'max-w-sm',
		md: 'max-w-lg',
		lg: 'max-w-2xl'
	};

	function handleClose() {
		open = false;
		onclose?.();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			handleClose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			handleClose();
		}
	}

	let dialogEl: HTMLDivElement | undefined = $state();

	$effect(() => {
		if (open && dialogEl) {
			// Focus the dialog container when opened
			dialogEl.focus();
		}
	});

	$effect(() => {
		if (open) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}

		return () => {
			document.body.style.overflow = '';
		};
	});
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 transition-opacity"
		role="dialog"
		aria-modal="true"
		aria-label={title}
		tabindex="-1"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
	>
		<div
			bind:this={dialogEl}
			tabindex="-1"
			class="w-full rounded-lg border border-border bg-surface shadow-lg outline-none {sizeClasses[
				size
			]}"
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-border px-5 py-3.5">
				<h2 class="text-base font-semibold text-text-primary">{title}</h2>
				<button
					type="button"
					class="cursor-pointer rounded p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
					onclick={handleClose}
					aria-label="Close"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
			</div>

			<!-- Body -->
			<div class="px-5 py-4">
				{@render children()}
			</div>

			<!-- Footer -->
			{#if footer}
				<div class="flex items-center justify-end gap-2 border-t border-border px-5 py-3.5">
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
{/if}
