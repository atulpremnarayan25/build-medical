<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import { Button } from '$lib/components/common';
	import { Cross, KeyRound, User } from '@lucide/svelte';

	let { form }: { form: ActionData } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Sign In - MedStock ERP</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-surface-secondary p-4">
	<div class="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-md">
		<!-- Header -->
		<div class="border-b border-border bg-surface px-8 pt-8 pb-6 text-center">
			<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-white shadow-2xs">
				<Cross class="h-6 w-6" />
			</div>
			<h1 class="mt-4 text-xl font-black tracking-tight text-text-primary">MedStock ERP</h1>
			<p class="mt-1 text-xs text-text-muted">Sign in to your wholesale stockist portal</p>
		</div>

		<!-- Form -->
		<div class="px-8 py-6">
			<form
				method="POST"
				use:enhance={() => {
					submitting = true;
					return async ({ update }) => {
						await update();
						submitting = false;
					};
				}}
				class="space-y-4"
			>
				{#if form?.error}
					<div class="rounded-lg border border-danger-light bg-danger-light/50 p-3 text-xs font-medium text-danger">
						{form.error}
					</div>
				{/if}

				<div>
					<label for="username" class="mb-1 block text-xs font-semibold text-text-secondary">Username</label>
					<div class="relative">
						<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
							<User class="h-4 w-4" />
						</div>
						<input
							type="text"
							name="username"
							id="username"
							data-testid="username-input"
							required
							class="block w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-xs font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
							placeholder="admin"
						/>
					</div>
				</div>

				<div>
					<label for="password" class="mb-1 block text-xs font-semibold text-text-secondary">Password</label>
					<div class="relative">
						<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
							<KeyRound class="h-4 w-4" />
						</div>
						<input
							type="password"
							name="password"
							id="password"
							data-testid="password-input"
							required
							class="block w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-xs font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
							placeholder="••••••••"
						/>
					</div>
				</div>

				<div class="pt-2">
					<Button
						type="submit"
						variant="primary"
						data-testid="login-submit-button"
						class="w-full justify-center py-2"
						disabled={submitting}
					>
						{submitting ? 'Signing in...' : 'Sign In'}
					</Button>
				</div>

				<div class="border-t border-border-subtle pt-4 text-center text-xs text-text-muted">
					Don't have an account?
					<a
						href="/register"
						class="font-semibold text-accent hover:underline"
					>
						Register here
					</a>
				</div>
			</form>
		</div>
	</div>
</div>
