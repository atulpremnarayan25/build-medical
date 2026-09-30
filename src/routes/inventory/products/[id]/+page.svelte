<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { PageHeader, LoadingState, EmptyState } from '$lib/components/common/index.js';
	import ProductForm from '$lib/components/forms/ProductForm.svelte';
	import type { Product, CreateProductInput } from '$lib/types/product.js';
	import { productService } from '$lib/services/index.js';
	import { goto } from '$app/navigation';
	import { addToast } from '$lib/stores/toastStore.svelte.js';

	let productId = $derived($page.params.id as string);
	let product = $state<Product | null>(null);
	let loading = $state(true);
	let isSaving = $state(false);

	onMount(async () => {
		try {
			product = await productService.getProduct(productId);
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	});

	async function handleSave(data: CreateProductInput) {
		isSaving = true;
		try {
			await productService.updateProduct(productId, data);
			addToast('success', 'Product updated successfully');
			goto('/inventory/products');
		} catch (e) {
			console.error(e);
			addToast('error', 'Failed to update product');
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
		title={product ? `Edit ${product.name}` : 'Edit Product'}
		backHref="/inventory/products"
	/>

	<div class="mt-2">
		{#if loading}
			<LoadingState message="Loading product details..." />
		{:else if !product}
			<EmptyState title="Not Found" message="The product you are trying to edit does not exist." />
		{:else}
			<ProductForm {product} onSave={handleSave} onCancel={handleCancel} {isSaving} />
		{/if}
	</div>
</div>
