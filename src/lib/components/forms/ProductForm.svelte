<script lang="ts">
	import type { Product, CreateProductInput } from '$lib/types/product.js';
	import { Button } from '$lib/components/common/index.js';

	let {
		product = null,
		onSave,
		onCancel,
		isSaving = false
	}: {
		product?: Product | null;
		onSave: (data: CreateProductInput) => void;
		onCancel: () => void;
		isSaving?: boolean;
	} = $props();

	// Form state
	let formData = $state<CreateProductInput>({
		name: '',
		genericName: '',
		manufacturer: '',
		category: '',
		hsn: '',
		gstRate: 0,
		mrp: 0,
		sellingRate: 0,
		purchaseRate: 0,
		packSize: 1,
		drugSchedule: 'none',
		active: true
	});

	// Initialize state
	$effect(() => {
		if (product) {
			formData.name = product.name;
			formData.genericName = product.genericName || '';
			formData.manufacturer = product.manufacturer || '';
			formData.category = product.category || '';
			formData.hsn = product.hsn || '';
			formData.gstRate = product.gstRate;
			formData.mrp = product.mrp;
			formData.sellingRate = product.sellingRate;
			formData.purchaseRate = product.purchaseRate;
			formData.packSize = product.packSize;
			formData.drugSchedule = product.drugSchedule;
			formData.active = product.active;
		}
	});

	let errors = $state<Partial<Record<keyof CreateProductInput, string>>>({});

	function validate() {
		const newErrors: Partial<Record<keyof CreateProductInput, string>> = {};

		if (!formData.name) newErrors.name = 'Product name is required';
		if (formData.gstRate < 0) newErrors.gstRate = 'GST rate cannot be negative';
		if (formData.mrp < 0) newErrors.mrp = 'MRP cannot be negative';
		if (formData.sellingRate < 0) newErrors.sellingRate = 'Selling rate cannot be negative';
		if (formData.purchaseRate < 0) newErrors.purchaseRate = 'Purchase rate cannot be negative';
		if (formData.packSize < 1) newErrors.packSize = 'Pack size must be at least 1';

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
		<h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-text-muted">Basic & Clinical Information</h3>
		<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
			<div>
				<label for="p-name" class="mb-1 block text-xs font-medium text-text-secondary"
					>Trade / Product Name *</label
				>
				<input
					id="p-name"
					type="text"
					bind:value={formData.name}
					required
					placeholder="e.g. Augmentin 625mg Duo Tab"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
				/>
				{#if errors.name}<p class="mt-1 text-[11px] text-danger">{errors.name}</p>{/if}
			</div>

			<div>
				<label for="p-generic" class="mb-1 block text-xs font-medium text-text-secondary"
					>Generic Composition</label
				>
				<input
					id="p-generic"
					type="text"
					bind:value={formData.genericName}
					placeholder="e.g. Amoxycillin (500mg) + Clavulanic Acid (125mg)"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
				/>
			</div>

			<div>
				<label for="p-mfg" class="mb-1 block text-xs font-medium text-text-secondary"
					>Manufacturer / Marketer</label
				>
				<input
					id="p-mfg"
					type="text"
					bind:value={formData.manufacturer}
					placeholder="e.g. GlaxoSmithKline Pharmaceuticals"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
				/>
			</div>

			<div>
				<label for="p-cat" class="mb-1 block text-xs font-medium text-text-secondary"
					>Category</label
				>
				<input
					id="p-cat"
					type="text"
					bind:value={formData.category}
					placeholder="e.g. Antibiotics / Tablets"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
				/>
			</div>
		</div>

		<!-- Schedule & Pack Size -->
		<div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
			<div>
				<label for="p-pack" class="mb-1 block text-xs font-medium text-text-secondary"
					>Pack Size (Units/Strip per Box)</label
				>
				<input
					id="p-pack"
					type="number"
					min="1"
					bind:value={formData.packSize}
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs tabular-nums text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
				/>
			</div>

			<div>
				<label for="p-sched" class="mb-1 block text-xs font-medium text-text-secondary"
					>Drug Schedule (Statutory Classification)</label
				>
				<select
					id="p-sched"
					bind:value={formData.drugSchedule}
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none {formData.drugSchedule === 'H1' || formData.drugSchedule === 'X' ? 'border-schedule-h1/50 bg-schedule-h1-light/30 font-semibold text-schedule-h1' : ''}"
				>
					<option value="none">None (General OTC / Non-Regulated)</option>
					<option value="H">Schedule H (Prescription Required)</option>
					<option value="H1">Schedule H1 (Narcotics/Regulated Log Required)</option>
					<option value="X">Schedule X (Strict Controlled Narcotic)</option>
				</select>
			</div>
		</div>
	</div>

	<!-- Pricing & Tax -->
	<div class="rounded-xl border border-border bg-surface p-4 shadow-2xs">
		<h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-text-muted">Pricing, GST & Accounting</h3>
		<div class="grid grid-cols-1 gap-3 md:grid-cols-3">
			<div>
				<label for="p-mrp" class="mb-1 block text-xs font-medium text-text-secondary"
					>MRP (₹) *</label
				>
				<input
					id="p-mrp"
					type="number"
					step="0.01"
					min="0"
					bind:value={formData.mrp}
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs tabular-nums text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
				/>
				{#if errors.mrp}<p class="mt-1 text-[11px] text-danger">{errors.mrp}</p>{/if}
			</div>
			<div>
				<label for="p-srate" class="mb-1 block text-xs font-medium text-text-secondary"
					>Selling Rate (₹)</label
				>
				<input
					id="p-srate"
					type="number"
					step="0.01"
					min="0"
					bind:value={formData.sellingRate}
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs tabular-nums text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
				/>
			</div>
			<div>
				<label for="p-prate" class="mb-1 block text-xs font-medium text-text-secondary"
					>Purchase Rate (₹)</label
				>
				<input
					id="p-prate"
					type="number"
					step="0.01"
					min="0"
					bind:value={formData.purchaseRate}
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs tabular-nums text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
				/>
			</div>

			<div>
				<label for="p-gst" class="mb-1 block text-xs font-medium text-text-secondary"
					>GST Rate (%)</label
				>
				<input
					id="p-gst"
					type="number"
					step="0.1"
					min="0"
					bind:value={formData.gstRate}
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs tabular-nums text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
				/>
			</div>
			<div>
				<label for="p-hsn" class="mb-1 block text-xs font-medium text-text-secondary"
					>HSN Code</label
				>
				<input
					id="p-hsn"
					type="text"
					bind:value={formData.hsn}
					placeholder="3004"
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
				/>
			</div>

			<div class="flex items-center pt-5">
				<label class="flex items-center gap-2 cursor-pointer text-xs font-medium text-text-primary">
					<input
						id="p-active"
						type="checkbox"
						bind:checked={formData.active}
						class="h-4 w-4 rounded border-border text-accent focus:ring-accent focus:ring-offset-0"
					/>
					<span>Active Product</span>
				</label>
			</div>
		</div>
	</div>

	<!-- Actions -->
	<div class="flex justify-end gap-2.5">
		<Button type="button" variant="secondary" size="sm" onclick={onCancel}>Cancel</Button>
		<Button type="submit" variant="primary" size="sm" disabled={isSaving}>
			{isSaving ? 'Saving...' : 'Save Product'}
		</Button>
	</div>
</form>
