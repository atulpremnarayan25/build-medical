<script lang="ts">
	import { PageHeader } from '$lib/components/common/index.js';
	import ProductForm from '$lib/components/forms/ProductForm.svelte';
	import type { CreateProductInput } from '$lib/types/product.js';
	import { productService } from '$lib/services/index.js';
	import { goto } from '$app/navigation';
	import { addToast } from '$lib/stores/toastStore.svelte.js';

	let isSaving = $state(false);

	async function handleSave(data: CreateProductInput) {
		isSaving = true;
		try {
			await productService.createProduct(data);
			addToast('success', 'Product created successfully');
			goto('/inventory/products');
		} catch (e) {
			console.error(e);
			addToast('error', 'Failed to create product');
		} finally {
			isSaving = false;
		}
	}

	function handleCancel() {
		goto('/inventory/products');
	}
</script>

<div class="mx-auto max-w-4xl">
	<PageHeader
		title="New Product"
		subtitle="Add a new product to inventory"
		backHref="/inventory/products"
	/>

	<div class="mt-2">
		<ProductForm onSave={handleSave} onCancel={handleCancel} {isSaving} />
	</div>
</div>
