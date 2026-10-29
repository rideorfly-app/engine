import { describe, expect, it } from 'vitest';
import { addDays, dayOfYear, isDaylightSavingTime, monthOf } from '../src/dates';
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

	it('gives the same hours at longitude 0 as the local clock does, with no offset', () => {
		// The travel clock sits at longitude 0, so a trip needs only the latitude and the date.
		const { sunrise, sunset } = sunTimes('2026-12-18', 39.74, 0);

		expect(sunrise).toBeGreaterThan(7 * 60 + 10);
		expect(sunrise).toBeLessThan(7 * 60 + 22);
		expect(sunset).toBeGreaterThan(16 * 60 + 34);
		expect(sunset).toBeLessThan(16 * 60 + 44);
	});

	it('shortens the day as the latitude rises, in December', () => {
		const day = (lat: number) => {
			const { sunrise, sunset } = sunTimes('2026-12-18', lat, 0);

			return sunset - sunrise;
		};

		expect(day(47.6)).toBeLessThan(day(39.7)); // Seattle against Denver
		expect(day(39.7)).toBeLessThan(day(25.8)); // Denver against Miami
		expect(day(47.6)).toBeGreaterThan(8 * 60 + 5);
		expect(day(47.6)).toBeLessThan(8 * 60 + 35);
		expect(day(25.8)).toBeGreaterThan(10 * 60 + 25);
		expect(day(25.8)).toBeLessThan(10 * 60 + 55);
	});

	it('puts a November sunset in Minneapolis near 4:57 p.m.', () => {
		const { sunset } = sunTimes('2026-11-05', 44.98, -93.27);

		expect(local(sunset, -360)).toBeGreaterThan(16 * 60 + 52);
		expect(local(sunset, -360)).toBeLessThan(17 * 60 + 2);
	});
});

describe('isDaylightSavingTime', () => {
	it('starts on the second Sunday in March and ends on the first Sunday in November', () => {
		// 2025: March 9 and November 2. 2026: March 8 and November 1. 2027: March 14 and November 7.
		// 2028 is a leap year: March 12 and November 5.
		const edges: Array<[string, string, string, string]> = [
			['2025-03-08', '2025-03-09', '2025-11-01', '2025-11-02'],
			['2026-03-07', '2026-03-08', '2026-10-31', '2026-11-01'],
			['2027-03-13', '2027-03-14', '2027-11-06', '2027-11-07'],
			['2028-03-11', '2028-03-12', '2028-11-04', '2028-11-05'],
		];

		for (const [lastStandard, firstDst, lastDst, firstStandard] of edges) {
			expect(isDaylightSavingTime(lastStandard), lastStandard).toBe(false);
			expect(isDaylightSavingTime(firstDst), firstDst).toBe(true);
			expect(isDaylightSavingTime(lastDst), lastDst).toBe(true);
			expect(isDaylightSavingTime(firstStandard), firstStandard).toBe(false);
		}
	});

	it('is on all summer and off all winter', () => {
		expect(isDaylightSavingTime('2026-07-11')).toBe(true);
		expect(isDaylightSavingTime('2026-04-01')).toBe(true);
		expect(isDaylightSavingTime('2026-10-01')).toBe(true);
		expect(isDaylightSavingTime('2026-12-17')).toBe(false);
		expect(isDaylightSavingTime('2026-01-15')).toBe(false);
		expect(isDaylightSavingTime('2026-02-28')).toBe(false);
	});
});
