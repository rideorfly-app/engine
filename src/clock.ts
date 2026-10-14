/*
 * The travel clock.
 *
 * There's no departure-time question, so both sides leave the door at 8:00
 * a.m. on the start's clock. That one assumed clock decides which meals a trip
 * spans and how much of a drive is in the dark, the same way for both sides.
 *
 * Times here are ClockMinutes: minutes after midnight on the first travel day,
 * so 1:30 p.m. on day two is 1440 + 810.
 */

import { addDays } from './dates';
import { MEAL_TIMES, START_TIME } from './defaults';
import { sunTimes } from './sun';
import type { ClockMinutes, IsoDate, Minutes } from './units';

const DAY: Minutes = 24 * 60;

/** Every meal time on the clock, in order, from the first travel day on. */
function mealTimes(throughDay: number): ClockMinutes[] {
	const times: ClockMinutes[] = [];

	for (let day = 0; day <= throughDay; day++) {
		times.push(
			day * DAY + MEAL_TIMES.breakfast,
			day * DAY + MEAL_TIMES.lunch,
			day * DAY + MEAL_TIMES.dinner,
		);
	}

	return times;
}

/**
 * How many meals fall while the traveler is on the way: strictly after
 * leaving and before arriving. Breakfast on the first day is eaten at home.
 * On a multi-day drive, the evening and morning at a hotel are still part of
 * the trip, so dinner there and breakfast the next day count too.
 */
export function mealsBetween(leave: ClockMinutes, arrive: ClockMinutes): number {
	return mealTimes(Math.ceil(arrive / DAY)).filter((time) => time > leave && time < arrive).length;
}

export interface DrivingDay {
	start: ClockMinutes;
	end: ClockMinutes;
	drivingMinutes: Minutes;
	restStops: number;
	mealStops: number;
	nightMinutes: Minutes;
}

export interface DrivePlan {
	days: DrivingDay[];
	arrival: ClockMinutes;
	restStops: number;
	mealStops: number;
	nightMinutes: Minutes;
}

export interface DrivePlanOptions {
	/** All the driving, split evenly across the days. */
	drivingMinutes: Minutes;

	/** 1 for a single day or straight through; nights + 1 with hotel stops. */
	days: number;

	restIntervalMinutes: Minutes;
	restStopMinutes: Minutes;
	mealStopMinutes: Minutes;

	/** For sunset and sunrise. */
	date: IsoDate;
	midpoint: { lat: number; lon: number };
	utcOffsetMinutes: number;
}

/**
 * Lays the drive out on the clock, one day at a time: drive, stop for a meal
 * when one comes due, and otherwise take a short stop at each rest interval.
 * A meal stop doubles as the rest stop it replaces.
 */
export function planDrive(options: DrivePlanOptions): DrivePlan {
	const perDay = options.drivingMinutes / options.days;
	const darkness = darkIntervals(options, options.days + 2);
	const days: DrivingDay[] = [];

	for (let index = 0; index < options.days; index++) {
		days.push(driveOneDay(index * DAY + START_TIME, perDay, options, darkness));
	}

	const last = days[days.length - 1] as DrivingDay;

	return {
		days,
		arrival: last.end,
		restStops: sum(days.map((day) => day.restStops)),
		mealStops: sum(days.map((day) => day.mealStops)),
		nightMinutes: sum(days.map((day) => day.nightMinutes)),
	};
}

function driveOneDay(
	start: ClockMinutes,
	drivingMinutes: Minutes,
	options: DrivePlanOptions,
	darkness: Array<[ClockMinutes, ClockMinutes]>,
): DrivingDay {
	// Meals that come due on the road: after the day starts, through the next
	// day in case a straight-through drive runs past midnight.
	const meals = mealTimes(Math.floor(start / DAY) + 2).filter((time) => time > start);

	let clock = start;
	let remaining = drivingMinutes;
	let sinceStop = 0;
	let restStops = 0;
	let mealStops = 0;
	let nightMinutes = 0;

	while (remaining > 0) {
		const nextMeal = meals[0] ?? Number.POSITIVE_INFINITY;
		const leg = Math.min(
			remaining,
			options.restIntervalMinutes - sinceStop,
			Math.max(0, nextMeal - clock),
		);

		nightMinutes += overlap(clock, clock + leg, darkness);
		clock += leg;
		remaining -= leg;
		sinceStop += leg;

		if (remaining <= 0) {
			break;
		}

		const mealDue = nextMeal <= clock;
		const restDue = sinceStop >= options.restIntervalMinutes;

		// A rest stop that a meal time would fall inside becomes the meal stop.
		if (mealDue || (restDue && nextMeal <= clock + options.restStopMinutes)) {
			clock += options.mealStopMinutes;
			mealStops++;
			meals.shift();
		} else if (restDue) {
			clock += options.restStopMinutes;
			restStops++;
		}

		sinceStop = 0;

		// Skip any meal time that passed during the stop.
		while ((meals[0] ?? Number.POSITIVE_INFINITY) <= clock) {
			meals.shift();
		}
	}

	return { start, end: clock, drivingMinutes, restStops, mealStops, nightMinutes };
}

/** The stretches between sunset and the next sunrise, on the clock, for each travel day. */
function darkIntervals(
	options: DrivePlanOptions,
	throughDay: number,
): Array<[ClockMinutes, ClockMinutes]> {
	const { lat, lon } = options.midpoint;

	const sun = (day: number) => {
		const times = sunTimes(addDays(options.date, day), lat, lon);

		return {
			sunrise: day * DAY + times.sunrise + options.utcOffsetMinutes,
			sunset: day * DAY + times.sunset + options.utcOffsetMinutes,
		};
	};

	const intervals: Array<[ClockMinutes, ClockMinutes]> = [];

	for (let day = -1; day <= throughDay; day++) {
		intervals.push([sun(day).sunset, sun(day + 1).sunrise]);
	}

	return intervals;
}

/** How many minutes of [from, to] fall inside the intervals. */
function overlap(
	from: ClockMinutes,
	to: ClockMinutes,
	intervals: Array<[ClockMinutes, ClockMinutes]>,
): Minutes {
	let total = 0;

	for (const [start, end] of intervals) {
		total += Math.max(0, Math.min(to, end) - Math.max(from, start));
	}

	return total;
}

function sum(values: number[]): number {
	return values.reduce((total, value) => total + value, 0);
}
