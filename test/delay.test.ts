import { describe, expect, it } from 'vitest';
import { expectedDelay, type FlightHistory, type FlightMonth } from '../src/delay';

/** A month's row with made-up figures. */
const row = (
	month: string,
	averageDelayMinutes: number,
	delayShare = 0.2,
	disruptShare = 0.01,
	flights = 300,
): FlightMonth => ({ month, flights, averageDelayMinutes, delayShare, disruptShare });

/**
 * A route whose newest month is August 2026, with a December row for each of
 * the past five years: 10, 11, 12, 9, and 8 minutes, so 10 on average. 2020 is
 * wildly off, so it shows up if it isn't skipped. August rows from past years
 * are wildly off too, so they show up if they leak into a December estimate.
 * Each airport has a December or two of its own.
 */
function history(overrides: Partial<FlightHistory> = {}): FlightHistory {
	return {
		route: [
			{ ...row('2026-08', 5, 0.2, 0.01), scheduledMinutes: 65 },
			row('2025-08', 50),
			row('2025-12', 10, 0.3, 0.02),
			row('2024-12', 11),
			row('2023-12', 12),
			row('2022-12', 9),
			row('2021-12', 8),
			row('2020-12', 90),
		],
		origin: [row('2025-12', 4), row('2024-12', 6), row('2025-08', 50)],
		destination: [row('2025-12', 8)],
		...overrides,
	};
}

/** The same route, without airports, so only its own years count. */
const alone = (overrides: Partial<FlightHistory> = {}) =>
	history({ origin: [], destination: [], ...overrides });

describe('expectedDelay', () => {
	it('averages the month of travel over the past five years', () => {
		const estimate = expectedDelay(alone(), '2026-12-18');

		// December of 2025 to 2021: 10, 11, 12, 9, and 8.
		expect(estimate?.averageDelayMinutes).toBeCloseTo(10);
		expect(estimate?.basis).toBe('route');
		expect(estimate?.newestMonth).toBe('2026-08');
		expect(estimate?.scheduledMinutes).toBe(65);
	});

	it('averages the chances the same way', () => {
		const estimate = expectedDelay(alone(), '2026-12-18');

		// 2025 had 0.3 and 0.02; the other four years had 0.2 and 0.01.
		expect(estimate?.delayChance).toBeCloseTo(0.22);
		expect(estimate?.disruptChance).toBeCloseTo(0.012);
	});

	it('uses only the five most recent years', () => {
		const route = [
			row('2027-08', 5),
			...[2026, 2025, 2024, 2023, 2022].map((year) => row(`${year}-12`, 10)),
			row('2021-12', 100),
		];

		expect(expectedDelay(alone({ route }), '2027-12-18')?.averageDelayMinutes).toBeCloseTo(10);
	});

	it('skips 2020 and looks one year further back instead', () => {
		const route = [
			row('2024-08', 5),
			row('2023-12', 10),
			row('2022-12', 10),
			row('2021-12', 10),
			row('2020-12', 90),
			row('2019-12', 10),
			row('2018-12', 10),
		];

		expect(expectedDelay(alone({ route }), '2024-12-18')?.averageDelayMinutes).toBeCloseTo(10);
	});

	it('uses the years it has when some are missing', () => {
		const route = history().route.filter(
			(month) => !['2024', '2023'].includes(month.month.slice(0, 4)),
		);

		// Only 2025, 2022, and 2021 are left: 10, 9, and 8.
		expect(expectedDelay(alone({ route }), '2026-12-18')?.averageDelayMinutes).toBeCloseTo(9);
	});

	it('counts a route with 100 flights a month half, and its airports half', () => {
		const route = history().route.map((month) => ({ ...month, flights: 100 }));
		const estimate = expectedDelay(history({ route }), '2026-12-18');

		// The route averages 10. The origin averages 5 (4 and 6) and the destination
		// 8, so the airports average 6.5. Half of each: 8.25.
		expect(estimate?.averageDelayMinutes).toBeCloseTo(8.25);
		expect(estimate?.basis).toBe('route-and-airports');
	});

	it('counts a busier route mostly for itself, and a thinner one mostly for its airports', () => {
		// 300 flights: three quarters its own. 25 flights: a fifth its own.
		expect(expectedDelay(history(), '2026-12-18')?.averageDelayMinutes).toBeCloseTo(9.125);

		const thin = history().route.map((month) => ({ ...month, flights: 25 }));

		expect(expectedDelay(history({ route: thin }), '2026-12-18')?.averageDelayMinutes).toBeCloseTo(
			0.2 * 10 + 0.8 * 6.5,
		);
	});

	it('borrows from whichever airport has a record', () => {
		const route = history().route.map((month) => ({ ...month, flights: 100 }));
		const estimate = expectedDelay(history({ route, origin: [] }), '2026-12-18');

		// Half of the route's 10 and half of the destination's 8.
		expect(estimate?.averageDelayMinutes).toBeCloseTo(9);
	});

	it('blends the chances as well', () => {
		const route = history().route.map((month) => ({ ...month, flights: 100 }));
		const origin = [row('2025-12', 4, 0.1, 0.05)];
		const estimate = expectedDelay(history({ route, origin, destination: [] }), '2026-12-18');

		// Half of the route's 0.22 and half of the origin's 0.1.
		expect(estimate?.delayChance).toBeCloseTo(0.16);
		expect(estimate?.disruptChance).toBeCloseTo(0.5 * 0.012 + 0.5 * 0.05);
	});

	it('starts from the newest month when no past year has the month of travel', () => {
		const estimate = expectedDelay(alone({ route: [row('2026-08', 5)] }), '2026-12-18');

		expect(estimate?.averageDelayMinutes).toBe(5);
		expect(estimate?.basis).toBe('newest-month');
	});

	it('keeps an early-arriving route’s negative average', () => {
		const route = [row('2026-08', -4), row('2025-12', -2), row('2024-12', -4)];

		expect(expectedDelay(alone({ route }), '2026-12-18')?.averageDelayMinutes).toBeCloseTo(-3);
	});

	it('keeps the chances between 0 and 1', () => {
		const route = [row('2026-08', 5), row('2025-12', 5, 1.4, -0.2)];
		const estimate = expectedDelay(alone({ route }), '2026-12-18');

		expect(estimate?.delayChance).toBe(1);
		expect(estimate?.disruptChance).toBe(0);
	});

	it('returns null when DOT has no record of the route', () => {
		expect(expectedDelay(history({ route: [] }), '2026-12-18')).toBeNull();
	});

	it('offers the two simpler methods the accuracy report compares against', () => {
		expect(expectedDelay(history(), '2026-12-18', 'newest')?.averageDelayMinutes).toBe(5);
		expect(expectedDelay(history(), '2026-12-18', 'newest')?.basis).toBe('newest-month');

		// December of last year, alone.
		expect(expectedDelay(history(), '2026-12-18', 'last-year')?.averageDelayMinutes).toBe(10);
		expect(expectedDelay(history(), '2026-12-18', 'last-year')?.basis).toBe('route');

		// The month of travel is the newest month, so it is its own record.
		expect(expectedDelay(history(), '2026-08-20', 'last-year')?.averageDelayMinutes).toBe(5);

		// Last year's month is missing, so it starts from the newest.
		const route = [row('2026-08', 5)];

		expect(expectedDelay(alone({ route }), '2026-12-18', 'last-year')?.basis).toBe('newest-month');
	});
});
