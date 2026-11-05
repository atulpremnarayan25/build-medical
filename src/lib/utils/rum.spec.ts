import { describe, it, expect } from 'vitest';
import { rateMetric, RumTracker } from './rum.js';

describe('RUM and Core Web Vitals', () => {
	it('rates LCP correctly according to CWV standards', () => {
		expect(rateMetric('lcp', 2000)).toBe('good');
		expect(rateMetric('lcp', 2500)).toBe('good');
		expect(rateMetric('lcp', 3500)).toBe('needs-improvement');
		expect(rateMetric('lcp', 4500)).toBe('poor');
	});

	it('rates INP correctly', () => {
		expect(rateMetric('inp', 150)).toBe('good');
		expect(rateMetric('inp', 200)).toBe('good');
		expect(rateMetric('inp', 350)).toBe('needs-improvement');
		expect(rateMetric('inp', 600)).toBe('poor');
	});

	it('rates CLS correctly', () => {
		expect(rateMetric('cls', 0.05)).toBe('good');
		expect(rateMetric('cls', 0.1)).toBe('good');
		expect(rateMetric('cls', 0.2)).toBe('needs-improvement');
		expect(rateMetric('cls', 0.35)).toBe('poor');
	});

	it('rates TTFB correctly', () => {
		expect(rateMetric('ttfb', 400)).toBe('good');
		expect(rateMetric('ttfb', 800)).toBe('good');
		expect(rateMetric('ttfb', 1200)).toBe('needs-improvement');
		expect(rateMetric('ttfb', 2200)).toBe('poor');
	});

	it('safely handles non-browser environments during init', () => {
		const tracker = new RumTracker();
		tracker.init();
		const metrics = tracker.getMetrics();
		expect(metrics.cls).toBe(0);
		tracker.destroy();
	});
});
