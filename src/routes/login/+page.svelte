<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import { Button } from '$lib/components/common';
	import ThemeToggle from '$lib/components/common/ThemeToggle.svelte';
	import { Cross, KeyRound, User, Eye, EyeOff } from '@lucide/svelte';

	let { form }: { form: ActionData } = $props();
	let submitting = $state(false);
	let showPassword = $state(false);
</script>

<svelte:head>
	<title>Sign In - MedStock ERP</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-surface-secondary p-4">
	<div class="w-full max-w-md">
		<div class="bezel-outer shadow-xl">
			<div class="bezel-inner p-6 sm:p-8">
				<!-- Header with Theme Toggle -->
				<div class="flex items-center justify-between border-b border-border/60 pb-5 text-center">
					<div class="flex items-center gap-2.5">
						<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white shadow-xs">
							<Cross class="h-5 w-5" />
						</div>
						<div class="text-left">
							<h1 class="text-base font-bold tracking-tight text-text-primary">MedStock ERP</h1>
							<p class="text-[11px] text-text-muted">Wholesale Stockist Portal</p>
						</div>
					</div>
					<ThemeToggle compact={true} />
				</div>

				<!-- Form -->
				<div class="pt-6">
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
							<div class="rounded-lg border border-danger/30 bg-danger-light/50 p-3 text-xs font-medium text-danger animate-in fade-in-0 duration-150">
								{form.error}
							</div>
						{/if}

						<div>
							<label for="username" class="mb-1.5 block text-xs font-semibold text-text-secondary">Username</label>
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
									autocomplete="username"
									class="block w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-none transition-all"
									placeholder="admin"
								/>
							</div>
						</div>

						<div>
							<label for="password" class="mb-1.5 block text-xs font-semibold text-text-secondary">Password</label>
							<div class="relative">
								<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
									<KeyRound class="h-4 w-4" />
								</div>
								<input
									type={showPassword ? 'text' : 'password'}
									name="password"
									id="password"
									data-testid="password-input"
									required
									autocomplete="current-password"
									class="block w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-10 text-sm font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-none transition-all"
									placeholder="••••••••"
								/>
								<button
									type="button"
									class="pressable absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted hover:text-text-primary cursor-pointer"
									onclick={() => (showPassword = !showPassword)}
									aria-label={showPassword ? 'Hide password' : 'Show password'}
								>
									{#if showPassword}
										<EyeOff class="h-4 w-4" />
									{:else}
										<Eye class="h-4 w-4" />
									{/if}
								</button>
							</div>
						</div>

						<div class="pt-2">
							<Button
								type="submit"
								variant="primary"
								data-testid="login-submit-button"
								class="w-full justify-center py-2 text-sm font-semibold"
								loading={submitting}
								disabled={submitting}
							>
								Sign In
							</Button>
						</div>

						<div class="border-t border-border/60 pt-4 text-center text-xs text-text-muted">
							Don't have an account?
							<a
								href="/register"
								class="font-semibold text-accent hover:underline ml-1"
							>
								Register here
							</a>
						</div>
					</form>
				</div>
			</div>
		</div>
	</div>
</div>
