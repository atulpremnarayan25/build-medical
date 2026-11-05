/**
 * Real User Monitoring (RUM) & Core Web Vitals Tracker.
 * Lightweight, zero-dependency browser performance instrumentation.
 */

export interface PerformanceMetrics {
	ttfb: number | null;
	lcp: number | null;
	cls: number;
	inp: number | null;
	connection?: {
		effectiveType?: string;
		rtt?: number;
		downlink?: number;
		saveData?: boolean;
	};
}

export type MetricRating = 'good' | 'needs-improvement' | 'poor';

export function rateMetric(name: 'lcp' | 'inp' | 'cls' | 'ttfb', value: number): MetricRating {
	switch (name) {
		case 'lcp':
			return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
		case 'inp':
			return value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor';
		case 'cls':
			return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
		case 'ttfb':
			return value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor';
	}
}

export class RumTracker {
	private metrics: PerformanceMetrics = {
		ttfb: null,
		lcp: null,
		cls: 0,
		inp: null
	};
	private observers: PerformanceObserver[] = [];
	private initialized = false;

	public init(onReport?: (metrics: PerformanceMetrics) => void): void {
		if (this.initialized || typeof window === 'undefined') return;
		this.initialized = true;

		// 1. Connection / Network Telemetry
		const nav = navigator as any;
		if (nav.connection) {
			this.metrics.connection = {
				effectiveType: nav.connection.effectiveType,
				rtt: nav.connection.rtt,
				downlink: nav.connection.downlink,
				saveData: nav.connection.saveData
			};
		}

		// 2. TTFB (Time to First Byte)
		if (performance.getEntriesByType) {
			const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
			if (navEntries.length > 0) {
				const navEntry = navEntries[0];
				this.metrics.ttfb = navEntry.responseStart;
			}
		}

		if (typeof PerformanceObserver === 'undefined') return;

		// 3. LCP (Largest Contentful Paint)
		try {
			const lcpObserver = new PerformanceObserver((entryList) => {
				const entries = entryList.getEntries();
				const lastEntry = entries[entries.length - 1] as PerformanceEntry;
				if (lastEntry) {
					this.metrics.lcp = Math.round(lastEntry.startTime);
				}
			});
			lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
			this.observers.push(lcpObserver);
		} catch {}

		// 4. CLS (Cumulative Layout Shift)
		try {
			const clsObserver = new PerformanceObserver((entryList) => {
				for (const entry of entryList.getEntries()) {
					if (!(entry as any).hadRecentInput) {
						this.metrics.cls = Number((this.metrics.cls + (entry as any).value).toFixed(4));
					}
				}
			});
			clsObserver.observe({ type: 'layout-shift', buffered: true });
			this.observers.push(clsObserver);
		} catch {}

		// 5. INP (Interaction to Next Paint)
		try {
			const inpObserver = new PerformanceObserver((entryList) => {
				for (const entry of entryList.getEntries()) {
					const duration = (entry as any).duration;
					if (duration !== undefined) {
						this.metrics.inp = Math.max(this.metrics.inp ?? 0, Math.round(duration));
					}
				}
			});
			inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 } as any);
			this.observers.push(inpObserver);
		} catch {}

		// Report on pagehide / visibilitychange
		const report = () => {
			if (onReport) {
				onReport(this.getMetrics());
			}
		};

		window.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'hidden') report();
		});
		window.addEventListener('pagehide', report);
	}

	public getMetrics(): PerformanceMetrics {
		return { ...this.metrics };
	}

	public destroy(): void {
		for (const obs of this.observers) {
			obs.disconnect();
		}
		this.observers = [];
		this.initialized = false;
	}
}

export const rum = new RumTracker();
