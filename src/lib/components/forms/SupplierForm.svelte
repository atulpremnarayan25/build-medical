<script lang="ts">
	import type { Supplier, CreateSupplierInput } from '$lib/types/supplier.js';
	import { Button } from '$lib/components/common/index.js';
	import {
		extractPanFromGstin,
		extractStateCode,
		getStateNameByCode,
		checkLicenseExpiry
	} from '$lib/utils/gstin.js';

	let {
		supplier = null,
		onSave,
		onCancel,
		isSaving = false
	}: {
		supplier?: Supplier | null;
		onSave: (data: CreateSupplierInput) => void;
		onCancel: () => void;
		isSaving?: boolean;
	} = $props();

	// Form state
	let formData = $state<CreateSupplierInput>({
		name: '',
		code: '',
		phone: '',
		telephone: '',
		email: '',
		address: '',
		city: '',
		pinCode: '',
		gstin: '',
		stateCode: '',
		stateName: '',
		panNo: '',
		drugLicenseNo1: '',
		drugLicenseNo2: '',
		drugLicenseExpiry: '',
		fssaiLicenseNo: '',
		tdsApplicable: false,
		creditDays: 21,
		openingBalance: 0,
		contactPerson: '',
		remarks: '',
		active: true
	});

	// Initialize state
	$effect(() => {
		if (supplier) {
			formData.name = supplier.name;
			formData.code = supplier.code || '';
			formData.phone = supplier.phone || '';
			formData.telephone = supplier.telephone || '';
			formData.email = supplier.email || '';
			formData.address = supplier.address || '';
			formData.city = supplier.city || '';
			formData.pinCode = supplier.pinCode || '';
			formData.gstin = supplier.gstin || '';
			formData.stateCode = supplier.stateCode || '';
			formData.stateName = supplier.stateName || '';
			formData.panNo = supplier.panNo || '';
			formData.drugLicenseNo1 = supplier.drugLicenseNo1 || '';
			formData.drugLicenseNo2 = supplier.drugLicenseNo2 || '';
			formData.drugLicenseExpiry = supplier.drugLicenseExpiry || '';
			formData.fssaiLicenseNo = supplier.fssaiLicenseNo || '';
			formData.tdsApplicable = supplier.tdsApplicable ?? false;
			formData.creditDays = supplier.creditDays !== undefined ? supplier.creditDays : 21;
			formData.openingBalance = supplier.openingBalance || 0;
			formData.contactPerson = supplier.contactPerson || '';
			formData.remarks = supplier.remarks || '';
			formData.active = supplier.active;
		}
	});

	let licenseStatus = $derived(checkLicenseExpiry(formData.drugLicenseExpiry));

	function handleGstinInput(e: Event) {
		const target = e.target as HTMLInputElement;
		const val = target.value.toUpperCase();
		formData.gstin = val;

		if (val.length >= 2) {
			const sc = extractStateCode(val);
			if (sc) {
				formData.stateCode = sc;
				formData.stateName = getStateNameByCode(sc);
			}
		}
		if (val.length >= 10) {
			const pan = extractPanFromGstin(val);
			if (pan) {
				formData.panNo = pan;
			}
		}
	}

	let errors = $state<Partial<Record<keyof CreateSupplierInput, string>>>({});

	function validate() {
		const newErrors: Partial<Record<keyof CreateSupplierInput, string>> = {};

		if (!formData.name.trim()) newErrors.name = 'Supplier / Distributor name is required';

		if (formData.gstin && formData.gstin.trim().length !== 15) {
			newErrors.gstin = 'Invalid GSTIN length. Must be exactly 15 characters.';
		}

		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (validate()) {
			onSave(formData);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onCancel();
		}
	}
</script>

<!-- Shortcut Hints Banner -->
<div class="mb-3 flex items-center justify-between rounded-lg border border-border bg-surface-muted/50 px-3 py-1.5 text-[11px] text-text-secondary">
	<div class="flex items-center gap-4">
		<span><kbd class="rounded border border-border bg-surface px-1 py-0.5 font-mono text-[10px] text-text-primary shadow-2xs">Enter</kbd> Next Field</span>
		<span><kbd class="rounded border border-border bg-surface px-1 py-0.5 font-mono text-[10px] text-text-primary shadow-2xs">Esc</kbd> Cancel</span>
	</div>
	<div class="font-mono text-[11px] font-semibold text-primary">
		Credit Terms: {formData.creditDays || 21} Days
	</div>
</div>

<svelte:window onkeydown={handleKeydown} />

<form onsubmit={handleSubmit} class="space-y-4">
	<!-- Section 1: Identification & Code -->
	<div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
		<div class="mb-3 flex items-center justify-between">
			<h3 class="text-xs font-bold uppercase tracking-wider text-text-muted">Master Identification</h3>
			<span class="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Image 6 Standard</span>
		</div>

		<div class="grid grid-cols-1 gap-3 md:grid-cols-4">
			<div class="md:col-span-3">
				<label for="s-name" class="mb-1 block text-xs font-medium text-text-secondary">Supplier / Distributor Name *</label>
				<input
					id="s-name"
					type="text"
					bind:value={formData.name}
					required
					placeholder="e.g. A.K. PHARMA DISTRIBUTORS / CIPLA"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
				{#if errors.name}<p class="mt-1 text-[11px] text-danger">{errors.name}</p>{/if}
			</div>

			<div>
				<label for="s-code" class="mb-1 block text-xs font-medium text-text-secondary">Short Code / Alias</label>
				<input
					id="s-code"
					type="text"
					bind:value={formData.code}
					placeholder="e.g. A K1"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs uppercase text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>
		</div>
	</div>

	<!-- Section 2: Statutory, GSTIN & Drug Licenses -->
	<div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
		<div class="mb-3 flex items-center justify-between">
			<h3 class="text-xs font-bold uppercase tracking-wider text-text-muted">Statutory & Drug Licenses (Form 20B/21B)</h3>
			{#if licenseStatus.isExpired}
				<span class="rounded bg-danger/10 px-2 py-0.5 text-[10px] font-semibold text-danger">⚠️ Drug License Expired</span>
			{:else if licenseStatus.isExpiringSoon}
				<span class="rounded bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">⚠️ Expiring in {licenseStatus.daysRemaining} days</span>
			{/if}
		</div>

		<div class="grid grid-cols-1 gap-3 md:grid-cols-4">
			<div class="md:col-span-2">
				<label for="s-gstin" class="mb-1 block text-xs font-medium text-text-secondary">GSTIN (15 Digits)</label>
				<input
					id="s-gstin"
					type="text"
					value={formData.gstin}
					oninput={handleGstinInput}
					maxlength="15"
					placeholder="e.g. 09CVXPK3468G1ZT"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs uppercase text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
				{#if errors.gstin}<p class="mt-1 text-[11px] text-danger">{errors.gstin}</p>{/if}
			</div>

			<div>
				<label for="s-pan" class="mb-1 block text-xs font-medium text-text-secondary">PAN No. (Auto)</label>
				<input
					id="s-pan"
					type="text"
					bind:value={formData.panNo}
					readonly
					placeholder="Auto-extracted"
					class="w-full rounded-md border border-border bg-surface-muted px-3 py-1.5 font-mono text-xs font-medium text-text-secondary focus:outline-none"
				/>
			</div>

			<div>
				<label for="s-state" class="mb-1 block text-xs font-medium text-text-secondary">GST State</label>
				<input
					id="s-state"
					type="text"
					value={formData.stateName || (formData.stateCode ? `State Code: ${formData.stateCode}` : '')}
					readonly
					placeholder="Auto-mapped"
					class="w-full rounded-md border border-border bg-surface-muted px-3 py-1.5 text-xs font-medium text-text-secondary focus:outline-none"
				/>
			</div>

			<div>
				<label for="s-dl1" class="mb-1 block text-xs font-medium text-text-secondary">Drug Lic. 1 (Form 20B)</label>
				<input
					id="s-dl1"
					type="text"
					bind:value={formData.drugLicenseNo1}
					placeholder="e.g. 20B-7890/UP"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs uppercase text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="s-dl2" class="mb-1 block text-xs font-medium text-text-secondary">Drug Lic. 2 (Form 21B)</label>
				<input
					id="s-dl2"
					type="text"
					bind:value={formData.drugLicenseNo2}
					placeholder="e.g. 21B-4567/UP"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs uppercase text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="s-expiry" class="mb-1 block text-xs font-medium text-text-secondary">DL Expiry Date</label>
				<input
					id="s-expiry"
					type="date"
					bind:value={formData.drugLicenseExpiry}
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="s-fssai" class="mb-1 block text-xs font-medium text-text-secondary">FSSAI Food License</label>
				<input
					id="s-fssai"
					type="text"
					bind:value={formData.fssaiLicenseNo}
					placeholder="14-digit FSSAI"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>
		</div>
	</div>

	<!-- Section 3: Contact & Address Details -->
	<div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
		<h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-text-muted">Contact & Location</h3>
		<div class="grid grid-cols-1 gap-3 md:grid-cols-4">
			<div class="md:col-span-2">
				<label for="s-addr" class="mb-1 block text-xs font-medium text-text-secondary">Street Address</label>
				<input
					id="s-addr"
					type="text"
					bind:value={formData.address}
					placeholder="Godown / Warehouse / Office address"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="s-city" class="mb-1 block text-xs font-medium text-text-secondary">City / District</label>
				<input
					id="s-city"
					type="text"
					bind:value={formData.city}
					placeholder="e.g. Kanpur"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="s-pin" class="mb-1 block text-xs font-medium text-text-secondary">PIN Code</label>
				<input
					id="s-pin"
					type="text"
					bind:value={formData.pinCode}
					placeholder="e.g. 208001"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="s-phone" class="mb-1 block text-xs font-medium text-text-secondary">Contact Mobile</label>
				<input
					id="s-phone"
					type="tel"
					bind:value={formData.phone}
					placeholder="Mobile number"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="s-tel" class="mb-1 block text-xs font-medium text-text-secondary">Telephone (Office)</label>
				<input
					id="s-tel"
					type="text"
					bind:value={formData.telephone}
					placeholder="Office tel"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="s-email" class="mb-1 block text-xs font-medium text-text-secondary">Email Address</label>
				<input
					id="s-email"
					type="email"
					bind:value={formData.email}
					placeholder="orders@supplier.com"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="s-contact" class="mb-1 block text-xs font-medium text-text-secondary">Contact Person</label>
				<input
					id="s-contact"
					type="text"
					bind:value={formData.contactPerson}
					placeholder="Billing desk / rep"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>
		</div>
	</div>

	<!-- Section 4: Commercial Terms & Payables Defaults -->
	<div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
		<h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-text-muted">Commercial Terms & Payables</h3>
		<div class="grid grid-cols-1 gap-3 md:grid-cols-4">
			<div>
				<label for="s-days" class="mb-1 block text-xs font-medium text-text-secondary">Credit Days (Grace Period)</label>
				<input
					id="s-days"
					type="number"
					min="0"
					bind:value={formData.creditDays}
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs tabular-nums text-text-primary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="s-opbal" class="mb-1 block text-xs font-medium text-text-secondary">Opening Balance (₹)</label>
				<input
					id="s-opbal"
					type="number"
					step="0.01"
					bind:value={formData.openingBalance}
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs tabular-nums text-text-primary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div class="md:col-span-2">
				<label for="s-remarks" class="mb-1 block text-xs font-medium text-text-secondary">Remarks / Transport Details</label>
				<input
					id="s-remarks"
					type="text"
					bind:value={formData.remarks}
					placeholder="Preferred transport, booking station, payment bank"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div class="flex items-center gap-6 pt-4 md:col-span-4">
				<label class="flex cursor-pointer items-center gap-2 text-xs font-medium text-text-primary">
					<input
						type="checkbox"
						bind:checked={formData.tdsApplicable}
						class="h-4 w-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
					/>
					<span>TDS Applicable (Income Tax Sec 194Q - Purchase of Goods)</span>
				</label>

				<label class="flex cursor-pointer items-center gap-2 text-xs font-medium text-text-primary">
					<input
						type="checkbox"
						bind:checked={formData.active}
						class="h-4 w-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
					/>
					<span>Active Supplier Account</span>
				</label>
			</div>
		</div>
	</div>

	<!-- Actions -->
	<div class="flex justify-end gap-2.5">
		<Button type="button" variant="secondary" size="sm" onclick={onCancel}>Cancel (Esc)</Button>
		<Button type="submit" variant="primary" size="sm" disabled={isSaving}>
			{isSaving ? 'Saving...' : 'Save Supplier Master'}
		</Button>
	</div>
</form>
