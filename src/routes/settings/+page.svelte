<script lang="ts">
	import { PageHeader, Button, Badge } from '$lib/components/common';
	import { Building2, Save, Users, FileText } from '@lucide/svelte';

	let activeTab = $state('profile');

	let storeProfile = {
		name: 'Sharma Medical Store',
		address: '123 Health Ave, Medical District',
		phone: '+91 9876543210',
		email: 'contact@sharmamedical.in',
		gstin: '27AADCS5408C1ZQ',
		drugLicense: 'DL-MH-MZ5-123456'
	};

	let users = [
		{ id: 1, name: 'System Admin', role: 'Owner/Admin', active: true },
		{ id: 2, name: 'Rahul Sharma', role: 'Sales Operator', active: true },
		{ id: 3, name: 'Priya Patel', role: 'Purchase Operator', active: true }
	];

	function saveProfile() {
		console.log('Saved', storeProfile, invoiceProfile);
	}

	let invoiceProfile = $state({
		prefix: 'INV',
		defaultGst: 12,
		terms:
			'1. Goods once sold will not be taken back.\n2. Interest @ 24% p.a. will be charged if bill is not paid within due date.',
		template: 'standard'
	});
</script>

<svelte:head>
	<title>Settings - MedStock ERP</title>
</svelte:head>

<PageHeader title="Settings" subtitle="Manage store profile, team access, and invoice preferences" />

<div class="mt-6 flex flex-col gap-6 lg:flex-row">
	<!-- Sidebar Tabs -->
	<div class="w-full shrink-0 space-y-1 lg:w-64">
		<button
			class="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-semibold transition-colors {activeTab ===
			'profile'
				? 'bg-accent-light text-accent'
				: 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'}"
			onclick={() => (activeTab = 'profile')}
		>
			<Building2 size={16} />
			Store Profile
		</button>
		<button
			class="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-semibold transition-colors {activeTab ===
			'users'
				? 'bg-accent-light text-accent'
				: 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'}"
			onclick={() => (activeTab = 'users')}
		>
			<Users size={16} />
			User Management
		</button>
		<button
			class="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-semibold transition-colors {activeTab ===
			'invoice'
				? 'bg-accent-light text-accent'
				: 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'}"
			onclick={() => (activeTab = 'invoice')}
		>
			<FileText size={16} />
			Invoice Settings
		</button>
	</div>

	<!-- Content -->
	<div class="flex-1 rounded-xl border border-border bg-surface p-6 shadow-2xs">
		{#if activeTab === 'profile'}
			<div>
				<h2 class="text-base font-bold text-text-primary">Store Profile</h2>
				<p class="mb-6 text-xs text-text-muted">
					This information appears on your printed invoices and statements.
				</p>

				<form
					onsubmit={(e) => {
						e.preventDefault();
						saveProfile();
					}}
					class="max-w-2xl space-y-4"
				>
					<div class="grid gap-4 sm:grid-cols-2">
						<div class="sm:col-span-2">
							<label for="set-biz-name" class="mb-1 block text-xs font-semibold text-text-secondary"
								>Business Name</label
							>
							<input
								id="set-biz-name"
								type="text"
								bind:value={storeProfile.name}
								class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
							/>
						</div>

						<div class="sm:col-span-2">
							<label for="set-biz-addr" class="mb-1 block text-xs font-semibold text-text-secondary"
								>Address</label
							>
							<textarea
								id="set-biz-addr"
								bind:value={storeProfile.address}
								rows="2"
								class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
							></textarea>
						</div>

						<div>
							<label for="set-biz-phone" class="mb-1 block text-xs font-semibold text-text-secondary"
								>Phone Number</label
							>
							<input
								id="set-biz-phone"
								type="text"
								bind:value={storeProfile.phone}
								class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
							/>
						</div>

						<div>
							<label for="set-biz-email" class="mb-1 block text-xs font-semibold text-text-secondary"
								>Email</label
							>
							<input
								id="set-biz-email"
								type="email"
								bind:value={storeProfile.email}
								class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
							/>
						</div>

						<div>
							<label for="set-biz-gst" class="mb-1 block text-xs font-semibold text-text-secondary"
								>GSTIN</label
							>
							<input
								id="set-biz-gst"
								type="text"
								bind:value={storeProfile.gstin}
								class="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
							/>
						</div>

						<div>
							<label for="set-biz-dl" class="mb-1 block text-xs font-semibold text-text-secondary"
								>Drug License No.</label
							>
							<input
								id="set-biz-dl"
								type="text"
								bind:value={storeProfile.drugLicense}
								class="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
							/>
						</div>
					</div>

					<div class="flex justify-end pt-4">
						<Button type="submit" variant="primary" size="sm" class="gap-1.5">
							<Save size={14} /> Save Changes
						</Button>
					</div>
				</form>
			</div>
		{:else if activeTab === 'users'}
			<div>
				<h2 class="text-base font-bold text-text-primary">User Management</h2>
				<p class="mb-6 text-xs text-text-muted">Manage team access and roles.</p>

				<div class="overflow-x-auto rounded-lg border border-border">
					<table class="w-full text-left text-xs">
						<thead class="border-b border-border bg-surface-secondary text-[11px] font-semibold text-text-muted uppercase">
							<tr>
								<th class="px-4 py-2.5">Name</th>
								<th class="px-4 py-2.5">Role</th>
								<th class="px-4 py-2.5 text-center">Status</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border-subtle">
							{#each users as user}
								<tr class="transition-colors hover:bg-surface-hover">
									<td class="px-4 py-3 font-semibold text-text-primary">{user.name}</td>
									<td class="px-4 py-3 text-text-secondary">{user.role}</td>
									<td class="px-4 py-3 text-center">
										<Badge variant="success" size="sm">Active</Badge>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<div class="mt-4 flex items-center justify-between">
					<Button variant="secondary" size="sm" disabled>+ Add User</Button>
					<p class="text-xs text-text-muted">User creation is available for Multi-User plans.</p>
				</div>
			</div>
		{:else if activeTab === 'invoice'}
			<div>
				<h2 class="text-base font-bold text-text-primary">Invoice Settings</h2>
				<p class="mb-6 text-xs text-text-muted">Configure formatting, numbering, and series templates.</p>

				<form
					onsubmit={(e) => {
						e.preventDefault();
						saveProfile();
					}}
					class="max-w-xl space-y-4"
				>
					<div class="grid gap-4 sm:grid-cols-2">
						<div class="sm:col-span-1">
							<label for="inv-pref" class="mb-1 block text-xs font-semibold text-text-secondary"
								>Default Prefix</label
							>
							<input
								id="inv-pref"
								type="text"
								bind:value={invoiceProfile.prefix}
								class="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs font-medium text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
							/>
						</div>

						<div class="sm:col-span-1">
							<label for="inv-gst" class="mb-1 block text-xs font-semibold text-text-secondary"
								>Default GST Rate (%)</label
							>
							<input
								id="inv-gst"
								type="number"
								bind:value={invoiceProfile.defaultGst}
								class="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs font-medium text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
							/>
						</div>

						<div class="sm:col-span-2">
							<label for="inv-tpl" class="mb-1 block text-xs font-semibold text-text-secondary"
								>Template Layout</label
							>
							<select
								id="inv-tpl"
								bind:value={invoiceProfile.template}
								class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
							>
								<option value="standard">Standard A4 Format</option>
								<option value="thermal">Thermal POS Format (3-inch)</option>
								<option value="compact">Compact A5 Format</option>
							</select>
						</div>

						<div class="sm:col-span-2">
							<label for="inv-terms" class="mb-1 block text-xs font-semibold text-text-secondary"
								>Terms & Conditions</label
							>
							<textarea
								id="inv-terms"
								bind:value={invoiceProfile.terms}
								rows="4"
								class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
							></textarea>
						</div>
					</div>

					<div class="flex justify-start pt-4">
						<Button type="submit" variant="primary" size="sm" class="gap-1.5">
							<Save size={14} /> Save Preferences
						</Button>
					</div>
				</form>
			</div>
		{/if}
	</div>
</div>
