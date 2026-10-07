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

// Force light mode on client
if (browser) {
	try {
		localStorage.setItem('theme', 'light');
		theme = 'light';
		applyTheme('light');
	} catch (e) {
		// Ignore storage errors
	}
}

function applyTheme(_t: Theme): void {
	if (!browser) return;
	document.documentElement.setAttribute('data-theme', 'light');
	document.documentElement.classList.remove('dark');
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
export function setTheme(_newTheme?: Theme): void {
	theme = 'light';
	if (browser) {
		try {
			localStorage.setItem('theme', 'light');
		} catch (e) {}
		applyTheme('light');
	}
}
export function toggleTheme(): void {
	setTheme('light');
}
export function toggleSidebar(): void {
	sidebarCollapsed = !sidebarCollapsed;
}
export function setSidebarOpen(open: boolean): void {
	sidebarOpen = open;
}
