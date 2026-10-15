/*
 * A route's expected delay for the month of travel.
 *
 * DOT's on-time records arrive about two months late, and people plan trips
 * months ahead, so the month of travel has no record yet. The `data` repo
 * boils each month of records down to rows (one per route, per airport, and
 * for the whole country), and the app passes in the ones a route needs. This
 * works out the estimate from them:
 *
 * 1. Start from the route's newest month: how it runs now.
 * 2. Add the season: how much the route's figures changed between those two
 *    months of the year in the past (August to December, say), in minutes
 *    rather than a percentage, since small delays make percentages swing.
 * 3. Average that change over three past years, skipping 2020.
 * 4. A thin route borrows its airports' seasonal pattern, or the nation's.
 *
 * The chances of a delay and a cancellation move the same way, kept between
 * 0 and 1.
 */

import { monthOf } from './dates';
import { DELAY } from './defaults';
import type { Chance, IsoDate, Minutes, YearMonth } from './units';

/**
 * One month of DOT's on-time records for a route, an airport, or the whole
 * country. The `data` repo publishes rows in this shape.
 */
export interface FlightMonth {
	month: YearMonth;
	flights: number;

	/** Average arrival delay. Early arrivals count as negative, so it can fall below zero. */
	averageDelayMinutes: Minutes;

	/** The share of flights that arrived more than 15 minutes late. */
	lateShare: Chance;
	cancelShare: Chance;

	/** Route rows only: the typical scheduled gate-to-gate time. */
	scheduledMinutes?: Minutes;
}

/** The rows the estimate needs. The app passes the newest month and, for past years, the newest month and the month of travel. */
export interface FlightHistory {
	route: FlightMonth[];
	origin: FlightMonth[];
	destination: FlightMonth[];
	nation: FlightMonth[];
}

/**
 * How to estimate. The plan's method is "seasonal". The other two are the
 * simpler choices the accuracy report's first run tests it against.
 */
export type DelayMethod = 'seasonal' | 'newest' | 'last-year';

export interface DelayEstimate {
	averageDelayMinutes: Minutes;
	delayChance: Chance;
	cancelChance: Chance;

	/** The route's newest month, which the estimate starts from. */
	newestMonth: YearMonth;

	/** Whose seasonal pattern was added: the route's own, its airports', the nation's, or none. */
	season: 'route' | 'airports' | 'nation' | 'none';

	/** The route's scheduled gate-to-gate time in its newest month, when the row has it. */
	scheduledMinutes?: Minutes;
}

type Figures = Pick<FlightMonth, 'averageDelayMinutes' | 'lateShare' | 'cancelShare'>;

/**
 * The route's expected delay for the month of `date`, or null when DOT has no
 * record of the route, so the engine uses typical figures instead.
 */
export function expectedDelay(
	history: FlightHistory,
	date: IsoDate,
	method: DelayMethod = 'seasonal',
): DelayEstimate | null {
	const newest = newestRow(history.route);

	if (!newest) {
		return null;
	}

	// How many months of the year lie between the newest month and the month
	// of travel: 4 from August to December, 8 from June to February.
	const gap = (monthOf(date) - monthOf(`${newest.month}-01`) + 12) % 12;

	let figures: Figures = newest;
	let season: DelayEstimate['season'] = 'none';

	if (method === 'last-year') {
		// The month of travel's most recent record, or the newest month if it's missing.
		figures = findMonth(history.route, addMonths(newest.month, gap === 0 ? 0 : gap - 12)) ?? newest;
	}

	if (method === 'seasonal') {
		const [change, from] = seasonFor(history, newest, gap);

		if (change) {
			figures = {
				averageDelayMinutes: newest.averageDelayMinutes + change.averageDelayMinutes,
				lateShare: newest.lateShare + change.lateShare,
				cancelShare: newest.cancelShare + change.cancelShare,
			};
			season = from;
		}
	}

	return {
		averageDelayMinutes: figures.averageDelayMinutes,
		delayChance: clampChance(figures.lateShare),
		cancelChance: clampChance(figures.cancelShare),
		newestMonth: newest.month,
		season,
		...(newest.scheduledMinutes !== undefined ? { scheduledMinutes: newest.scheduledMinutes } : {}),
	};
}

/** The route's own seasonal pattern, or a busier one to borrow when the route is thin. */
function seasonFor(
	history: FlightHistory,
	newest: FlightMonth,
	gap: number,
): [Figures | null, DelayEstimate['season']] {
	if (newest.flights >= DELAY.thinRouteFlights) {
		const own = seasonalChange(history.route, newest.month, gap);

		if (own) {
			return [own, 'route'];
		}
	}

	const airports = average(
		[history.origin, history.destination]
			.map((rows) => seasonalChange(rows, newest.month, gap))
			.filter((change) => change !== null),
	);

	if (airports) {
		return [airports, 'airports'];
	}

	const nation = seasonalChange(history.nation, newest.month, gap);

	return nation ? [nation, 'nation'] : [null, 'none'];
}

/**
 * The average change from the newest month's month of the year to the month
 * of travel's, over up to three past years, skipping 2020. Null when no past
 * year has both months.
 */
function seasonalChange(rows: FlightMonth[], newest: YearMonth, gap: number): Figures | null {
	const changes: Figures[] = [];

	for (let back = 1; back <= DELAY.lookBackYears && changes.length < DELAY.seasonYears; back++) {
		const fromMonth = addMonths(newest, -12 * back);
		const toMonth = addMonths(fromMonth, gap);

		if (DELAY.skipYears.includes(yearOf(fromMonth)) || DELAY.skipYears.includes(yearOf(toMonth))) {
			continue;
		}

		const from = findMonth(rows, fromMonth);
		const to = findMonth(rows, toMonth);

		if (from && to) {
			changes.push({
				averageDelayMinutes: to.averageDelayMinutes - from.averageDelayMinutes,
				lateShare: to.lateShare - from.lateShare,
				cancelShare: to.cancelShare - from.cancelShare,
			});
		}
	}

	return average(changes);
}

function average(changes: Figures[]): Figures | null {
	if (changes.length === 0) {
		return null;
	}

	const mean = (pick: (change: Figures) => number) =>
		changes.reduce((total, change) => total + pick(change), 0) / changes.length;

	return {
		averageDelayMinutes: mean((change) => change.averageDelayMinutes),
		lateShare: mean((change) => change.lateShare),
		cancelShare: mean((change) => change.cancelShare),
	};
}

function newestRow(rows: FlightMonth[]): FlightMonth | undefined {
	return rows.reduce<FlightMonth | undefined>(
		(newest, row) => (!newest || row.month > newest.month ? row : newest),
		undefined,
	);
}

function findMonth(rows: FlightMonth[], month: YearMonth): FlightMonth | undefined {
	return rows.find((row) => row.month === month);
}

/** The month `count` months after `month`; negative counts go back. */
function addMonths(month: YearMonth, count: number): YearMonth {
	const index = yearOf(month) * 12 + Number(month.slice(5, 7)) - 1 + count;
	const year = Math.floor(index / 12);

	return `${year}-${String((index % 12) + 1).padStart(2, '0')}`;
}

function yearOf(month: YearMonth): number {
	return Number(month.slice(0, 4));
}

function clampChance(chance: number): Chance {
	return Math.min(1, Math.max(0, chance));
}
