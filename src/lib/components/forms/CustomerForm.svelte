<script lang="ts">
	import type { Customer, CreateCustomerInput } from '$lib/types/customer.js';
	import { Button } from '$lib/components/common/index.js';

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
		email: '',
		address: '',
		gstin: '',
		creditLimit: 0,
		active: true
	});

	// Initialize state
	$effect(() => {
		if (customer) {
			formData.name = customer.name;
			formData.code = customer.code || '';
			formData.phone = customer.phone || '';
			formData.email = customer.email || '';
			formData.address = customer.address || '';
			formData.gstin = customer.gstin || '';
			formData.creditLimit = customer.creditLimit;
			formData.active = customer.active;
		}
	});

	let errors = $state<Partial<Record<keyof CreateCustomerInput, string>>>({});

	function validate() {
		const newErrors: Partial<Record<keyof CreateCustomerInput, string>> = {};

		if (!formData.name.trim()) newErrors.name = 'Customer name is required';
		if (formData.creditLimit < 0) newErrors.creditLimit = 'Credit limit cannot be negative';

		// Basic GSTIN format validation (Optional)
		if (formData.gstin && formData.gstin.trim().length !== 15) {
			newErrors.gstin = 'Invalid GSTIN length. Must be 15 characters.';
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
</script>

<form onsubmit={handleSubmit} class="space-y-4">
	<!-- Basic Information -->
	<div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
		<h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-text-muted">Basic Information</h3>
		<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
			<div>
				<label for="c-name" class="mb-1 block text-xs font-medium text-text-secondary"
					>Name *</label
				>
				<input
					id="c-name"
					type="text"
					bind:value={formData.name}
					required
					placeholder="e.g. Apollo Pharmacy / John Doe"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
				{#if errors.name}<p class="mt-1 text-[11px] text-danger">{errors.name}</p>{/if}
			</div>

			<div>
				<label for="c-code" class="mb-1 block text-xs font-medium text-text-secondary"
					>Customer Code</label
				>
				<input
					id="c-code"
					type="text"
					bind:value={formData.code}
					placeholder="CUST-XXXX"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="c-phone" class="mb-1 block text-xs font-medium text-text-secondary"
					>Phone</label
				>
				<input
					id="c-phone"
					type="tel"
					bind:value={formData.phone}
					placeholder="+91 98765 43210"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="c-email" class="mb-1 block text-xs font-medium text-text-secondary"
					>Email</label
				>
				<input
					id="c-email"
					type="email"
					bind:value={formData.email}
					placeholder="billing@example.com"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>
		</div>
	</div>

	<!-- Business Information -->
	<div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
		<h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-text-muted">
			Statutory & Tax Details
		</h3>
		<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
			<div class="md:col-span-2">
				<label for="c-addr" class="mb-1 block text-xs font-medium text-text-secondary"
					>Billing Address</label
				>
				<textarea
					id="c-addr"
					rows="2"
					bind:value={formData.address}
					placeholder="Shop / House No, Street, Landmark, City, State, PIN"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				></textarea>
			</div>

			<div class="md:col-span-2">
				<label for="c-gstin" class="mb-1 block text-xs font-medium text-text-secondary"
					>GSTIN (15 Digits)</label
				>
				<input
					id="c-gstin"
					type="text"
					bind:value={formData.gstin}
					placeholder="27ABCDE1234F1Z5"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs uppercase text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
				{#if errors.gstin}<p class="mt-1 text-[11px] text-danger">{errors.gstin}</p>{/if}
			</div>
		</div>
	</div>

	<!-- Credit -->
	<div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
		<h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-text-muted">Credit & Terms</h3>
		<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
			<div>
				<label for="c-limit" class="mb-1 block text-xs font-medium text-text-secondary"
					>Credit Limit (₹)</label
				>
				<input
					id="c-limit"
					type="number"
					step="0.01"
					min="0"
					bind:value={formData.creditLimit}
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs tabular-nums text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
				{#if errors.creditLimit}<p class="mt-1 text-[11px] text-danger">{errors.creditLimit}</p>{/if}
			</div>

			<div class="flex items-center pt-5">
				<label class="flex items-center gap-2 cursor-pointer text-xs font-medium text-text-primary">
					<input
						id="c-active"
						type="checkbox"
						bind:checked={formData.active}
						class="h-4 w-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
					/>
					<span>Active Customer Account</span>
				</label>
			</div>
		</div>
	</div>

	<!-- Actions -->
	<div class="flex justify-end gap-2.5">
		<Button type="button" variant="secondary" size="sm" onclick={onCancel}>Cancel</Button>
		<Button type="submit" variant="primary" size="sm" disabled={isSaving}>
			{isSaving ? 'Saving...' : 'Save Customer'}
		</Button>
	</div>
</form>
