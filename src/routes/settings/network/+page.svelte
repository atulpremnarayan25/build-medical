<script lang="ts">
	import { PageHeader, Button, Badge } from '$lib/components/common';
	import { addToast } from '$lib/stores/toastStore.svelte.js';
	import {
		Wifi,
		Network,
		QrCode,
		Copy,
		Check,
		RefreshCw,
		Monitor,
		Tablet,
		ShieldCheck,
		ArrowLeft,
		Laptop,
		Radio
	} from '@lucide/svelte';

	let { data } = $props();

	let remoteTopology = $state<any>(null);
	let topology = $derived(remoteTopology || data.topology);

	let customIp = $state('');
	let selectedIp = $derived(customIp || topology.primaryIp);

	let isRefreshing = $state(false);
	let copied = $state(false);

	let pairingUrl = $derived(`http://${selectedIp}:${topology.port}`);

	// Format uptime nicely
	function formatUptime(seconds: number): string {
		const days = Math.floor(seconds / 86400);
		const hrs = Math.floor((seconds % 86400) / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		if (days > 0) return `${days}d ${hrs}h ${mins}m`;
		if (hrs > 0) return `${hrs}h ${mins}m`;
		return `${mins}m ${seconds % 60}s`;
	}

	async function refreshTopology(ip?: string) {
		isRefreshing = true;
		try {
			const targetIp = ip || selectedIp;
			const res = await fetch(`/api/settings/network?ip=${encodeURIComponent(targetIp)}`);
			const json = await res.json();
			if (res.ok && json.data) {
				remoteTopology = json.data;
				customIp = json.data.primaryIp;
				addToast('success', 'Network topology updated');
			} else {
				addToast('error', json.error?.message || 'Failed to refresh network');
			}
		} catch (err: any) {
			addToast('error', err.message || 'Failed to communicate with server');
		} finally {
			isRefreshing = false;
		}
	}

	function copyPairingUrl() {
		navigator.clipboard.writeText(pairingUrl);
		copied = true;
		addToast('info', 'Pairing URL copied to clipboard');
		setTimeout(() => {
			copied = false;
		}, 2500);
	}
</script>

<svelte:head>
	<title>Local LAN Pairing & Terminals - MedStock ERP</title>
</svelte:head>

<div class="mb-4 flex items-center justify-between">
	<a
		href="/settings"
		class="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary"
	>
		<ArrowLeft size={14} /> Back to Settings
	</a>
	<div class="flex items-center gap-2">
		<Button
			variant="secondary"
			size="sm"
			class="gap-1.5"
			disabled={isRefreshing}
			onclick={() => refreshTopology()}
		>
			<RefreshCw size={14} class={isRefreshing ? 'animate-spin' : ''} />
			Refresh Status
		</Button>
	</div>
</div>

<PageHeader
	title="Local LAN Pairing & Terminal Connectivity"
	subtitle="Pair tablet POS counters, mobile billing scanners, and cashier laptops over local store Wi-Fi"
/>

<!-- Status Overview Banner -->
<div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
	<!-- Server Status Card -->
	<div class="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 shadow-2xs">
		<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-success-light text-success">
			<ShieldCheck size={24} />
		</div>
		<div>
			<div class="flex items-center gap-2">
				<span class="text-xs font-semibold text-text-muted">Store Server Status</span>
				<span class="inline-block h-2 w-2 rounded-full bg-success animate-pulse"></span>
			</div>
			<div class="mt-0.5 text-base font-bold text-text-primary">
				Local LAN Server Healthy
			</div>
			<div class="text-[11px] text-text-muted font-mono">
				Uptime: {formatUptime(topology.uptimeSeconds)}
			</div>
		</div>
	</div>

	<!-- Connected Devices Card -->
	<div class="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 shadow-2xs">
		<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-light text-accent">
			<Tablet size={24} />
		</div>
		<div>
			<span class="text-xs font-semibold text-text-muted">Active Counter Devices</span>
			<div class="mt-0.5 text-base font-bold text-text-primary">
				{topology.connectedDevicesCount} Connected {topology.connectedDevicesCount === 1 ? 'Terminal' : 'Terminals'}
			</div>
			<div class="text-[11px] text-text-muted">
				Primary + secondary wireless sessions
			</div>
		</div>
	</div>

	<!-- Offline Architecture Card -->
	<div class="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 shadow-2xs">
		<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light text-primary">
			<Radio size={24} />
		</div>
		<div>
			<span class="text-xs font-semibold text-text-muted">Deployment Topology</span>
			<div class="mt-0.5 text-base font-bold text-text-primary">
				Zero-Internet LAN Appliance
			</div>
			<div class="text-[11px] text-text-muted">
				100% Autonomous local database
			</div>
		</div>
	</div>
</div>

<!-- Main Pairing Grid -->
<div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
	<!-- Left Col: QR Code & Instant Pairing -->
	<div class="flex flex-col items-center rounded-xl border border-border bg-surface p-6 text-center shadow-2xs lg:col-span-5">
		<div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
			<QrCode size={16} /> Instant Counter Pairing
		</div>
		<h3 class="mt-1 text-sm font-bold text-text-primary">
			Scan with Counter Tablet or Cashier Phone
		</h3>
		<p class="mt-1 text-xs text-text-muted">
			Connect to store Wi-Fi, then point camera at the code below.
		</p>

		<!-- QR Code SVG Container -->
		<div class="mt-5 rounded-2xl border-2 border-border bg-white p-4 shadow-md transition-transform hover:scale-102">
			{#if topology.qrCodeSvg}
				<div class="flex items-center justify-center w-56 h-56">
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html topology.qrCodeSvg}
				</div>
			{:else}
				<div class="flex h-56 w-56 items-center justify-center text-xs text-text-muted">
					Generating QR Code...
				</div>
			{/if}
		</div>

		<!-- Direct Pairing URL -->
		<div class="mt-5 w-full">
			<div class="flex items-center justify-between rounded-lg border border-border bg-surface-secondary px-3 py-2 text-xs font-mono text-text-primary">
				<span class="truncate">{pairingUrl}</span>
				<button
					type="button"
					onclick={copyPairingUrl}
					class="ml-2 flex shrink-0 items-center gap-1 rounded bg-surface px-2 py-1 text-[11px] font-sans font-semibold text-text-secondary transition-colors hover:text-accent border border-border"
				>
					{#if copied}
						<Check size={12} class="text-success" /> Copied!
					{:else}
						<Copy size={12} /> Copy
					{/if}
				</button>
			</div>
		</div>

		<div class="mt-4 flex w-full items-center justify-center gap-3 text-xs text-text-muted">
			<span class="inline-flex items-center gap-1">
				<Monitor size={14} /> Desktop POS
			</span>
			<span>•</span>
			<span class="inline-flex items-center gap-1">
				<Tablet size={14} /> Tablet POS
			</span>
			<span>•</span>
			<span class="inline-flex items-center gap-1">
				<Laptop size={14} /> Cashier Laptops
			</span>
		</div>
	</div>

	<!-- Right Col: Setup Instructions & Network Interfaces -->
	<div class="space-y-6 lg:col-span-7">
		<!-- Step by Step Setup Guide -->
		<div class="rounded-xl border border-border bg-surface p-6 shadow-2xs">
			<h3 class="text-sm font-bold text-text-primary flex items-center gap-2">
				<Wifi size={16} class="text-accent" />
				How to Connect Additional Cashier Terminals
			</h3>
			<div class="mt-4 space-y-3">
				<div class="flex gap-3">
					<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
						1
					</div>
					<div>
						<h4 class="text-xs font-bold text-text-primary">Connect to Local Pharmacy Wi-Fi</h4>
						<p class="text-xs text-text-muted">
							Ensure the secondary tablet or laptop is connected to the same local store router or Wi-Fi hotspot as this server.
						</p>
					</div>
				</div>

				<div class="flex gap-3">
					<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
						2
					</div>
					<div>
						<h4 class="text-xs font-bold text-text-primary">Scan QR Code or Enter URL</h4>
						<p class="text-xs text-text-muted">
							Scan the QR code with the device camera, or open Chrome/Safari and browse to <code class="rounded bg-surface-secondary px-1.5 py-0.5 font-mono text-[11px] text-accent font-semibold">{pairingUrl}</code>.
						</p>
					</div>
				</div>

				<div class="flex gap-3">
					<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
						3
					</div>
					<div>
						<h4 class="text-xs font-bold text-text-primary">Login with Cashier Credentials</h4>
						<p class="text-xs text-text-muted">
							Cashiers can sign in immediately. Every sale synchronizes instantly to the central PostgreSQL database with zero internet bandwidth consumption.
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Network Interfaces Detected -->
		<div class="rounded-xl border border-border bg-surface p-6 shadow-2xs">
			<div class="flex items-center justify-between">
				<div>
					<h3 class="text-sm font-bold text-text-primary flex items-center gap-2">
						<Network size={16} class="text-accent" />
						Detected Network Interfaces on Store Server
					</h3>
					<p class="text-xs text-text-muted">
						If your store has multiple networks (e.g. Ethernet + Wi-Fi), select the interface used by counter tablets.
					</p>
				</div>
			</div>

			<div class="mt-4 divide-y divide-border-subtle rounded-lg border border-border">
				{#if topology.interfaces.length === 0}
					<div class="p-4 text-center text-xs text-text-muted">
						No external IPv4 network interfaces detected. The server is bound to localhost.
					</div>
				{:else}
					{#each topology.interfaces as iface}
						<div class="flex items-center justify-between p-3 transition-colors hover:bg-surface-hover">
							<div class="flex items-center gap-3">
								<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-secondary text-text-secondary">
									{#if iface.type === 'Wi-Fi'}
										<Wifi size={18} />
									{:else}
										<Network size={18} />
									{/if}
								</div>
								<div>
									<div class="flex items-center gap-2">
										<span class="text-xs font-bold text-text-primary">{iface.name}</span>
										<Badge variant="neutral" size="sm">{iface.type}</Badge>
										{#if iface.address === selectedIp}
											<Badge variant="success" size="sm">Active Pairing IP</Badge>
										{/if}
									</div>
									<div class="font-mono text-xs font-medium text-text-secondary">
										IP: {iface.address} &bull; Netmask: {iface.netmask}
									</div>
								</div>
							</div>

							{#if iface.address !== selectedIp}
								<Button
									variant="secondary"
									size="sm"
									onclick={() => refreshTopology(iface.address)}
								>
									Use This IP
								</Button>
							{/if}
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</div>
</div>
