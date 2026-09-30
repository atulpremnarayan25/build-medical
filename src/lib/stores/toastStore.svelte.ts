export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
	id: string;
	type: ToastType;
	message: string;
	duration: number;
}

const toasts: Toast[] = $state([]);

let counter = 0;

function generateId(): string {
	counter += 1;
	return `toast-${Date.now()}-${counter}`;
}

export function addToast(type: ToastType, message: string, duration = 4000): string {
	const id = generateId();
	const toast: Toast = { id, type, message, duration };
	toasts.push(toast);

	if (duration > 0) {
		setTimeout(() => {
			removeToast(id);
		}, duration);
	}

	return id;
}

export function removeToast(id: string): void {
	const index = toasts.findIndex((t) => t.id === id);
	if (index !== -1) {
		toasts.splice(index, 1);
	}
}

export function getToasts(): Toast[] {
	return toasts;
}
