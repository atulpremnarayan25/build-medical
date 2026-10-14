<script lang="ts">
	import type { Snippet } from 'svelte';
	import { X } from '@lucide/svelte';

	type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

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
		lg: 'max-w-2xl',
		xl: 'max-w-4xl'
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
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 transition-all duration-150"
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
			class="w-full rounded-2xl border border-border bg-surface-overlay shadow-2xl outline-none overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100 {sizeClasses[
				size
			]}"
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-border/80 px-6 py-4 bg-surface/50">
				<h2 class="text-base font-semibold text-text-primary tracking-tight">{title}</h2>
				<button
					type="button"
					class="pressable cursor-pointer rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
					onclick={handleClose}
					aria-label="Close dialog"
				>
					<X class="h-4 w-4" />
				</button>
			</div>

			<!-- Body -->
			<div class="px-6 py-5 max-h-[80vh] overflow-y-auto">
				{@render children()}
			</div>

			<!-- Footer -->
			{#if footer}
				<div class="flex items-center justify-end gap-2.5 border-t border-border/80 px-6 py-4 bg-surface/30">
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
{/if}
