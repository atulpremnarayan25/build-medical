<script lang="ts">
	import { PageHeader } from '$lib/components/common/index.js';
	import SupplierForm from '$lib/components/forms/SupplierForm.svelte';
	import type { CreateSupplierInput } from '$lib/types/supplier.js';
	import { supplierService } from '$lib/services/index.js';
	import { goto } from '$app/navigation';
	import { addToast } from '$lib/stores/toastStore.svelte.js';

	let isSaving = $state(false);

	async function handleSave(data: CreateSupplierInput) {
		isSaving = true;
		try {
			await supplierService.createSupplier(data);
			addToast('success', 'Supplier added successfully');
			goto('/suppliers');
		} catch (e) {
			console.error(e);
			addToast('error', 'Failed to add supplier');
		} finally {
			isSaving = false;
		}
	}

	function handleCancel() {
		goto('/suppliers');
	}
</script>

<div class="mx-auto max-w-4xl">
	<PageHeader title="New Supplier" subtitle="Add a new supplier account" backHref="/suppliers" />

	<div class="mt-2">
		<SupplierForm onSave={handleSave} onCancel={handleCancel} {isSaving} />
	</div>
</div>
