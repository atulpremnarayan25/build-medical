import type { SyncStatus, Theme } from '$lib/types/app.js';
import { browser } from '$app/environment';

// Reactive state
let syncStatus: SyncStatus = $state('synced');
let pendingChanges: number = $state(0);
let lastSyncAt: string | null = $state(null);
let theme: Theme = $state('light');
let sidebarCollapsed: boolean = $state(false);
let sidebarOpen: boolean = $state(false); // for mobile overlay

// Initialize theme from localStorage on client
if (browser) {
	try {
		const savedTheme = localStorage.getItem('theme') as Theme | null;
		const initialTheme: Theme =
			savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'system'
				? savedTheme
				: 'light';
		theme = initialTheme;
		applyTheme(initialTheme);
	} catch {
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
		} catch {
			// Ignore storage errors
		}
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
