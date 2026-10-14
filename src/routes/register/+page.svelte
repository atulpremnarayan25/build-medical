<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import { Button } from '$lib/components/common';
	import ThemeToggle from '$lib/components/common/ThemeToggle.svelte';
	import { Cross, KeyRound, User, UserPlus, Shield, Eye, EyeOff, Check, X } from '@lucide/svelte';

	let { form }: { form: ActionData } = $props();
	let submitting = $state(false);
	let showPassword = $state(false);
	let showConfirmPassword = $state(false);

	let password = $state('');
	let confirmPassword = $state('');

	let passwordMatch = $derived(
		confirmPassword.length > 0 ? password === confirmPassword : null
	);
</script>

<svelte:head>
	<title>Create Stockist Account - MedStock ERP</title>
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
							<p class="text-[11px] text-text-muted">Create Wholesaler Account</p>
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
						class="space-y-3.5"
					>
						{#if form?.error}
							<div class="rounded-lg border border-danger/30 bg-danger-light/50 p-3 text-xs font-medium text-danger animate-in fade-in-0 duration-150">
								{form.error}
							</div>
						{/if}

						<div>
							<label for="name" class="mb-1 block text-xs font-semibold text-text-secondary">Full Name</label>
							<div class="relative">
								<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
									<UserPlus class="h-4 w-4" />
								</div>
								<input
									type="text"
									name="name"
									id="name"
									data-testid="name-input"
									required
									autocomplete="name"
									class="block w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-none transition-all"
									placeholder="John Doe"
								/>
							</div>
						</div>

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
									autocomplete="username"
									class="block w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-none transition-all"
									placeholder="johndoe"
								/>
							</div>
						</div>

						<div>
							<label for="role" class="mb-1 block text-xs font-semibold text-text-secondary">Role Assignment</label>
							<div class="relative">
								<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
									<Shield class="h-4 w-4" />
								</div>
								<select
									name="role"
									id="role"
									data-testid="role-select"
									class="block w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm font-medium text-text-primary focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-none transition-all cursor-pointer"
								>
									<option value="owner_admin">Owner / Administrator (Full Access)</option>
									<option value="biller">Biller (Counter POS / Inward)</option>
								</select>
							</div>
						</div>

						<div>
							<label for="password" class="mb-1 block text-xs font-semibold text-text-secondary">Password</label>
							<div class="relative">
								<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
									<KeyRound class="h-4 w-4" />
								</div>
								<input
									type={showPassword ? 'text' : 'password'}
									name="password"
									id="password"
									data-testid="password-input"
									bind:value={password}
									required
									autocomplete="new-password"
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

						<div>
							<div class="flex items-center justify-between mb-1">
								<label for="confirmPassword" class="text-xs font-semibold text-text-secondary">
									Confirm Password
								</label>
								{#if passwordMatch === true}
									<span class="inline-flex items-center gap-1 text-[11px] font-medium text-success">
										<Check class="h-3 w-3" /> Passwords match
									</span>
								{:else if passwordMatch === false}
									<span class="inline-flex items-center gap-1 text-[11px] font-medium text-danger">
										<X class="h-3 w-3" /> Do not match
									</span>
								{/if}
							</div>
							<div class="relative">
								<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
									<KeyRound class="h-4 w-4" />
								</div>
								<input
									type={showConfirmPassword ? 'text' : 'password'}
									name="confirmPassword"
									id="confirmPassword"
									data-testid="confirm-password-input"
									bind:value={confirmPassword}
									required
									autocomplete="new-password"
									class="block w-full rounded-lg border bg-surface py-2 pl-9 pr-10 text-sm font-medium text-text-primary placeholder:text-text-muted focus:ring-2 focus:outline-none transition-all {passwordMatch === false ? 'border-danger focus:border-danger focus:ring-danger/15' : 'border-border focus:border-accent focus:ring-accent/15'}"
									placeholder="••••••••"
								/>
								<button
									type="button"
									class="pressable absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted hover:text-text-primary cursor-pointer"
									onclick={() => (showConfirmPassword = !showConfirmPassword)}
									aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
								>
									{#if showConfirmPassword}
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
								data-testid="register-submit-button"
								class="w-full justify-center py-2 text-sm font-semibold"
								loading={submitting}
								disabled={submitting || passwordMatch === false}
							>
								Create Stockist Account
							</Button>
						</div>

						<div class="border-t border-border/60 pt-4 text-center text-xs text-text-muted">
							Already have an account?
							<a
								href="/login"
								class="font-semibold text-accent hover:underline ml-1"
							>
								Sign in here
							</a>
						</div>
					</form>
				</div>
			</div>
		</div>
	</div>
</div>
