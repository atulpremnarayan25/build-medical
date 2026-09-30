import type { User } from './user.js';

export type SyncStatus = 'synced' | 'offline' | 'syncing' | 'pending' | 'error';

export interface AppState {
	syncStatus: SyncStatus;
	pendingChanges: number;
	lastSyncAt?: string;
	currentUser: User | null;
}

export interface BusinessInfo {
	name: string;
	address?: string;
	gstin?: string;
	phone?: string;
	email?: string;
}

export type Theme = 'light' | 'dark' | 'system';
