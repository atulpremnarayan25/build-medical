<script lang="ts">
	import { PageHeader, Button, Badge, Modal } from '$lib/components/common';
	import { addToast } from '$lib/stores/toastStore.svelte.js';
	import {
		Building2,
		Save,
		Users,
		FileText,
		UserPlus,
		Key,
		CheckCircle2,
		XCircle,
		Shield,
		Database,
		Download,
		HardDrive,
		Wifi,
		RefreshCw
	} from '@lucide/svelte';

	let { data } = $props();

	let activeTab = $state('profile');

	// Store profile state
	let storeProfile = $state({
		name: '',
		address: '',
		phone: '',
		email: '',
		gstin: '',
		drugLicenseNo: '',
		drugLicenseNo2: ''
	});

	let invoiceProfile = $state({
		prefix: 'INV',
		defaultGst: 12,
		terms: '1. Goods once sold will not be taken back.\n2. Consult doctor before using scheduled drugs.',
		template: 'standard'
	});

	// User management state
	let usersList = $state<any[]>([]);
	let isOwnerAdmin = $derived(data.currentUser?.role === 'owner_admin');

	let isSavingProfile = $state(false);

	async function saveProfile() {
		if (!storeProfile.name.trim()) {
			addToast('error', 'Business name is required');
			return;
		}

		isSavingProfile = true;
		try {
			const res = await fetch('/api/settings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: storeProfile.name,
					address: storeProfile.address,
					phone: storeProfile.phone,
					email: storeProfile.email,
					gstin: storeProfile.gstin,
					drugLicenseNo: storeProfile.drugLicenseNo,
					drugLicenseNo2: storeProfile.drugLicenseNo2,
					invoicePrefix: invoiceProfile.prefix,
					invoiceTerms: invoiceProfile.terms
				})
			});

			const result = await res.json();
			if (!res.ok || result.error) {
				addToast('error', result.error?.message || 'Failed to save store profile');
			} else {
				addToast('success', 'Store settings saved successfully');
			}
		} catch (err: any) {
			addToast('error', err.message || 'Failed to save settings');
		} finally {
			isSavingProfile = false;
		}
	}

	$effect(() => {
		if (data.store) {
			storeProfile.name = data.store.name || '';
			storeProfile.address = data.store.address || '';
			storeProfile.phone = data.store.phone || '';
			storeProfile.email = data.store.email || '';
			storeProfile.gstin = data.store.gstin || '';
			storeProfile.drugLicenseNo = data.store.drugLicenseNo || '';
			storeProfile.drugLicenseNo2 = data.store.drugLicenseNo2 || '';
			invoiceProfile.prefix = data.store.invoicePrefix || 'INV';
			if (data.store.invoiceTerms) {
				invoiceProfile.terms = data.store.invoiceTerms;
			}
		}
		if (data.users) {
			usersList = data.users;
		}
	});

	async function reloadUsers() {
		try {
			const res = await fetch('/api/users');
			const json = await res.json();
			if (res.ok && json.data) {
				usersList = json.data;
			}
		} catch (e) {
			console.error('Failed to reload users', e);
		}
	}

	// Create user state
	let isCreateModalOpen = $state(false);
	let newUserName = $state('');
	let newUserUsername = $state('');
	let newUserRole = $state<'biller' | 'owner_admin'>('biller');
	let newUserPassword = $state('');
	let isCreatingUser = $state(false);

	async function handleCreateUser() {
		if (!newUserName.trim() || !newUserUsername.trim() || !newUserPassword.trim()) {
			addToast('error', 'Please fill in all fields');
			return;
		}

		isCreatingUser = true;
		try {
			const res = await fetch('/api/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newUserName.trim(),
					username: newUserUsername.trim(),
					role: newUserRole,
					password: newUserPassword
				})
			});

			const json = await res.json();
			if (!res.ok || json.error) {
				addToast('error', json.error?.message || 'Failed to create user');
			} else {
				addToast('success', `User @${json.data.username} created successfully`);
				isCreateModalOpen = false;
				newUserName = '';
				newUserUsername = '';
				newUserRole = 'biller';
				newUserPassword = '';
				await reloadUsers();
			}
		} catch (err: any) {
			addToast('error', err.message || 'Failed to create user');
		} finally {
			isCreatingUser = false;
		}
	}

	// Toggle active state
	async function toggleUserStatus(u: any) {
		const newStatus = !u.isActive;
		try {
			const res = await fetch(`/api/users/${u.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isActive: newStatus })
			});

			const json = await res.json();
			if (!res.ok || json.error) {
				addToast('error', json.error?.message || 'Failed to update user status');
			} else {
				addToast('success', `User ${u.name} is now ${newStatus ? 'Active' : 'Disabled'}`);
				await reloadUsers();
			}
		} catch (err: any) {
			addToast('error', err.message || 'Failed to update user');
		}
	}

	// Password reset state
	let isResetModalOpen = $state(false);
	let selectedUserForReset = $state<any>(null);
	let resetPasswordValue = $state('');
	let isResettingPassword = $state(false);

	function openResetPasswordModal(u: any) {
		selectedUserForReset = u;
		resetPasswordValue = '';
		isResetModalOpen = true;
	}

	async function handleResetPassword() {
		if (!selectedUserForReset || !resetPasswordValue || resetPasswordValue.length < 4) {
			addToast('error', 'Password must be at least 4 characters');
			return;
		}

		isResettingPassword = true;
		try {
			const res = await fetch(`/api/users/${selectedUserForReset.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password: resetPasswordValue })
			});

			const json = await res.json();
			if (!res.ok || json.error) {
				addToast('error', json.error?.message || 'Failed to reset password');
			} else {
				addToast('success', `Password for @${selectedUserForReset.username} reset successfully`);
				isResetModalOpen = false;
				selectedUserForReset = null;
				resetPasswordValue = '';
			}
		} catch (err: any) {
			addToast('error', err.message || 'Failed to reset password');
		} finally {
			isResettingPassword = false;
		}
	}

	// Database Backups state
	let backupsList = $state<any[]>([]);
	let isBackingUp = $state(false);
	let isFetchingBackups = $state(false);

	async function fetchBackups() {
		isFetchingBackups = true;
		try {
			const res = await fetch('/api/settings/backup');
			const json = await res.json();
			if (res.ok && json.data?.backups) {
				backupsList = json.data.backups;
			}
		} catch (e) {
			console.error('Failed to fetch backups', e);
		} finally {
			isFetchingBackups = false;
		}
	}

	async function triggerManualBackup() {
		isBackingUp = true;
		try {
			const res = await fetch('/api/settings/backup', { method: 'POST' });
			const json = await res.json();
			if (!res.ok || json.error) {
				addToast('error', json.error?.message || 'Failed to create backup');
			} else {
				addToast('success', `Database backup ${json.data.backup.filename} created!`);
				await fetchBackups();
				// Automatically trigger download to pen drive / browser
				window.location.href = `/api/settings/backup/download?file=${encodeURIComponent(json.data.backup.filename)}`;
			}
		} catch (err: any) {
			addToast('error', err.message || 'Backup creation failed');
		} finally {
			isBackingUp = false;
		}
	}

	function downloadBackup(filename: string) {
		window.location.href = `/api/settings/backup/download?file=${encodeURIComponent(filename)}`;
	}

	$effect(() => {
		if (activeTab === 'backups' && backupsList.length === 0) {
			fetchBackups();
		}
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
		<button
			class="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-semibold transition-colors {activeTab ===
			'backups'
				? 'bg-accent-light text-accent'
				: 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'}"
			onclick={() => {
				activeTab = 'backups';
				fetchBackups();
			}}
		>
			<Database size={16} />
			Backups & Recovery
		</button>
		<a
			href="/settings/network"
			class="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-semibold transition-colors text-text-secondary hover:bg-surface-hover hover:text-text-primary"
		>
			<Wifi size={16} />
			Network & LAN Terminals
		</a>
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
								>Business Name *</label
							>
							<input
								id="set-biz-name"
								type="text"
								bind:value={storeProfile.name}
								required
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
								placeholder="e.g. 29ABCDE1234F1Z5"
								class="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
							/>
						</div>

						<div>
							<label for="set-biz-dl" class="mb-1 block text-xs font-semibold text-text-secondary"
								>Drug License No. (20B)</label
							>
							<input
								id="set-biz-dl"
								type="text"
								bind:value={storeProfile.drugLicenseNo}
								placeholder="e.g. DL-20B-12345"
								class="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
							/>
						</div>

						<div>
							<label for="set-biz-dl2" class="mb-1 block text-xs font-semibold text-text-secondary"
								>Drug License No. 2 (21B)</label
							>
							<input
								id="set-biz-dl2"
								type="text"
								bind:value={storeProfile.drugLicenseNo2}
								placeholder="e.g. DL-21B-67890"
								class="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
							/>
						</div>
					</div>

					<div class="flex justify-end pt-4">
						<Button type="submit" variant="primary" size="sm" class="gap-1.5" disabled={isSavingProfile}>
							<Save size={14} /> {isSavingProfile ? 'Saving...' : 'Save Changes'}
						</Button>
					</div>
				</form>
			</div>
		{:else if activeTab === 'users'}
			<div>
				<div class="mb-6 flex items-center justify-between">
					<div>
						<h2 class="text-base font-bold text-text-primary">User Management</h2>
						<p class="text-xs text-text-muted">Manage staff accounts, assign roles, and control counter access.</p>
					</div>
					{#if isOwnerAdmin}
						<Button variant="primary" size="sm" class="gap-1.5" onclick={() => (isCreateModalOpen = true)}>
							<UserPlus size={14} /> Add User
						</Button>
					{/if}
				</div>

				<div class="overflow-x-auto rounded-lg border border-border">
					<table class="w-full text-left text-xs">
						<thead class="border-b border-border bg-surface-secondary text-[11px] font-semibold text-text-muted uppercase">
							<tr>
								<th class="px-4 py-2.5">Name</th>
								<th class="px-4 py-2.5">Username</th>
								<th class="px-4 py-2.5">Role</th>
								<th class="px-4 py-2.5 text-center">Status</th>
								{#if isOwnerAdmin}
									<th class="px-4 py-2.5 text-right">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody class="divide-y divide-border-subtle">
							{#if usersList.length === 0}
								<tr>
									<td colspan={isOwnerAdmin ? 5 : 4} class="px-4 py-8 text-center text-text-muted">
										No user accounts found.
									</td>
								</tr>
							{:else}
								{#each usersList as u}
									<tr class="transition-colors hover:bg-surface-hover">
										<td class="px-4 py-3 font-semibold text-text-primary">
											<div class="flex items-center gap-2">
												{u.name}
												{#if u.id === data.currentUser?.id}
													<span class="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent">You</span>
												{/if}
											</div>
										</td>
										<td class="px-4 py-3 font-mono text-text-secondary">@{u.username}</td>
										<td class="px-4 py-3 text-text-secondary">
											<span class="inline-flex items-center gap-1">
												{#if u.role === 'owner_admin'}
													<Shield size={12} class="text-primary" />
													Owner / Admin
												{:else}
													Biller
												{/if}
											</span>
										</td>
										<td class="px-4 py-3 text-center">
											{#if u.isActive}
												<Badge variant="success" size="sm">Active</Badge>
											{:else}
												<Badge variant="danger" size="sm">Disabled</Badge>
											{/if}
										</td>
										{#if isOwnerAdmin}
											<td class="px-4 py-3 text-right">
												<div class="flex items-center justify-end gap-2">
													<button
														type="button"
														title="Reset Password"
														class="flex items-center gap-1 rounded px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
														onclick={() => openResetPasswordModal(u)}
													>
														<Key size={13} />
														<span>Reset</span>
													</button>
													{#if u.id !== data.currentUser?.id}
														<button
															type="button"
															title={u.isActive ? 'Disable User' : 'Enable User'}
															class="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors {u.isActive
																? 'text-danger hover:bg-danger-light/50'
																: 'text-success hover:bg-success-light/50'}"
															onclick={() => toggleUserStatus(u)}
														>
															{#if u.isActive}
																<XCircle size={13} />
																<span>Disable</span>
															{:else}
																<CheckCircle2 size={13} />
																<span>Enable</span>
															{/if}
														</button>
													{/if}
												</div>
											</td>
										{/if}
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
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
								>Invoice Prefix</label
							>
							<input
								id="inv-pref"
								type="text"
								bind:value={invoiceProfile.prefix}
								placeholder="e.g. INV"
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
						<Button type="submit" variant="primary" size="sm" class="gap-1.5" disabled={isSavingProfile}>
							<Save size={14} /> {isSavingProfile ? 'Saving...' : 'Save Preferences'}
						</Button>
					</div>
				</form>
			</div>
		{:else if activeTab === 'backups'}
			<div>
				<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 class="text-base font-bold text-text-primary flex items-center gap-2">
							<Database size={18} class="text-accent" />
							Database Backups & Disaster Recovery
						</h2>
						<p class="text-xs text-text-muted">
							Automated nightly compressed snapshots with rolling 30-day retention and one-click USB export.
						</p>
					</div>
					<div class="flex items-center gap-2">
						<Button
							variant="secondary"
							size="sm"
							class="gap-1.5"
							disabled={isFetchingBackups}
							onclick={() => fetchBackups()}
						>
							<RefreshCw size={14} class={isFetchingBackups ? 'animate-spin' : ''} /> Refresh
						</Button>
						<Button
							variant="primary"
							size="sm"
							class="gap-1.5"
							disabled={isBackingUp}
							onclick={() => triggerManualBackup()}
						>
							<Download size={14} /> {isBackingUp ? 'Creating Backup...' : 'Manual Backup Now'}
						</Button>
					</div>
				</div>

				<!-- Overview stats -->
				<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
					<div class="rounded-lg border border-border bg-surface-secondary p-4">
						<span class="text-xs font-semibold text-text-muted">Available Backups</span>
						<div class="mt-1 text-lg font-bold text-text-primary">
							{backupsList.length} <span class="text-xs font-normal text-text-muted">snapshots</span>
						</div>
						<div class="text-[11px] text-text-muted">Auto-purges after 30 daily backups</div>
					</div>

					<div class="rounded-lg border border-border bg-surface-secondary p-4">
						<span class="text-xs font-semibold text-text-muted">Latest Snapshot</span>
						<div class="mt-1 truncate font-mono text-xs font-bold text-text-primary">
							{backupsList[0]?.filename || 'No backups yet'}
						</div>
						<div class="text-[11px] text-text-muted">
							{backupsList[0] ? backupsList[0].sizeFormatted : 'Run a manual backup to create first snapshot'}
						</div>
					</div>

					<div class="rounded-lg border border-border bg-surface-secondary p-4">
						<span class="text-xs font-semibold text-text-muted">Disaster Recovery Command</span>
						<div class="mt-1 font-mono text-xs font-bold text-accent">
							npm run restore
						</div>
						<div class="text-[11px] text-text-muted">Instant 1-command database restoration</div>
					</div>
				</div>

				<!-- Backups List Table -->
				<div class="overflow-x-auto rounded-lg border border-border">
					<table class="w-full text-left text-xs">
						<thead class="border-b border-border bg-surface-secondary text-[11px] font-semibold text-text-muted uppercase">
							<tr>
								<th class="px-4 py-2.5">Backup Filename</th>
								<th class="px-4 py-2.5">Created Date & Time</th>
								<th class="px-4 py-2.5">Compressed Size</th>
								<th class="px-4 py-2.5 text-right">Actions</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border-subtle">
							{#if backupsList.length === 0}
								<tr>
									<td colspan="4" class="px-4 py-8 text-center text-text-muted">
										No database backups found in <code class="font-mono text-accent">./backups</code>.
										Click <strong>Manual Backup Now</strong> above to generate your first compressed snapshot.
									</td>
								</tr>
							{:else}
								{#each backupsList as backup}
									<tr class="transition-colors hover:bg-surface-hover">
										<td class="px-4 py-3 font-mono font-medium text-text-primary">
											<div class="flex items-center gap-2">
												<HardDrive size={14} class="text-text-muted" />
												{backup.filename}
											</div>
										</td>
										<td class="px-4 py-3 text-text-secondary">
											{new Date(backup.createdAt).toLocaleString('en-IN', {
												dateStyle: 'medium',
												timeStyle: 'short'
											})}
										</td>
										<td class="px-4 py-3 font-mono font-semibold text-text-primary">
											{backup.sizeFormatted}
										</td>
										<td class="px-4 py-3 text-right">
											<Button
												variant="secondary"
												size="sm"
												class="gap-1.5"
												onclick={() => downloadBackup(backup.filename)}
											>
												<Download size={13} /> Download to USB
											</Button>
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>

				<!-- Recovery instructions card -->
				<div class="mt-6 rounded-lg border border-border bg-surface-secondary p-4 text-xs">
					<h4 class="font-bold text-text-primary">💡 Pharmacy Disaster Recovery Best Practice:</h4>
					<p class="mt-1 text-text-secondary">
						Always download your daily <code class="font-mono text-accent">.sql.gz</code> backup to an external USB pen drive at the end of each billing day.
						In the event of hardware failure, install MedStock ERP on any replacement laptop, insert the pen drive, and run:
					</p>
					<pre class="mt-2 rounded bg-surface p-2.5 font-mono text-[11px] text-accent border border-border">npm run restore path/to/medstock_backup_YYYY-MM-DD_HHMM.sql.gz</pre>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Modal: Add New User -->
<Modal
	bind:open={isCreateModalOpen}
	title="Add New User"
	size="sm"
>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleCreateUser();
		}}
		class="space-y-3"
	>
		<div>
			<label for="new-user-name" class="mb-1 block text-xs font-semibold text-text-secondary">Full Name *</label>
			<input
				id="new-user-name"
				type="text"
				bind:value={newUserName}
				placeholder="e.g. Rajesh Kumar"
				required
				class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
			/>
		</div>
		<div>
			<label for="new-user-username" class="mb-1 block text-xs font-semibold text-text-secondary">Username *</label>
			<input
				id="new-user-username"
				type="text"
				bind:value={newUserUsername}
				placeholder="e.g. rajesh"
				required
				class="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs font-medium text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
			/>
		</div>
		<div>
			<label for="new-user-role" class="mb-1 block text-xs font-semibold text-text-secondary">Role</label>
			<select
				id="new-user-role"
				bind:value={newUserRole}
				class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
			>
				<option value="biller">Biller (Counter POS)</option>
				<option value="owner_admin">Owner / Admin</option>
			</select>
		</div>
		<div>
			<label for="new-user-pass" class="mb-1 block text-xs font-semibold text-text-secondary">Password *</label>
			<input
				id="new-user-pass"
				type="password"
				bind:value={newUserPassword}
				placeholder="Min. 4 characters"
				required
				minlength="4"
				class="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs font-medium text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
			/>
		</div>
		<div class="flex justify-end gap-2 pt-3">
			<Button type="button" variant="secondary" size="sm" onclick={() => (isCreateModalOpen = false)}>
				Cancel
			</Button>
			<Button type="submit" variant="primary" size="sm" disabled={isCreatingUser}>
				{isCreatingUser ? 'Creating...' : 'Create Account'}
			</Button>
		</div>
	</form>
</Modal>

<!-- Modal: Reset Password -->
<Modal
	bind:open={isResetModalOpen}
	title="Reset User Password"
	size="sm"
>
	{#if selectedUserForReset}
		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleResetPassword();
			}}
			class="space-y-3"
		>
			<p class="text-xs text-text-secondary">
				Setting a new password for <span class="font-bold text-text-primary">{selectedUserForReset.name}</span> (@{selectedUserForReset.username}).
			</p>
			<div>
				<label for="reset-pass" class="mb-1 block text-xs font-semibold text-text-secondary">New Password *</label>
				<input
					id="reset-pass"
					type="password"
					bind:value={resetPasswordValue}
					placeholder="Min. 4 characters"
					required
					minlength="4"
					class="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs font-medium text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
				/>
			</div>
			<div class="flex justify-end gap-2 pt-3">
				<Button type="button" variant="secondary" size="sm" onclick={() => (isResetModalOpen = false)}>
					Cancel
				</Button>
				<Button type="submit" variant="primary" size="sm" disabled={isResettingPassword}>
					{isResettingPassword ? 'Updating...' : 'Set New Password'}
				</Button>
			</div>
		</form>
	{/if}
</Modal>
