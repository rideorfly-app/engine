/*
 * Checks a user's answers and assumptions against sensible ranges.
 *
 * The server runs this before scoring a matchup for Our take, because the
 * browser can send anything. The page uses the same ranges for its steppers.
 */

import { isSupportedState } from './states';
import type { Answers, Assumptions } from './types';

/** Something wrong with an answer, for the page to show beside the field. */
export interface Problem {
	field: string;
	message: string;
}

export interface Range {
	min: number;
	max: number;

	/** The stepper's increment. */
	step: number;
}

export const ANSWER_RANGES = {
	adults: { min: 1, max: 9, step: 1 },
	children: { min: 0, max: 9, step: 1 },
	mpg: { min: 8, max: 80, step: 1 },
	daysParked: { min: 1, max: 60, step: 1 },
	pets: { min: 0, max: 3, step: 1 },
	preference: { min: -100, max: 100, step: 1 },
} as const satisfies Record<string, Range>;

export const ASSUMPTION_RANGES = {
	maxDrivingHours: { min: 4, max: 16, step: 0.5 },
	gasPrice: { min: 1, max: 15, step: 0.05 },
	mpg: ANSWER_RANGES.mpg,
	arrivalBufferMinutes: { min: 30, max: 240, step: 5 },
} as const satisfies Record<string, Range>;

/** Checked bags, per traveler. */
const MAX_BAGS_PER_TRAVELER = 2;

/** Weights must add up to 1, give or take rounding in the page's sliders. */
const WEIGHT_TOLERANCE = 0.001;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Returns every problem with the answers. An empty list means they're fine. */
export function validateAnswers(answers: Answers): Problem[] {
	const problems: Problem[] = [];

	for (const field of ['from', 'to'] as const) {
		const place = answers[field];

		if (!isSupportedState(place.state)) {
			problems.push({ field, message: 'Only the lower 48 states and DC are supported for now.' });
		}

		if (!Number.isFinite(place.lat) || !Number.isFinite(place.lon)) {
			problems.push({ field, message: 'The place has no coordinates.' });
		}
	}

	if (answers.from.id === answers.to.id) {
		problems.push({ field: 'to', message: 'The start and destination are the same place.' });
	}

	if (!isValidDate(answers.date)) {
		problems.push({ field: 'date', message: 'The date must be a real day, written YYYY-MM-DD.' });
	}

	check(problems, 'adults', answers.adults, ANSWER_RANGES.adults);
	check(problems, 'children', answers.children, ANSWER_RANGES.children);
	check(problems, 'pets', answers.pets, ANSWER_RANGES.pets);
	check(problems, 'preference', answers.preference, ANSWER_RANGES.preference);

	const maxBags = (answers.adults + answers.children) * MAX_BAGS_PER_TRAVELER;
	check(problems, 'checkedBags', answers.checkedBags, { min: 0, max: maxBags, step: 1 });

	if (answers.car.kind === 'own') {
		check(problems, 'mpg', answers.car.mpg, ANSWER_RANGES.mpg);
	}

	if (answers.toAirport.mode === 'park') {
		check(problems, 'daysParked', answers.toAirport.daysParked, ANSWER_RANGES.daysParked);
	}

	return problems;
}

/** Returns every problem with the user's changed assumptions. */
export function validateAssumptions(assumptions: Partial<Assumptions>): Problem[] {
	const problems: Problem[] = [];

	if (assumptions.maxDrivingHours !== undefined) {
		check(
			problems,
			'maxDrivingHours',
			assumptions.maxDrivingHours,
			ASSUMPTION_RANGES.maxDrivingHours,
		);
	}

	if (assumptions.gasPrice !== undefined) {
		check(problems, 'gasPrice', assumptions.gasPrice, ASSUMPTION_RANGES.gasPrice);
	}

	if (assumptions.mpg !== undefined) {
		check(problems, 'mpg', assumptions.mpg, ASSUMPTION_RANGES.mpg);
	}

	if (assumptions.arrivalBufferMinutes !== undefined) {
		check(
			problems,
			'arrivalBufferMinutes',
			assumptions.arrivalBufferMinutes,
			ASSUMPTION_RANGES.arrivalBufferMinutes,
		);
	}

	if (assumptions.weights !== undefined) {
		const { cost, time, comfort } = assumptions.weights;
		const parts = [cost, time, comfort];

		if (parts.some((part) => !(part >= 0 && part <= 1))) {
			problems.push({ field: 'weights', message: 'Each weight must be between 0% and 100%.' });
		} else if (Math.abs(cost + time + comfort - 1) > WEIGHT_TOLERANCE) {
			problems.push({ field: 'weights', message: 'The weights must add up to 100%.' });
		}
	}

	return problems;
}

/** Adds a problem when a number is outside its range. */
function check(problems: Problem[], field: string, value: number, range: Range): void {
	if (!Number.isFinite(value) || value < range.min || value > range.max) {
		problems.push({ field, message: `Must be between ${range.min} and ${range.max}.` });
	}
}

/** Whether a `YYYY-MM-DD` string is a real calendar day. */
function isValidDate(date: string): boolean {
	if (!ISO_DATE.test(date)) {
		return false;
	}

	const parsed = new Date(`${date}T00:00:00Z`);

	return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date);
}
