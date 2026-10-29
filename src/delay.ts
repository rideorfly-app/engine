/*
 * A route's expected delay for the month of travel.
 *
 * DOT's on-time records arrive about two months late, and people plan trips
 * months ahead, so the month of travel has no record yet. The `data` repo
 * boils each month of records down to rows (one per route and one per
 * airport), and the app passes in the ones a route needs. This works out the
 * estimate from them:
 *
 * 1. Take the route's figures for the same month of the year in past years
 *    (the next December from past Decembers) and average them, over up to
 *    five years and skipping 2020. One storm, strike, or shutdown can't skew
 *    an average of several years the way it skews a single month.
 * 2. A small route's own months are too few flights to trust, so its two
 *    airports' figures for the same month count too, in proportion to how
 *    thin the route is.
 * 3. A route with no past year for this month starts from its newest month.
 *
 * The chances of a delay and of a disruption (a cancellation or diversion)
 * follow the same steps, kept between 0 and 1.
 *
 * The accuracy report tested this against simpler choices on 2023 to 2025;
 * see the changelog.
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

	/** The share of flights that arrived 15 minutes or more late, as DOT counts it. */
	delayShare: Chance;

	/** The share of flights cancelled or diverted. */
	disruptShare: Chance;

	/** Route rows only: the typical scheduled gate-to-gate time. */
	scheduledMinutes?: Minutes;
}

/**
 * The rows the estimate needs. For the route and for each of its two
 * airports, the app passes the month of travel's month of the year in each of
 * the past six years (any it has), and for the route also its newest month.
 */
export interface FlightHistory {
	route: FlightMonth[];
	origin: FlightMonth[];
	destination: FlightMonth[];
}

/**
 * How to estimate. The plan's method is "average". The other two are the
 * simpler choices the accuracy report tests it against.
 */
export type DelayMethod = 'average' | 'newest' | 'last-year';

export interface DelayEstimate {
	averageDelayMinutes: Minutes;
	delayChance: Chance;
	disruptChance: Chance;

	/** The route's newest month, which a route with no past year for this month starts from. */
	newestMonth: YearMonth;

	/** What the figures rest on: the route's own past years, those blended with its airports', or only its newest month. */
	basis: 'route' | 'route-and-airports' | 'newest-month';

	/** The route's scheduled gate-to-gate time in its newest month, when the row has it. */
	scheduledMinutes?: Minutes;
}

type Figures = Pick<FlightMonth, 'averageDelayMinutes' | 'delayShare' | 'disruptShare'>;

/**
 * The route's expected delay for the month of `date`, or null when DOT has no
 * record of the route, so the engine uses typical figures instead.
 */
export function expectedDelay(
	history: FlightHistory,
	date: IsoDate,
	method: DelayMethod = 'average',
): DelayEstimate | null {
	const newest = newestRow(history.route);

	if (!newest) {
		return null;
	}

	let figures: Figures = newest;
	let basis: DelayEstimate['basis'] = 'newest-month';

	if (method === 'last-year') {
		// How many months of the year lie between the newest month and the month
		// of travel: 4 from August to December, 8 from June to February.
		const gap = (monthOf(date) - monthOf(`${newest.month}-01`) + 12) % 12;

		// The month of travel's most recent record, or the newest month if it's missing.
		const lastYear = findMonth(history.route, addMonths(newest.month, gap === 0 ? 0 : gap - 12));

		if (lastYear) {
			figures = lastYear;
			basis = 'route';
		}
	}

	if (method === 'average') {
		const [average, from] = pastYears(history, date);

		if (average) {
			figures = average;
			basis = from;
		}
	}

	return {
		averageDelayMinutes: figures.averageDelayMinutes,
		delayChance: clampChance(figures.delayShare),
		disruptChance: clampChance(figures.disruptShare),
		newestMonth: newest.month,
		basis,
		...(newest.scheduledMinutes !== undefined ? { scheduledMinutes: newest.scheduledMinutes } : {}),
	};
}

/**
 * The route's average for the month of travel's month of the year, blended
 * with its airports' when the route is small. Null when no past year has a
 * record of the route in that month.
 */
function pastYears(
	history: FlightHistory,
	date: IsoDate,
): [Figures | null, DelayEstimate['basis']] {
	const own = sameMonthRows(history.route, date);
	const ownAverage = average(own);

	if (!ownAverage) {
		return [null, 'newest-month'];
	}

	const airports = average(
		[history.origin, history.destination]
			.map((rows) => average(sameMonthRows(rows, date)))
			.filter((figures) => figures !== null),
	);

	if (!airports) {
		return [ownAverage, 'route'];
	}

	// A route with `borrowFlights` flights a month counts half; a busier one counts for more.
	const flights = own.reduce((total, row) => total + row.flights, 0) / own.length;
	const weight = flights / (flights + DELAY.borrowFlights);

	return [
		{
			averageDelayMinutes: blend(
				ownAverage.averageDelayMinutes,
				airports.averageDelayMinutes,
				weight,
			),
			delayShare: blend(ownAverage.delayShare, airports.delayShare, weight),
			disruptShare: blend(ownAverage.disruptShare, airports.disruptShare, weight),
		},
		'route-and-airports',
	];
}

/**
 * The rows for the month of travel's month of the year in past years: the
 * most recent years that have one, up to `yearsAveraged`, skipping 2020.
 */
function sameMonthRows(rows: FlightMonth[], date: IsoDate): FlightMonth[] {
	const found: FlightMonth[] = [];
	const year = Number(date.slice(0, 4));

	for (let back = 1; back <= DELAY.lookBackYears && found.length < DELAY.yearsAveraged; back++) {
		if (DELAY.skipYears.includes(year - back)) {
			continue;
		}

		const row = findMonth(rows, `${year - back}-${date.slice(5, 7)}`);

		if (row) {
			found.push(row);
		}
	}

	return found;
}

function average(rows: Figures[]): Figures | null {
	if (rows.length === 0) {
		return null;
	}

	const mean = (pick: (row: Figures) => number) =>
		rows.reduce((total, row) => total + pick(row), 0) / rows.length;

	return {
		averageDelayMinutes: mean((row) => row.averageDelayMinutes),
		delayShare: mean((row) => row.delayShare),
		disruptShare: mean((row) => row.disruptShare),
	};
}

/** `weight` of `own` and the rest of `borrowed`. */
function blend(own: number, borrowed: number, weight: number): number {
	return weight * own + (1 - weight) * borrowed;
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
	const index = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + count;
	const year = Math.floor(index / 12);

	return `${year}-${String((index % 12) + 1).padStart(2, '0')}`;
}

function clampChance(chance: Chance): Chance {
	return Math.min(1, Math.max(0, chance));
}
