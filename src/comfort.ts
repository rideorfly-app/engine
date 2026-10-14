/*
 * Comfort: a score from 0 to 10 for each side.
 *
 * Both sides start at 7, and a short list of named adjustments moves them.
 * Each adjustment is its own line, so the page can show the breakdown and Our
 * take can read it. The code counts only friction it can measure; the
 * intangibles are for Our take to weigh.
 */

import { monthOf } from './dates';
import { COMFORT, DRIVE } from './defaults';
import { formatDuration } from './format';
import type { Answers, ComfortLine, Lookups, SideName } from './types';
import type { Chance, Miles, Minutes, StateCode } from './units';

export interface RideComfortInput {
	/** Driving on the longest day, after any edit to the driving line. */
	longestDayMinutes: Minutes;
	nights: number;
	straightThrough: boolean;
	nightMinutes: Minutes;
}

export interface FlyComfortInput {
	/** Door to door. */
	minutes: Minutes;
	connections: number;
	delayChance: Chance;
	cancelChance: Chance;
}

/** The Ride side's comfort adjustments. */
export function rideComfort(
	answers: Answers,
	lookups: Lookups,
	input: RideComfortInput,
): ComfortLine[] {
	const rules = COMFORT.ride;
	const lines: ComfortLine[] = [];
	const add = (id: string, label: string, points: number) =>
		lines.push(comfortLine('ride', id, label, points));

	if (answers.preference !== 0) {
		add('preference', 'Your travel preference', (COMFORT.preference * answers.preference) / 100);
	}

	const longDayHours = input.longestDayMinutes / 60 - rules.longDayAfterHours;

	if (longDayHours > 0) {
		add(
			'longDay',
			`Long day: ${formatDuration(input.longestDayMinutes)} of driving`,
			rules.longDayPerHour * longDayHours,
		);
	}

	if (input.nights > 0) {
		add(
			'hotelNights',
			`${input.nights} ${input.nights === 1 ? 'night' : 'nights'} on the road`,
			rules.perHotelNight * input.nights,
		);
	}

	if (input.straightThrough) {
		const shared = answers.adults >= 2;

		add(
			'straightThrough',
			shared ? 'Straight through, sharing the wheel' : 'Straight through, alone at the wheel',
			shared ? rules.straightThroughShared : rules.straightThroughAlone,
		);
	}

	if (input.nightMinutes > 0) {
		add(
			'night',
			`Night driving: about ${formatDuration(input.nightMinutes)} after sunset`,
			(rules.nightPerHour * input.nightMinutes) / 60,
		);
	}

	const ratio = roadRiskRatio(lookups);

	add(
		'roadRisk',
		`Road risk: the route's fatality rate is ${ratio.toFixed(2)} × the national rate (NHTSA)`,
		rules.roadRiskPer100Miles * (lookups.drive.miles / 100) * ratio,
	);

	if (lookups.drive.winterPasses.length > 0 && DRIVE.winterMonths.includes(monthOf(answers.date))) {
		add('winterPass', `Winter pass: ${lookups.drive.winterPasses.join(', ')}`, rules.winterPass);
	}

	if (answers.children > 0 && input.longestDayMinutes > rules.childrenAfterHours * 60) {
		add(
			'children',
			`Children, on a driving day over ${rules.childrenAfterHours} hours`,
			rules.children,
		);
	}

	if (answers.pets > 0) {
		add('pets', 'No pet-in-cabin rules', rules.pets);
	}

	return lines;
}

/** The Fly side's comfort adjustments. */
export function flyComfort(answers: Answers, input: FlyComfortInput): ComfortLine[] {
	const rules = COMFORT.fly;
	const lines: ComfortLine[] = [];
	const add = (id: string, label: string, points: number) =>
		lines.push(comfortLine('fly', id, label, points));

	if (answers.preference !== 0) {
		add('preference', 'Your travel preference', (-COMFORT.preference * answers.preference) / 100);
	}

	const longDayHours = input.minutes / 60 - rules.longDayAfterHours;

	if (longDayHours > 0) {
		add(
			'longDay',
			`Long day: ${formatDuration(input.minutes)} door to door`,
			rules.longDayPerHour * longDayHours,
		);
	}

	if (input.connections > 0) {
		add(
			'connections',
			input.connections === 1 ? 'A connection' : `${input.connections} connections`,
			rules.perConnection * input.connections,
		);
	}

	add(
		'reliability',
		`Reliability: ${percent(input.delayChance)} chance of a delay over 15 minutes, ${percent(input.cancelChance)} chance of a cancellation`,
		rules.delayChance * input.delayChance + rules.cancelChance * input.cancelChance,
	);

	if (answers.children > 0) {
		add('children', 'Children through the airport', rules.children);
	}

	if (answers.pets > 0) {
		add('pets', answers.pets === 1 ? 'A pet in the cabin' : 'Pets in the cabin', rules.pets);
	}

	if (answers.checkedBags > 0) {
		add('checkedBags', 'Checking bags', rules.checkedBags);
	}

	return lines;
}

/** The starting point plus every adjustment, kept between 0 and 10. */
export function comfortScore(lines: ComfortLine[]): number {
	const total = lines.reduce<number>((sum, line) => sum + line.points, COMFORT.start);

	return Math.min(10, Math.max(0, total));
}

/**
 * The route's road fatality rate against the national rate, weighted by its
 * miles in each state. A state with no rate counts at the national rate.
 */
export function roadRiskRatio(lookups: Lookups): number {
	const { byState, national } = lookups.roadSafety;
	const entries = Object.entries(lookups.drive.milesByState) as Array<[StateCode, Miles]>;
	const miles = entries.reduce((total, [, stateMiles]) => total + stateMiles, 0);

	if (miles === 0 || national <= 0) {
		return 1;
	}

	const weightedRate =
		entries.reduce(
			(total, [state, stateMiles]) => total + (byState[state] ?? national) * stateMiles,
			0,
		) / miles;

	return weightedRate / national;
}

function comfortLine(side: SideName, id: string, label: string, points: number): ComfortLine {
	return { id: `${side}.comfort.${id}`, side, label, points };
}

/** 0.015 becomes "1.5%"; 0.2 becomes "20%". */
function percent(chance: Chance): string {
	return `${Number((chance * 100).toFixed(1))}%`;
}
