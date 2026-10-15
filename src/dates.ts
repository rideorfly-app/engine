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

/** The number of days in the date's year. */
export function daysInYear(date: IsoDate): number {
	const year = Number(date.slice(0, 4));
	const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

	return leap ? 366 : 365;
}
