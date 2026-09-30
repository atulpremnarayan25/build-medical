import type { SyncStatus, Theme } from '$lib/types/app.js';
import type { SubscriptionDetails } from '$lib/types/subscription.js';
import { subscriptionService } from '$lib/services/subscriptionService.js';
import { browser } from '$app/environment';

// Reactive state
let syncStatus: SyncStatus = $state('synced');
let pendingChanges: number = $state(0);
let lastSyncAt: string | null = $state(null);
let theme: Theme = $state('light');
let sidebarCollapsed: boolean = $state(false);
let sidebarOpen: boolean = $state(false); // for mobile overlay
let currentSubscription: SubscriptionDetails = $state(subscriptionService.getSubscription());

// Initialize theme from localStorage on client
if (browser) {
	try {
		const savedTheme = localStorage.getItem('theme') as Theme | null;
		if (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'system') {
			theme = savedTheme;
		}
		applyTheme(theme);
	} catch (e) {
		// Ignore storage errors
	}
}

function applyTheme(t: Theme): void {
	if (!browser) return;
	const isDark =
		t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

	if (t === 'system') {
		document.documentElement.removeAttribute('data-theme');
	} else {
		document.documentElement.setAttribute('data-theme', t);
	}

	if (isDark) {
		document.documentElement.classList.add('dark');
	} else {
		document.documentElement.classList.remove('dark');
	}
}

// Getter functions
export function getSubscription(): SubscriptionDetails {
	return currentSubscription;
}
export function isSubscriptionActive(): boolean {
	return currentSubscription.status === 'active' || currentSubscription.status === 'trialing';
}
export function refreshSubscription(): void {
	currentSubscription = subscriptionService.getSubscription();
}
export function setSubscription(details: SubscriptionDetails): void {
	currentSubscription = details;
}
export function getSyncStatus(): SyncStatus {
	return syncStatus;
}
export function getPendingChanges(): number {
	return pendingChanges;
}
export function getLastSyncAt(): string | null {
	return lastSyncAt;
}
export function getTheme(): Theme {
	return theme;
}
export function isSidebarCollapsed(): boolean {
	return sidebarCollapsed;
}
export function isSidebarOpen(): boolean {
	return sidebarOpen;
}

// Actions
export function setSyncStatus(status: SyncStatus): void {
	syncStatus = status;
}
export function setPendingChanges(count: number): void {
	pendingChanges = count;
}
export function setLastSyncAt(date: string | null): void {
	lastSyncAt = date;
}
export function setTheme(newTheme: Theme): void {
	theme = newTheme;
	if (browser) {
		try {
			localStorage.setItem('theme', newTheme);
		} catch (e) {}
		applyTheme(newTheme);
	}
}
export function toggleTheme(): void {
	const next = theme === 'light' ? 'dark' : 'light';
	setTheme(next);
}
export function toggleSidebar(): void {
	sidebarCollapsed = !sidebarCollapsed;
}
export function setSidebarOpen(open: boolean): void {
	sidebarOpen = open;
}
