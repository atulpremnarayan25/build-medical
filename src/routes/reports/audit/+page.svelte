<script lang="ts">
	import { onMount } from 'svelte';
	import {
		PageHeader,
		LoadingState,
		EmptyState,
		Button,
		Badge,
		Modal
	} from '$lib/components/common/index.js';
	import { formatDateTime } from '$lib/utils/formatters.js';
	import {
		ShieldAlert,
		FileSpreadsheet,
		Search,
		Filter,
		Calendar,
		User,
		Clock,
		ArrowRight,
		SlidersHorizontal,
		RotateCcw,
		Eye,
		Activity,
		Database
	} from '@lucide/svelte';

	interface AuditEntry {
		id: string;
		storeId: string;
		entityType: string;
		entityId: string;
		action: string;
		performedBy: string | null;
		performedByName: string | null;
		performedByUsername: string | null;
		beforeValue: Record<string, any> | null;
		afterValue: Record<string, any> | null;
		createdAt: string;
	}

	interface AuditSummary {
		totalEvents: number;
		adjustmentsCount: number;
		masterChangesCount: number;
		cancellationsCount: number;
	}

	let entries = $state<AuditEntry[]>([]);
	let summary = $state<AuditSummary>({
		totalEvents: 0,
		adjustmentsCount: 0,
		masterChangesCount: 0,
		cancellationsCount: 0
	});
	let total = $state(0);
	let loading = $state(true);

	// Filters
	let searchQuery = $state('');
	let actionFilter = $state('all');
	let entityFilter = $state('all');
	let datePreset = $state<'today' | 'week' | 'month' | 'all'>('month');
	let fromDate = $state('');
	let toDate = $state('');
	let searchTimer: ReturnType<typeof setTimeout> | null = null;

	// Inspector Modal
	let inspectModalOpen = $state(false);
	let selectedEntry = $state<AuditEntry | null>(null);

	function setDateRange(preset: 'today' | 'week' | 'month' | 'all') {
		datePreset = preset;
		const now = new Date();
		const todayStr = now.toISOString().split('T')[0];

		if (preset === 'today') {
			fromDate = todayStr;
			toDate = todayStr;
		} else if (preset === 'week') {
			const w = new Date(now);
			w.setDate(w.getDate() - 7);
			fromDate = w.toISOString().split('T')[0];
			toDate = todayStr;
		} else if (preset === 'month') {
			const m = new Date(now.getFullYear(), now.getMonth(), 1);
			fromDate = m.toISOString().split('T')[0];
			toDate = todayStr;
		} else {
			fromDate = '';
			toDate = '';
		}
		loadAuditLogs();
	}

	async function loadAuditLogs() {
		loading = true;
		try {
			const params = new URLSearchParams();
			if (fromDate) params.append('from', fromDate);
			if (toDate) params.append('to', toDate);
			if (actionFilter !== 'all') params.append('action', actionFilter);
			if (entityFilter !== 'all') params.append('entityType', entityFilter);
			if (searchQuery.trim()) params.append('search', searchQuery.trim());
			params.append('limit', '100');

			const res = await fetch(`/api/reports/audit?${params.toString()}`);
			if (res.ok) {
				const data = await res.json();
				entries = data.items || [];
				total = data.total || 0;
				if (data.summary) {
					summary = data.summary;
				}
			}
		} catch (err) {
			console.error('Failed to load statutory audit trail:', err);
		} finally {
			loading = false;
		}
	}

	function handleSearchInput() {
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			loadAuditLogs();
		}, 300);
	}

	function resetFilters() {
		searchQuery = '';
		actionFilter = 'all';
		entityFilter = 'all';
		setDateRange('month');
	}

	function openInspect(entry: AuditEntry) {
		selectedEntry = entry;
		inspectModalOpen = true;
	}

	function closeInspect() {
		inspectModalOpen = false;
		selectedEntry = null;
	}

	function getActionBadgeVariant(action: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
		switch (action) {
			case 'create':
				return 'success';
			case 'adjust':
				return 'warning';
			case 'cancel':
			case 'delete':
				return 'danger';
			case 'update':
			case 'settings_change':
				return 'info';
			default:
				return 'neutral';
		}
	}

	function exportAuditCsv() {
		if (entries.length === 0) return;

		const headers = [
			'Timestamp',
			'Action',
			'Entity Type',
			'Entity ID',
			'Performed By Name',
			'Performed By Username',
			'Before Summary',
			'After Summary'
		];

		const rows = entries.map((e) => [
			`"${e.createdAt}"`,
			`"${e.action.toUpperCase()}"`,
			`"${e.entityType}"`,
			`"${e.entityId}"`,
			`"${e.performedByName || 'System'}"`,
			`"${e.performedByUsername || '-'}"`,
			`"${e.beforeValue ? JSON.stringify(e.beforeValue).replace(/"/g, '""') : '-'}"`,
			`"${e.afterValue ? JSON.stringify(e.afterValue).replace(/"/g, '""') : '-'}"`
		]);

		const csvContent =
			'data:text/csv;charset=utf-8,' +
			[headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', encodedUri);
		link.setAttribute('download', `statutory_audit_trail_${fromDate || 'all'}_to_${toDate || 'all'}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	onMount(() => {
		setDateRange('month');
	});
</script>

<svelte:head>
	<title>Statutory Audit Trail & Activity Log - MedStock ERP</title>
</svelte:head>

<div class="space-y-4">
	<!-- Page Header -->
	<PageHeader
		title="Statutory Audit Trail & System Log"
		subtitle="Append-only regulatory audit log of stock adjustments, user actions, void vouchers, and master data modifications"
		backHref="/reports"
	>
		{#snippet actions()}
			<div class="flex items-center gap-2">
				<Button
					variant="secondary"
					size="sm"
					onclick={exportAuditCsv}
					disabled={entries.length === 0}
				>
					<FileSpreadsheet size={14} class="mr-1 text-success" />
					<span>Export Audit CSV</span>
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	<!-- KPI Summary Row -->
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		<div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
			<div class="flex items-center gap-2 text-xs font-medium text-text-muted">
				<Activity size={14} class="text-accent" />
				<span>Total Logged Events</span>
			</div>
			<div class="mt-2 text-xl font-bold text-text-primary">
				{summary.totalEvents.toLocaleString('en-IN')}
			</div>
			<div class="mt-1 text-[11px] text-text-muted">Lifetime store mutations</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
			<div class="flex items-center gap-2 text-xs font-medium text-text-muted">
				<SlidersHorizontal size={14} class="text-warning" />
				<span>Inventory Adjustments</span>
			</div>
			<div class="mt-2 text-xl font-bold text-warning">
				{summary.adjustmentsCount.toLocaleString('en-IN')}
			</div>
			<div class="mt-1 text-[11px] text-text-muted">Stock damage / correction events</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
			<div class="flex items-center gap-2 text-xs font-medium text-text-muted">
				<Database size={14} class="text-info" />
				<span>Master & Config Updates</span>
			</div>
			<div class="mt-2 text-xl font-bold text-info">
				{summary.masterChangesCount.toLocaleString('en-IN')}
			</div>
			<div class="mt-1 text-[11px] text-text-muted">Product, user & setting modifications</div>
		</div>

		<div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
			<div class="flex items-center gap-2 text-xs font-medium text-text-muted">
				<ShieldAlert size={14} class="text-danger" />
				<span>Cancellations & Voids</span>
			</div>
			<div class="mt-2 text-xl font-bold text-danger">
				{summary.cancellationsCount.toLocaleString('en-IN')}
			</div>
			<div class="mt-1 text-[11px] text-text-muted">Void transactions / cancellations</div>
		</div>
	</div>

	<!-- Controls & Filters Bar -->
	<div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
		<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
			<!-- Date Presets -->
			<div class="flex flex-wrap items-center gap-1.5 text-xs">
				<span class="mr-1 font-medium text-text-secondary">Period:</span>
				<button
					class="rounded-lg px-2.5 py-1 font-medium transition-colors {datePreset === 'today'
						? 'bg-accent text-white'
						: 'bg-surface-secondary text-text-secondary hover:bg-surface-hover'}"
					onclick={() => setDateRange('today')}
				>
					Today
				</button>
				<button
					class="rounded-lg px-2.5 py-1 font-medium transition-colors {datePreset === 'week'
						? 'bg-accent text-white'
						: 'bg-surface-secondary text-text-secondary hover:bg-surface-hover'}"
					onclick={() => setDateRange('week')}
				>
					Last 7 Days
				</button>
				<button
					class="rounded-lg px-2.5 py-1 font-medium transition-colors {datePreset === 'month'
						? 'bg-accent text-white'
						: 'bg-surface-secondary text-text-secondary hover:bg-surface-hover'}"
					onclick={() => setDateRange('month')}
				>
					This Month
				</button>
				<button
					class="rounded-lg px-2.5 py-1 font-medium transition-colors {datePreset === 'all'
						? 'bg-accent text-white'
						: 'bg-surface-secondary text-text-secondary hover:bg-surface-hover'}"
					onclick={() => setDateRange('all')}
				>
					All Time
				</button>
			</div>

			<!-- Filter Dropdowns & Search -->
			<div class="flex flex-wrap items-center gap-2">
				<!-- Action Filter -->
				<select
					bind:value={actionFilter}
					onchange={loadAuditLogs}
					class="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-primary focus:border-accent focus:outline-hidden"
				>
					<option value="all">All Actions</option>
					<option value="adjust">Stock Adjust</option>
					<option value="cancel">Cancel / Void</option>
					<option value="create">Create</option>
					<option value="update">Update</option>
					<option value="delete">Delete</option>
					<option value="settings_change">Settings Change</option>
				</select>

				<!-- Entity Type Filter -->
				<select
					bind:value={entityFilter}
					onchange={loadAuditLogs}
					class="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-primary focus:border-accent focus:outline-hidden"
				>
					<option value="all">All Entities</option>
					<option value="batch">Batches / Stock</option>
					<option value="product">Products</option>
					<option value="sale">Sales Invoices</option>
					<option value="purchase">Purchases / GRN</option>
					<option value="return">Returns</option>
					<option value="user">Users</option>
					<option value="settings">Store Settings</option>
				</select>

				<!-- Search Input -->
				<div class="relative min-w-[200px] flex-1 sm:w-60">
					<Search size={14} class="absolute top-1/2 left-2.5 -translate-y-1/2 text-text-muted" />
					<input
						type="text"
						placeholder="Search user, entity..."
						bind:value={searchQuery}
						oninput={handleSearchInput}
						class="w-full rounded-lg border border-border bg-surface py-1.5 pr-2.5 pl-8 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-hidden"
					/>
				</div>

				<Button variant="ghost" size="sm" onclick={resetFilters}>
					<RotateCcw size={14} />
				</Button>
			</div>
		</div>
	</div>

	<!-- Results Table -->
	<div class="overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
		{#if loading}
			<div class="p-8">
				<LoadingState message="Querying regulatory audit log records..." />
			</div>
		{:else if entries.length === 0}
			<div class="p-8">
				<EmptyState
					title="No Audit Records Found"
					message="No system mutation events matched the selected filters or time window."
				/>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead class="border-b border-border bg-surface-secondary text-text-secondary">
						<tr>
							<th class="px-4 py-3 font-semibold">Timestamp</th>
							<th class="px-4 py-3 font-semibold">Action</th>
							<th class="px-4 py-3 font-semibold">Entity Type</th>
							<th class="px-4 py-3 font-semibold">Entity Reference</th>
							<th class="px-4 py-3 font-semibold">Performed By</th>
							<th class="px-4 py-3 text-right font-semibold">Inspection</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each entries as entry (entry.id)}
							<tr class="transition-colors hover:bg-surface-hover">
								<td class="px-4 py-3 font-mono text-[11px] text-text-muted whitespace-nowrap">
									{formatDateTime(entry.createdAt)}
								</td>
								<td class="px-4 py-3 whitespace-nowrap">
									<Badge variant={getActionBadgeVariant(entry.action)}>
										{entry.action.toUpperCase()}
									</Badge>
								</td>
								<td class="px-4 py-3 font-medium text-text-primary capitalize whitespace-nowrap">
									{entry.entityType}
								</td>
								<td class="px-4 py-3 font-mono text-[11px] text-text-secondary">
									<span class="inline-block max-w-[180px] truncate" title={entry.entityId}>
										{entry.entityId}
									</span>
								</td>
								<td class="px-4 py-3 whitespace-nowrap">
									<div class="flex items-center gap-1.5">
										<div class="flex h-5 w-5 items-center justify-center rounded-full bg-accent-light text-[10px] font-bold text-accent">
											{entry.performedByName ? entry.performedByName.charAt(0).toUpperCase() : 'S'}
										</div>
										<span class="font-medium text-text-primary">
											{entry.performedByName || 'System / Auto'}
										</span>
										{#if entry.performedByUsername}
											<span class="text-[10px] text-text-muted">(@{entry.performedByUsername})</span>
										{/if}
									</div>
								</td>
								<td class="px-4 py-3 text-right whitespace-nowrap">
									<Button
										variant="ghost"
										size="sm"
										onclick={() => openInspect(entry)}
									>
										<Eye size={14} class="mr-1 text-accent" />
										<span>Inspect</span>
									</Button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="border-t border-border bg-surface-secondary px-4 py-2.5 text-xs text-text-muted">
				Showing {entries.length} of {total} audit records
			</div>
		{/if}
	</div>
</div>

<!-- Change Details Inspector Modal -->
{#if inspectModalOpen && selectedEntry}
	<Modal
		title="Statutory Audit Record Inspection"
		open={inspectModalOpen}
		onclose={closeInspect}
	>
		<div class="space-y-4">
			<div class="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface-secondary p-3 text-xs">
				<div>
					<span class="text-text-muted">Event ID:</span>
					<p class="font-mono text-[11px] text-text-primary">{selectedEntry.id}</p>
				</div>
				<div>
					<span class="text-text-muted">Timestamp:</span>
					<p class="font-mono text-[11px] text-text-primary">{formatDateTime(selectedEntry.createdAt)}</p>
				</div>
				<div>
					<span class="text-text-muted">Action & Entity:</span>
					<p class="font-medium text-text-primary capitalize">{selectedEntry.action} on {selectedEntry.entityType}</p>
				</div>
				<div>
					<span class="text-text-muted">Actor / User:</span>
					<p class="font-medium text-text-primary">{selectedEntry.performedByName || 'System'} ({selectedEntry.performedByUsername || 'auto'})</p>
				</div>
			</div>

			<!-- Before vs After Payloads -->
			<div class="grid gap-3 sm:grid-cols-2">
				<div class="rounded-lg border border-border bg-surface p-3">
					<div class="mb-2 text-xs font-semibold text-text-secondary">Before State</div>
					{#if selectedEntry.beforeValue}
						<pre class="max-h-60 overflow-auto rounded bg-surface-secondary p-2 font-mono text-[10px] leading-tight text-text-primary">{JSON.stringify(selectedEntry.beforeValue, null, 2)}</pre>
					{:else}
						<p class="text-xs text-text-muted italic">None (New entity creation or no prior snapshot)</p>
					{/if}
				</div>

				<div class="rounded-lg border border-border bg-surface p-3">
					<div class="mb-2 text-xs font-semibold text-text-secondary">After State / Recorded Delta</div>
					{#if selectedEntry.afterValue}
						<pre class="max-h-60 overflow-auto rounded bg-surface-secondary p-2 font-mono text-[10px] leading-tight text-text-primary">{JSON.stringify(selectedEntry.afterValue, null, 2)}</pre>
					{:else}
						<p class="text-xs text-text-muted italic">None (Deletion or empty delta)</p>
					{/if}
				</div>
			</div>

			<div class="flex justify-end pt-2">
				<Button variant="secondary" size="sm" onclick={closeInspect}>
					Close Inspection
				</Button>
			</div>
		</div>
	</Modal>
{/if}
