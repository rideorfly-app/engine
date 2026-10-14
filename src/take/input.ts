/*
 * What Our take is sent. This is the exact object the server passes to the
 * model with the prompt, and what "See what we sent" shows.
 */

import { formatDuration, formatMoney } from '../format';
import { preferenceLabel } from '../preference';
import type { Answers, Line, Lookups, Result, Side } from '../types';
import { ENGINE_VERSION } from '../version';
import { figuresFor } from './figures';
import { TAKE_PROMPT_VERSION } from './prompt';
import type { TakeHistoryEntry } from './types';

export interface TakeInputOptions {
	/** Earlier takes on this matchup, for a re-evaluation: the first and the most recent four. */
	history?: TakeHistoryEntry[];

	/** Meaningful changes since the last take, in plain words. */
	changes?: string[];
}

export function buildTakeInput(
	answers: Answers,
	lookups: Lookups,
	result: Result,
	options: TakeInputOptions = {},
) {
	return {
		prompt_version: TAKE_PROMPT_VERSION,
		engine_version: ENGINE_VERSION,

		matchup: {
			from: `${answers.from.name}, ${answers.from.state}`,
			to: `${answers.to.name}, ${answers.to.state}`,
			date: answers.date,
			adults: answers.adults,
			children: answers.children,
			car: answers.car.kind === 'own' ? `own car, about ${answers.car.mpg} mpg` : 'a rental',
			getting_to_the_airport: toAirportText(answers),
			getting_from_the_airport: fromAirportText(answers),
			checked_bags: answers.checkedBags,
			pets: answers.pets,
			travel_preference: preferenceLabel(answers.preference),
			daily_driving_limit_hours: result.ride.maxDrivingHours,
		},

		numbers: {
			verdict: result.verdict,
			confidence: result.confidence,
			winners: result.winners,
			weights: result.weights,
			leans: result.leans,
			ride: {
				...sideNumbers(result.ride),
				days: result.ride.days,
				hotel_nights: result.ride.nights,
				straight_through: result.ride.straightThrough,
			},
			fly: result.fly
				? {
						...sideNumbers(result.fly),
						airports: `${result.fly.origin} to ${result.fly.destination}`,
						connections: result.fly.connections,
					}
				: null,
		},

		notes: result.notes.map((note) => note.text),

		figures: figuresFor(answers, lookups, result).map(({ name, meaning }) => ({ name, meaning })),

		history: options.history ?? [],
		changes_since_last_take: options.changes ?? [],
	};
}

export type TakeInput = ReturnType<typeof buildTakeInput>;

function sideNumbers(side: Side) {
	return {
		lines: side.lines.filter((line) => !line.empty).map(lineNumbers),
		total_cost: formatMoney(side.cost),
		door_to_door: formatDuration(side.minutes),
		comfort: Number(side.comfort.toFixed(2)),
		comfort_breakdown: side.comfortLines.map((adjustment) => ({
			label: adjustment.label,
			points: Number(adjustment.points.toFixed(2)),
		})),
	};
}

function lineNumbers(line: Line) {
	return {
		label: line.label,
		amount: line.kind === 'cost' ? formatMoney(line.value) : formatDuration(line.value),
		source: line.source,
		counted: line.on,
	};
}

function toAirportText(answers: Answers): string {
	switch (answers.toAirport.mode) {
		case 'park':
			return `drive and park, ${answers.toAirport.daysParked} days`;
		case 'dropoff':
			return 'dropped off';
		case 'rideshare':
			return 'rideshare';
		case 'transit':
			return 'transit';
	}
}

function fromAirportText(answers: Answers): string {
	switch (answers.fromAirport) {
		case 'rental':
			return 'rental car';
		case 'rideshare':
			return 'rideshare or taxi';
		case 'pickup':
			return 'picked up';
		case 'transit':
			return 'transit';
	}
}
