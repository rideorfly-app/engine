/*
 * score(): answers and lookups in, the numbers out.
 *
 * It builds both sides twice: once as Ours (no edits) and once as Yours (with
 * the user's edits). Yours is what's scored; Ours rides along on each line, so
 * the page can strike it through beside an edited value and Reset to Ours.
 */

import { comfortScore, flyComfort, rideComfort } from './comfort';
import { DRIVE, START_TIME, VERDICT } from './defaults';
import { buildFly, type FlyDraft } from './fly';
import { type DraftLine, totalOf } from './lines';
import { notesFor } from './notes';
import { buildRide, type RideDraft } from './ride';
import type { Settings } from './settings';
import { TAKE_PROMPT_VERSION } from './take/prompt';
import type {
	Answers,
	Assumptions,
	Edits,
	FlySide,
	Line,
	Lookups,
	Question,
	Result,
	RideSide,
	SideName,
	Weights,
} from './types';
import { computeLeans, confidenceOf, decide, winnerOf } from './verdict';
import { ENGINE_VERSION } from './version';

/** Scores a matchup: every line, the comfort breakdown, and the verdict. */
export function score(answers: Answers, lookups: Lookups, edits: Edits = {}): Result {
	const assumptions = edits.assumptions ?? {};
	const hotelEdit = edits.lines?.['ride.hotel']?.on;

	// Until the page has asked "hotel or straight through?", a hotel is assumed.
	const answeredHotel = answers.longDrive === undefined || answers.longDrive === 'hotel';

	const ours: Settings = { maxDrivingHours: DRIVE.maxDrivingHours, hotel: answeredHotel };
	const yours: Settings = {
		...ours,
		...settingsFrom(assumptions),
		hotel: hotelEdit ?? answeredHotel,
	};
	const weights: Weights = assumptions.weights ?? VERDICT.weights;

	// --- Ride ---

	const oursRide = buildRide(answers, lookups, ours);
	const yoursRide = buildRide(answers, lookups, yours);
	const rideLines = applyEdits('ride', yoursRide.lines, oursRide.lines, edits);
	const ride = rideSide(answers, lookups, yoursRide, rideLines);

	// --- Fly, unless the trip is too close to fly ---

	let fly: FlySide | null = null;

	if (lookups.flight) {
		const oursFly = buildFly(answers, lookups, lookups.flight, ours);
		const yoursFly = buildFly(answers, lookups, lookups.flight, yours);
		const flyLines = applyEdits('fly', yoursFly.lines, oursFly.lines, edits);

		fly = flySide(answers, lookups, yoursFly, flyLines);
	}

	// --- The verdict ---

	const leans = fly
		? computeLeans(ride, fly, weights)
		: { cost: 1, time: 1, comfort: 1, overall: 1 };

	const result: Result = {
		engineVersion: ENGINE_VERSION,
		promptVersion: TAKE_PROMPT_VERSION,
		dataVersion: lookups.dataVersion,
		ride,
		fly,
		weights,
		leans,
		verdict: fly ? decide(leans, ride, fly) : 'ride',
		confidence: confidenceOf(leans.overall),
		winners: {
			cost: winnerOf(leans.cost),
			time: winnerOf(leans.time),
			comfort: winnerOf(leans.comfort),
		},
		questions: questionsFor(answers, yoursRide, yours, hotelEdit),
		notes: [],
	};

	result.notes = notesFor(answers, lookups, result);

	return result;
}

/** The assumptions the user changed, as side-building settings. */
function settingsFrom(assumptions: Partial<Assumptions>): Partial<Settings> {
	const settings: Partial<Settings> = {};

	if (assumptions.maxDrivingHours !== undefined) {
		settings.maxDrivingHours = assumptions.maxDrivingHours;
	}

	if (assumptions.gasPrice !== undefined) {
		settings.gasPrice = assumptions.gasPrice;
	}

	if (assumptions.mpg !== undefined) {
		settings.mpg = assumptions.mpg;
	}

	if (assumptions.arrivalBufferMinutes !== undefined) {
		settings.arrivalBufferMinutes = assumptions.arrivalBufferMinutes;
	}

	return settings;
}

/**
 * Applies the user's edits to Yours, and records Ours on every line.
 *
 * A line is tagged "yours" when its value differs from Ours, whether the user
 * typed it or changed an assumption behind it. Typing Ours's own value back
 * in undoes the edit, as if it had never been made.
 */
function applyEdits(side: SideName, yours: DraftLine[], ours: DraftLine[], edits: Edits): Line[] {
	const lines: Line[] = yours.map((draft) => {
		const original = ours.find((line) => line.id === draft.id);
		const line: Line = {
			...draft,
			ours: original ? { value: original.value, on: original.on } : { value: 0, on: false },
		};

		const edit = edits.lines?.[line.id];

		if (edit?.value !== undefined && edit.value !== line.ours.value) {
			line.value = edit.value;
			delete line.empty;
		}

		if (edit?.on !== undefined) {
			line.on = edit.on;
		}

		if (line.value !== line.ours.value) {
			line.source = 'yours';
		}

		return line;
	});

	for (const custom of edits.custom ?? []) {
		if (custom.side === side) {
			lines.push({
				id: custom.id,
				side,
				kind: custom.kind,
				label: custom.label,
				value: custom.value,
				on: edits.lines?.[custom.id]?.on ?? true,
				ours: { value: 0, on: false },
				source: 'yours',
			});
		}
	}

	return lines;
}

function rideSide(answers: Answers, lookups: Lookups, draft: RideDraft, lines: Line[]): RideSide {
	const cost = totalOf(lines, 'cost');
	const minutes = totalOf(lines, 'time');

	// An edit to the driving line stretches or shrinks each day's driving with it.
	const driving = lines.find((line) => line.id === 'ride.driving');
	const drivingMinutes = driving?.on ? driving.value : 0;
	const scale = draft.drivingMinutes > 0 ? drivingMinutes / draft.drivingMinutes : 0;
	const longestDay = Math.max(...draft.plan.days.map((day) => day.drivingMinutes)) * scale;

	const comfortLines = rideComfort(answers, lookups, {
		longestDayMinutes: longestDay,
		nights: draft.nights,
		straightThrough: draft.straightThrough,
		nightMinutes: draft.plan.nightMinutes * scale,
	});

	const draftMinutes = totalOf(draft.lines, 'time');

	return {
		side: 'ride',
		lines,
		comfortLines,
		cost,
		minutes,
		comfort: comfortScore(comfortLines),
		drivingMinutes,
		days: draft.nights + 1,
		nights: draft.nights,
		straightThrough: draft.straightThrough,
		nightDrivingMinutes: draft.plan.nightMinutes * scale,
		arrival: draft.plan.arrival + (minutes - draftMinutes),
		maxDrivingHours: draft.maxDrivingHours,
		gasPrice: draft.gasPrice,
		mpg: draft.mpg,
	};
}

function flySide(answers: Answers, lookups: Lookups, draft: FlyDraft, lines: Line[]): FlySide {
	const cost = totalOf(lines, 'cost');
	const minutes = totalOf(lines, 'time');

	const comfortLines = flyComfort(answers, {
		minutes,
		connections: draft.connections,
		delayChance: draft.delayChance,
		disruptChance: draft.disruptChance,
	});

	const flight = lookups.flight;

	// Once the user edits the fares line, the fare per person follows it.
	const fares = lines.find((line) => line.id === 'fly.fares');
	const travelers = answers.adults + answers.children;
	const farePerPerson =
		fares && fares.value !== fares.ours.value ? fares.value / travelers : draft.farePerPerson;

	return {
		side: 'fly',
		lines,
		comfortLines,
		cost,
		minutes,
		comfort: comfortScore(comfortLines),
		origin: flight?.origin.code ?? '',
		destination: flight?.destination.code ?? '',
		connections: draft.connections,
		arrival: START_TIME + minutes,
		farePerPerson,
	};
}

/**
 * The hotel question is asked once, when a drive passes the daily limit and
 * there's someone to share the wheel. A solo traveler gets a hotel without
 * being asked, and can still switch the hotel line off.
 */
function questionsFor(
	answers: Answers,
	ride: RideDraft,
	settings: Settings,
	hotelEdit: boolean | undefined,
): Question[] {
	const unanswered = answers.longDrive === undefined && hotelEdit === undefined;

	if (ride.overLimit && answers.adults >= 2 && unanswered) {
		return [
			{
				kind: 'long-drive',
				drivingMinutes: ride.drivingMinutes,
				limitHours: settings.maxDrivingHours,
			},
		];
	}

	return [];
}
