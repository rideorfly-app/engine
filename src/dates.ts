/*
 * Calendar math on `YYYY-MM-DD` strings, done in UTC so the result never
 * depends on the time zone of the machine running it.
 */

import type { IsoDate } from './units';

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtcMs(date: IsoDate): number {
	const [year, month, day] = date.split('-').map(Number) as [number, number, number];

	return Date.UTC(year, month - 1, day);
}

/** The date `days` after `date`. */
export function addDays(date: IsoDate, days: number): IsoDate {
	return new Date(toUtcMs(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** 1 for January 1. */
export function dayOfYear(date: IsoDate): number {
	const yearStart = Date.UTC(Number(date.slice(0, 4)), 0, 1);

	return Math.round((toUtcMs(date) - yearStart) / DAY_MS) + 1;
}

/** 1 for January. */
export function monthOf(date: IsoDate): number {
	return Number(date.slice(5, 7));
}

/** The day of the month of the nth Sunday (1 for the first) in a month, 1 for January. */
function nthSunday(year: number, month: number, n: number): number {
	const firstSunday = 1 + ((7 - new Date(Date.UTC(year, month - 1, 1)).getUTCDay()) % 7);

	return firstSunday + 7 * (n - 1);
}

/**
 * Whether the United States is on daylight saving time on this date: from the
 * second Sunday in March up to the first Sunday in November. It's one rule for
 * the whole country by date alone (Arizona and Hawaii, which skip it, are left
 * out on purpose).
 */
export function isDaylightSavingTime(date: IsoDate): boolean {
	const year = Number(date.slice(0, 4));
	const month = monthOf(date);
	const day = Number(date.slice(8, 10));

	if (month > 3 && month < 11) {
		return true;
	}

	return (
		(month === 3 && day >= nthSunday(year, 3, 2)) || (month === 11 && day < nthSunday(year, 11, 1))
	);
}

/** The number of days in the date's year. */
export function daysInYear(date: IsoDate): number {
	const year = Number(date.slice(0, 4));
	const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

	return leap ? 366 : 365;
}
