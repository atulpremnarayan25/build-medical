<script lang="ts">
	import { PageHeader } from '$lib/components/common/index.js';
	import CustomerForm from '$lib/components/forms/CustomerForm.svelte';
	import type { CreateCustomerInput } from '$lib/types/customer.js';
	import { customerService } from '$lib/services/index.js';
	import { goto } from '$app/navigation';
	import { addToast } from '$lib/stores/toastStore.svelte.js';

	let isSaving = $state(false);

	async function handleSave(data: CreateCustomerInput) {
		isSaving = true;
		try {
			await customerService.createCustomer(data);
			addToast('success', 'Customer added successfully');
			goto('/customers');
		} catch (e) {
			console.error(e);
			addToast('error', 'Failed to add customer');
		} finally {
			isSaving = false;
		}
	}

	function handleCancel() {
		goto('/customers');
	}
</script>

<div class="mx-auto max-w-4xl">
	<PageHeader title="New Customer" subtitle="Add a new customer account" backHref="/customers" />

	<div class="mt-2">
		<CustomerForm onSave={handleSave} onCancel={handleCancel} {isSaving} />
	</div>
</div>
