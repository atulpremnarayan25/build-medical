<script lang="ts">
	import type { Supplier, CreateSupplierInput } from '$lib/types/supplier.js';
	import { Button } from '$lib/components/common/index.js';

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
		email: '',
		address: '',
		gstin: '',
		active: true
	});

	// Initialize state
	$effect(() => {
		if (supplier) {
			formData.name = supplier.name;
			formData.code = supplier.code || '';
			formData.phone = supplier.phone || '';
			formData.email = supplier.email || '';
			formData.address = supplier.address || '';
			formData.gstin = supplier.gstin || '';
			formData.active = supplier.active;
		}
	});

	let errors = $state<Partial<Record<keyof CreateSupplierInput, string>>>({});

	function validate() {
		const newErrors: Partial<Record<keyof CreateSupplierInput, string>> = {};

		if (!formData.name.trim()) newErrors.name = 'Supplier name is required';

		// Basic GSTIN format validation
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
				<label for="s-name" class="mb-1 block text-xs font-medium text-text-secondary"
					>Supplier Name *</label
				>
				<input
					id="s-name"
					type="text"
					bind:value={formData.name}
					required
					placeholder="e.g. Cipla Healthcare Ltd."
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
				{#if errors.name}<p class="mt-1 text-[11px] text-danger">{errors.name}</p>{/if}
			</div>

			<div>
				<label for="s-code" class="mb-1 block text-xs font-medium text-text-secondary"
					>Supplier Code</label
				>
				<input
					id="s-code"
					type="text"
					bind:value={formData.code}
					placeholder="SUP-XXXX"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="s-phone" class="mb-1 block text-xs font-medium text-text-secondary"
					>Phone</label
				>
				<input
					id="s-phone"
					type="tel"
					bind:value={formData.phone}
					placeholder="+91 98765 43210"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="s-email" class="mb-1 block text-xs font-medium text-text-secondary"
					>Email</label
				>
				<input
					id="s-email"
					type="email"
					bind:value={formData.email}
					placeholder="orders@supplier.com"
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
				<label for="s-addr" class="mb-1 block text-xs font-medium text-text-secondary"
					>Address</label
				>
				<textarea
					id="s-addr"
					rows="2"
					bind:value={formData.address}
					placeholder="Warehouse / Office address, City, State, PIN"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				></textarea>
			</div>

			<div class="md:col-span-2">
				<label for="s-gstin" class="mb-1 block text-xs font-medium text-text-secondary"
					>GSTIN (15 Digits)</label
				>
				<input
					id="s-gstin"
					type="text"
					bind:value={formData.gstin}
					placeholder="27ABCDE1234F1Z5"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs uppercase text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
				/>
				{#if errors.gstin}<p class="mt-1 text-[11px] text-danger">{errors.gstin}</p>{/if}
			</div>

			<div class="flex items-center pt-2 md:col-span-2">
				<label class="flex items-center gap-2 cursor-pointer text-xs font-medium text-text-primary">
					<input
						id="s-active"
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
		<Button type="button" variant="secondary" size="sm" onclick={onCancel}>Cancel</Button>
		<Button type="submit" variant="primary" size="sm" disabled={isSaving}>
			{isSaving ? 'Saving...' : 'Save Supplier'}
		</Button>
	</div>
</form>
