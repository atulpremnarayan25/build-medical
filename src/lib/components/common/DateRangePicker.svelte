<script lang="ts">
	import { Calendar } from '@lucide/svelte';

	interface DateRangePickerProps {
		from?: string;
		to?: string;
		onchange?: () => void;
		class?: string;
	}

	let {
		from = $bindable(''),
		to = $bindable(''),
		onchange,
		class: className = ''
	}: DateRangePickerProps = $props();

	function formatDate(d: Date): string {
		return d.toISOString().split('T')[0];
	}

	function setPreset(preset: 'today' | 'yesterday' | '7d' | '30d' | 'this_month') {
		const now = new Date();
		const todayStr = formatDate(now);

		if (preset === 'today') {
			from = todayStr;
			to = todayStr;
		} else if (preset === 'yesterday') {
			const y = new Date(now);
			y.setDate(y.getDate() - 1);
			const yStr = formatDate(y);
			from = yStr;
			to = yStr;
		} else if (preset === '7d') {
			const past = new Date(now);
			past.setDate(past.getDate() - 7);
			from = formatDate(past);
			to = todayStr;
		} else if (preset === '30d') {
			const past = new Date(now);
			past.setDate(past.getDate() - 30);
			from = formatDate(past);
			to = todayStr;
		} else if (preset === 'this_month') {
			const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
			from = formatDate(startOfMonth);
			to = todayStr;
		}

		onchange?.();
	}
</script>

<div class="flex flex-wrap items-center gap-2 {className}">
	<div class="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs shadow-xs">
		<Calendar class="h-3.5 w-3.5 text-text-muted shrink-0" />
		<span class="text-text-muted text-[11px] font-medium uppercase tracking-wider">From:</span>
		<input
			type="date"
			bind:value={from}
			onchange={onchange}
			class="bg-transparent text-text-primary text-xs outline-none cursor-pointer"
		/>
		<span class="text-text-muted text-[11px] font-medium uppercase tracking-wider ml-1">To:</span>
		<input
			type="date"
			bind:value={to}
			onchange={onchange}
			class="bg-transparent text-text-primary text-xs outline-none cursor-pointer"
		/>
	</div>

	<div class="inline-flex rounded-lg border border-border bg-surface-secondary/70 p-0.5 text-xs">
		<button
			type="button"
			class="rounded px-2 py-0.5 text-[11px] font-medium text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
			onclick={() => setPreset('today')}
		>
			Today
		</button>
		<button
			type="button"
			class="rounded px-2 py-0.5 text-[11px] font-medium text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
			onclick={() => setPreset('7d')}
		>
			7D
		</button>
		<button
			type="button"
			class="rounded px-2 py-0.5 text-[11px] font-medium text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
			onclick={() => setPreset('30d')}
		>
			30D
		</button>
		<button
			type="button"
			class="rounded px-2 py-0.5 text-[11px] font-medium text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
			onclick={() => setPreset('this_month')}
		>
			Month
		</button>
	</div>
</div>
