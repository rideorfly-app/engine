import { describe, expect, it } from 'vitest';
import { addDays, dayOfYear, monthOf } from '../src/dates';
import { straightLineMiles } from '../src/geo';
import { sunTimes } from '../src/sun';

describe('straightLineMiles', () => {
	it('measures Denver to Salt Lake City', () => {
		const miles = straightLineMiles({ lat: 39.74, lon: -104.99 }, { lat: 40.76, lon: -111.89 });

		// About 371 miles as the crow flies.
		expect(miles).toBeGreaterThan(365);
		expect(miles).toBeLessThan(377);
	});

	it('is zero for the same point', () => {
		expect(straightLineMiles({ lat: 40, lon: -100 }, { lat: 40, lon: -100 })).toBe(0);
	});
});

describe('dates', () => {
	it('adds days across months and years', () => {
		expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
		expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
	});

	it('counts the day of the year', () => {
		expect(dayOfYear('2026-01-01')).toBe(1);
		expect(dayOfYear('2026-12-31')).toBe(365);
		expect(dayOfYear('2028-12-31')).toBe(366);
	});

	it('reads the month', () => {
		expect(monthOf('2026-11-05')).toBe(11);
	});
});

describe('sunTimes', () => {
	/** Converts UTC minutes to a local clock reading, in minutes after midnight. */
	const local = (utc: number, offset: number): number => utc + offset;

	it('puts a December sunset in Denver near 4:39 p.m.', () => {
		const { sunrise, sunset } = sunTimes('2026-12-18', 39.74, -104.99);

		expect(local(sunset, -420)).toBeGreaterThan(16 * 60 + 34);
		expect(local(sunset, -420)).toBeLessThan(16 * 60 + 44);
		expect(local(sunrise, -420)).toBeGreaterThan(7 * 60 + 10);
		expect(local(sunrise, -420)).toBeLessThan(7 * 60 + 22);
	});

	it('puts a November sunset in Minneapolis near 4:57 p.m.', () => {
		const { sunset } = sunTimes('2026-11-05', 44.98, -93.27);

		expect(local(sunset, -360)).toBeGreaterThan(16 * 60 + 52);
		expect(local(sunset, -360)).toBeLessThan(17 * 60 + 2);
	});
});
