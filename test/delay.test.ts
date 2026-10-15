import { describe, expect, it } from 'vitest';
import { expectedDelay, type FlightHistory, type FlightMonth } from '../src/delay';

/** A month's row with made-up figures. */
const row = (
	month: string,
	averageDelayMinutes: number,
	lateShare = 0.2,
	cancelShare = 0.01,
	flights = 300,
): FlightMonth => ({ month, flights, averageDelayMinutes, lateShare, cancelShare });

/**
 * A route whose newest month is August 2026, with August and December rows for
 * past years. December runs 6, 8, and 10 minutes worse than August, and 2020
 * is wildly off, so it shows up if it isn't skipped.
 */
function history(overrides: Partial<FlightHistory> = {}): FlightHistory {
	return {
		route: [
			{ ...row('2026-08', 5, 0.2, 0.01), scheduledMinutes: 65 },
			row('2025-08', 4, 0.18, 0.01),
			row('2025-12', 10, 0.24, 0.02),
			row('2024-08', 3),
			row('2024-12', 11),
			row('2023-08', 2),
			row('2023-12', 12),
			row('2020-08', 0),
			row('2020-12', 90),
		],
		origin: [row('2025-08', 6), row('2025-12', 8)],
		destination: [row('2025-08', 6), row('2025-12', 10)],
		nation: [row('2025-08', 7), row('2025-12', 7)],
		...overrides,
	};
}

describe('expectedDelay', () => {
	it('starts from the newest month and adds the route’s season, averaged over three years', () => {
		const estimate = expectedDelay(history(), '2026-12-18');

		// 5 + the average of 6, 8, and 10.
		expect(estimate?.averageDelayMinutes).toBeCloseTo(13);
		expect(estimate?.season).toBe('route');
		expect(estimate?.newestMonth).toBe('2026-08');
		expect(estimate?.scheduledMinutes).toBe(65);
	});

	it('skips 2020 and looks further back instead', () => {
		const route = history().route.filter((month) => !month.month.startsWith('2023'));
		const estimate = expectedDelay(history({ route }), '2026-12-18');

		// Only 2025 and 2024 are left: 5 + the average of 6 and 8.
		expect(estimate?.averageDelayMinutes).toBeCloseTo(12);
	});

	it('moves the chances by the season too, kept between 0 and 1', () => {
		const estimate = expectedDelay(history(), '2026-12-18');

		// 2025 is the only year with chances that differ: 0.2 + (0.06 + 0 + 0) ÷ 3.
		expect(estimate?.delayChance).toBeCloseTo(0.22);

		const route = [
			row('2026-08', 5, 0.01, 0.01),
			row('2025-08', 5, 0.5, 0.01),
			row('2025-12', 5, 0.1, 0.01),
		];
		expect(expectedDelay(history({ route }), '2026-12-18')?.delayChance).toBe(0);
	});

	it('borrows the airports’ season on a thin route', () => {
		const route = [row('2026-08', 5, 0.2, 0.01, 40), ...history().route.slice(1)];
		const estimate = expectedDelay(history({ route }), '2026-12-18');

		// 5 + the average of the origin's 2 and the destination's 4.
		expect(estimate?.averageDelayMinutes).toBeCloseTo(8);
		expect(estimate?.season).toBe('airports');
	});

	it('falls back to the nation’s season, then to none', () => {
		const thin = [row('2026-08', 5, 0.2, 0.01, 40)];

		expect(
			expectedDelay(history({ route: thin, origin: [], destination: [] }), '2026-12-18')?.season,
		).toBe('nation');

		const alone = expectedDelay(
			{ route: thin, origin: [], destination: [], nation: [] },
			'2026-12-18',
		);
		expect(alone?.season).toBe('none');
		expect(alone?.averageDelayMinutes).toBe(5);
	});

	it('wraps the season across the new year', () => {
		const route = [row('2026-10', 5), row('2025-10', 5), row('2026-02', 9)];

		// October to February: 2025-10 to 2026-02 is 4 minutes worse.
		expect(expectedDelay(history({ route }), '2027-02-10')?.averageDelayMinutes).toBeCloseTo(9);
	});

	it('keeps an early-arriving route’s negative average', () => {
		const route = [row('2026-08', -4), row('2025-08', -2), row('2025-12', -1)];

		expect(expectedDelay(history({ route }), '2026-12-18')?.averageDelayMinutes).toBeCloseTo(-3);
	});

	it('returns null when DOT has no record of the route', () => {
		expect(expectedDelay(history({ route: [] }), '2026-12-18')).toBeNull();
	});

	it('offers the two simpler methods the accuracy report compares against', () => {
		expect(expectedDelay(history(), '2026-12-18', 'newest')?.averageDelayMinutes).toBe(5);
		expect(expectedDelay(history(), '2026-12-18', 'last-year')?.averageDelayMinutes).toBe(10);
		expect(expectedDelay(history(), '2026-08-20', 'last-year')?.averageDelayMinutes).toBe(5);
	});
});
