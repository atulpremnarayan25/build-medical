<script lang="ts">
	import type { Customer, CreateCustomerInput } from '$lib/types/customer.js';
	import { Button } from '$lib/components/common/index.js';
	import {
		extractPanFromGstin,
		extractStateCode,
		getStateNameByCode,
		checkLicenseExpiry
	} from '$lib/utils/gstin.js';

	let {
		customer = null,
		onSave,
		onCancel,
		isSaving = false
	}: {
		customer?: Customer | null;
		onSave: (data: CreateCustomerInput) => void;
		onCancel: () => void;
		isSaving?: boolean;
	} = $props();

	// Form state
	let formData = $state<CreateCustomerInput>({
		name: '',
		code: '',
		phone: '',
		telephone: '',
		mobileSms: '',
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
		isComposite: false,
		billSeries: 'T',
		salesRep: '',
		creditLimit: 0,
		creditDays: 30,
		openingBalance: 0,
		defaultAddAmount: 0,
		defaultAddDetail: '',
		defaultLessAmount: 0,
		defaultLessDetail: '',
		contactPerson: '',
		remarks: '',
		customerType: 'retail',
		active: true
	});

	// Initialize state from existing customer
	$effect(() => {
		if (customer) {
			formData.name = customer.name;
			formData.code = customer.code || '';
			formData.phone = customer.phone || '';
			formData.telephone = customer.telephone || '';
			formData.mobileSms = customer.mobileSms || '';
			formData.email = customer.email || '';
			formData.address = customer.address || '';
			formData.city = customer.city || '';
			formData.pinCode = customer.pinCode || '';
			formData.gstin = customer.gstin || '';
			formData.stateCode = customer.stateCode || '';
			formData.stateName = customer.stateName || '';
			formData.panNo = customer.panNo || '';
			formData.drugLicenseNo1 = customer.drugLicenseNo1 || '';
			formData.drugLicenseNo2 = customer.drugLicenseNo2 || '';
			formData.drugLicenseExpiry = customer.drugLicenseExpiry || '';
			formData.fssaiLicenseNo = customer.fssaiLicenseNo || '';
			formData.isComposite = customer.isComposite ?? false;
			formData.billSeries = customer.billSeries || 'T';
			formData.salesRep = customer.salesRep || '';
			formData.creditLimit = customer.creditLimit || 0;
			formData.creditDays = customer.creditDays !== undefined ? customer.creditDays : 30;
			formData.openingBalance = customer.openingBalance || 0;
			formData.defaultAddAmount = customer.defaultAddAmount || 0;
			formData.defaultAddDetail = customer.defaultAddDetail || '';
			formData.defaultLessAmount = customer.defaultLessAmount || 0;
			formData.defaultLessDetail = customer.defaultLessDetail || '';
			formData.contactPerson = customer.contactPerson || '';
			formData.remarks = customer.remarks || '';
			formData.customerType = customer.customerType || (customer.gstin ? 'wholesale' : 'retail');
			formData.active = customer.active;
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
		if (val.length === 15) {
			formData.customerType = 'wholesale';
		}
	}

	let errors = $state<Partial<Record<keyof CreateCustomerInput, string>>>({});

	function validate() {
		const newErrors: Partial<Record<keyof CreateCustomerInput, string>> = {};

		if (!formData.name.trim()) newErrors.name = 'Customer / Agency name is required';
		if ((formData.creditLimit || 0) < 0) newErrors.creditLimit = 'Credit limit cannot be negative';

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
		Series: {formData.billSeries} (Tax: T, Retail: R)
	</div>
</div>

<svelte:window onkeydown={handleKeydown} />

<form onsubmit={handleSubmit} class="space-y-4">
	<!-- Section 1: Identification & Code -->
	<div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
		<div class="mb-3 flex items-center justify-between">
			<h3 class="text-xs font-bold uppercase tracking-wider text-text-muted">Master Identification</h3>
			<span class="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Image 7 Standard</span>
		</div>

		<div class="grid grid-cols-1 gap-3 md:grid-cols-4">
			<div class="md:col-span-2">
				<label for="c-name" class="mb-1 block text-xs font-medium text-text-secondary">Customer / Party Name *</label>
				<input
					id="c-name"
					type="text"
					bind:value={formData.name}
					required
					placeholder="e.g. VERMA MEDICAL AGENCY"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
				{#if errors.name}<p class="mt-1 text-[11px] text-danger">{errors.name}</p>{/if}
			</div>

			<div>
				<label for="c-code" class="mb-1 block text-xs font-medium text-text-secondary">Short Code / Alias</label>
				<input
					id="c-code"
					type="text"
					bind:value={formData.code}
					placeholder="e.g. VER8"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs uppercase text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="c-series" class="mb-1 block text-xs font-medium text-text-secondary">Default Bill Series</label>
				<select
					id="c-series"
					bind:value={formData.billSeries}
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				>
					<option value="T">T - Tax Invoice (B2B)</option>
					<option value="R">R - Retail Cash Memo</option>
				</select>
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
				<label for="c-gstin" class="mb-1 block text-xs font-medium text-text-secondary">GSTIN (15 Digits)</label>
				<input
					id="c-gstin"
					type="text"
					value={formData.gstin}
					oninput={handleGstinInput}
					maxlength="15"
					placeholder="e.g. 09ADWPV1618G1ZY"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs uppercase text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
				{#if errors.gstin}<p class="mt-1 text-[11px] text-danger">{errors.gstin}</p>{/if}
			</div>

			<div>
				<label for="c-pan" class="mb-1 block text-xs font-medium text-text-secondary">PAN No. (Auto)</label>
				<input
					id="c-pan"
					type="text"
					bind:value={formData.panNo}
					readonly
					placeholder="Auto-extracted"
					class="w-full rounded-md border border-border bg-surface-muted px-3 py-1.5 font-mono text-xs font-medium text-text-secondary focus:outline-none"
				/>
			</div>

			<div>
				<label for="c-state" class="mb-1 block text-xs font-medium text-text-secondary">GST State</label>
				<input
					id="c-state"
					type="text"
					value={formData.stateName || (formData.stateCode ? `State Code: ${formData.stateCode}` : '')}
					readonly
					placeholder="Auto-mapped"
					class="w-full rounded-md border border-border bg-surface-muted px-3 py-1.5 text-xs font-medium text-text-secondary focus:outline-none"
				/>
			</div>

			<div>
				<label for="c-dl1" class="mb-1 block text-xs font-medium text-text-secondary">Drug Lic. 1 (Form 20B)</label>
				<input
					id="c-dl1"
					type="text"
					bind:value={formData.drugLicenseNo1}
					placeholder="e.g. 20B-12345/UP"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs uppercase text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="c-dl2" class="mb-1 block text-xs font-medium text-text-secondary">Drug Lic. 2 (Form 21B)</label>
				<input
					id="c-dl2"
					type="text"
					bind:value={formData.drugLicenseNo2}
					placeholder="e.g. 21B-67890/UP"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs uppercase text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="c-expiry" class="mb-1 block text-xs font-medium text-text-secondary">DL Expiry Date</label>
				<input
					id="c-expiry"
					type="date"
					bind:value={formData.drugLicenseExpiry}
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="c-fssai" class="mb-1 block text-xs font-medium text-text-secondary">FSSAI Food License</label>
				<input
					id="c-fssai"
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
				<label for="c-addr" class="mb-1 block text-xs font-medium text-text-secondary">Street Address</label>
				<input
					id="c-addr"
					type="text"
					bind:value={formData.address}
					placeholder="Shop / Building, Road, Area"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="c-city" class="mb-1 block text-xs font-medium text-text-secondary">City / District</label>
				<input
					id="c-city"
					type="text"
					bind:value={formData.city}
					placeholder="e.g. Lucknow"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="c-pin" class="mb-1 block text-xs font-medium text-text-secondary">PIN Code</label>
				<input
					id="c-pin"
					type="text"
					bind:value={formData.pinCode}
					placeholder="e.g. 226001"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="c-phone" class="mb-1 block text-xs font-medium text-text-secondary">Primary Mobile</label>
				<input
					id="c-phone"
					type="tel"
					bind:value={formData.phone}
					placeholder="10-digit mobile"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="c-sms" class="mb-1 block text-xs font-medium text-text-secondary">Mobile (SMS / WhatsApp)</label>
				<input
					id="c-sms"
					type="tel"
					bind:value={formData.mobileSms}
					placeholder="SMS notification number"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="c-tel" class="mb-1 block text-xs font-medium text-text-secondary">Telephone (Landline)</label>
				<input
					id="c-tel"
					type="text"
					bind:value={formData.telephone}
					placeholder="Office tel"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="c-contact" class="mb-1 block text-xs font-medium text-text-secondary">Contact Person</label>
				<input
					id="c-contact"
					type="text"
					bind:value={formData.contactPerson}
					placeholder="Owner / Manager"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>
		</div>
	</div>

	<!-- Section 4: Commercial Terms & Khata Defaults -->
	<div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
		<h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-text-muted">Commercial Terms & Khata Defaults</h3>
		<div class="grid grid-cols-1 gap-3 md:grid-cols-4">
			<div>
				<label for="c-days" class="mb-1 block text-xs font-medium text-text-secondary">Credit Days</label>
				<input
					id="c-days"
					type="number"
					min="0"
					bind:value={formData.creditDays}
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs tabular-nums text-text-primary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="c-limit" class="mb-1 block text-xs font-medium text-text-secondary">Credit Limit (₹)</label>
				<input
					id="c-limit"
					type="number"
					step="0.01"
					min="0"
					bind:value={formData.creditLimit}
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs tabular-nums text-text-primary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
				{#if errors.creditLimit}<p class="mt-1 text-[11px] text-danger">{errors.creditLimit}</p>{/if}
			</div>

			<div>
				<label for="c-opbal" class="mb-1 block text-xs font-medium text-text-secondary">Opening Balance (₹)</label>
				<input
					id="c-opbal"
					type="number"
					step="0.01"
					bind:value={formData.openingBalance}
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs tabular-nums text-text-primary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="c-rep" class="mb-1 block text-xs font-medium text-text-secondary">Sales Rep / MR</label>
				<input
					id="c-rep"
					type="text"
					bind:value={formData.salesRep}
					placeholder="Assigned MR"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="c-addamt" class="mb-1 block text-xs font-medium text-text-secondary">Default Add Amount (₹)</label>
				<input
					id="c-addamt"
					type="number"
					step="0.01"
					bind:value={formData.defaultAddAmount}
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs tabular-nums text-text-primary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="c-adddet" class="mb-1 block text-xs font-medium text-text-secondary">Add Detail (e.g. Courier)</label>
				<input
					id="c-adddet"
					type="text"
					bind:value={formData.defaultAddDetail}
					placeholder="Reason for Add charge"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="c-lessamt" class="mb-1 block text-xs font-medium text-text-secondary">Default Less Amount (₹)</label>
				<input
					id="c-lessamt"
					type="number"
					step="0.01"
					bind:value={formData.defaultLessAmount}
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs tabular-nums text-text-primary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="c-lessdet" class="mb-1 block text-xs font-medium text-text-secondary">Less Detail (e.g. Rebate)</label>
				<input
					id="c-lessdet"
					type="text"
					bind:value={formData.defaultLessDetail}
					placeholder="Reason for Less discount"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div class="md:col-span-2">
				<label for="c-remarks" class="mb-1 block text-xs font-medium text-text-secondary">Remarks / Special Notes</label>
				<input
					id="c-remarks"
					type="text"
					bind:value={formData.remarks}
					placeholder="Special delivery instructions, transport name, etc."
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div class="flex items-center gap-6 pt-4 md:col-span-2">
				<label class="flex cursor-pointer items-center gap-2 text-xs font-medium text-text-primary">
					<input
						type="checkbox"
						bind:checked={formData.isComposite}
						class="h-4 w-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
					/>
					<span>GST Composition Dealer</span>
				</label>

				<label class="flex cursor-pointer items-center gap-2 text-xs font-medium text-text-primary">
					<input
						type="checkbox"
						bind:checked={formData.active}
						class="h-4 w-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
					/>
					<span>Active Account</span>
				</label>
			</div>
		</div>
	</div>

	<!-- Actions -->
	<div class="flex justify-end gap-2.5">
		<Button type="button" variant="secondary" size="sm" onclick={onCancel}>Cancel (Esc)</Button>
		<Button type="submit" variant="primary" size="sm" disabled={isSaving}>
			{isSaving ? 'Saving...' : 'Save Customer Master'}
		</Button>
	</div>
</form>
