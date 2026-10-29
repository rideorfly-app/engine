/*
 * Ours vs. Yours, and meaningful changes.
 *
 * compare() feeds the Ours vs. Yours table and the "With your changes, the
 * numbers now favor Fly" line. meaningfulChanges() decides when an edit is big
 * enough to mention on the Our take card ("Written before your latest changes
 * (fares, costs)") and, with Trip Pass, to offer another look.
 */

import { formatMoney } from './format';
import { preferenceLabel, preferenceLabelIndex } from './preference';
import type { Answers, Line, Result, Side, SideName, Verdict } from './types';

export interface Difference {
	ours: number;
	yours: number;

	/** Yours minus Ours. */
	change: number;
}

export interface SideComparison {
	cost: Difference;
	minutes: Difference;
	comfort: Difference;
}

export interface LineDifference {
	id: string;
	side: SideName;
	kind: Line['kind'];
	label: string;
	ours: { value: number; on: boolean };
	yours: { value: number; on: boolean };
}

export interface Comparison {
	ride: SideComparison;

	/** Null when the trip is too close to fly. */
	fly: SideComparison | null;

	/** Only the lines whose value or switch differs. */
	lines: LineDifference[];

	verdict: { ours: Verdict; yours: Verdict };

	/** Set when the edits change which way the numbers lean. */
	message: string | null;
}

/** Sets Yours beside Ours, side by side and line by line. */
export function compare(ours: Result, yours: Result): Comparison {
	const lines = [...yours.ride.lines, ...(yours.fly?.lines ?? [])]
		.filter((line) => line.value !== line.ours.value || line.on !== line.ours.on)
		.map((line) => ({
			id: line.id,
			side: line.side,
			kind: line.kind,
			label: line.label,
			ours: line.ours,
			yours: { value: line.value, on: line.on },
		}));

	const flipped = ours.verdict !== yours.verdict;

	return {
		ride: compareSide(ours.ride, yours.ride),
		fly: ours.fly && yours.fly ? compareSide(ours.fly, yours.fly) : null,
		lines,
		verdict: { ours: ours.verdict, yours: yours.verdict },
		message: flipped
			? `With your changes, the numbers now favor ${yours.verdict === 'ride' ? 'Ride' : 'Fly'}.`
			: null,
	};
}

function compareSide(ours: Side, yours: Side): SideComparison {
	const difference = (a: number, b: number): Difference => ({ ours: a, yours: b, change: b - a });

	return {
		cost: difference(ours.cost, yours.cost),
		minutes: difference(ours.minutes, yours.minutes),
		comfort: difference(ours.comfort, yours.comfort),
	};
}

// ---------------------------------------------------------------------------
// Meaningful changes
// ---------------------------------------------------------------------------

/** A change worth mentioning, judged by its size per metric, never by how many edits were made. */
export interface Change {
	kind:
		| 'winner'
		| 'travelers'
		| 'date'
		| 'car'
		| 'from-airport'
		| 'fares'
		| 'gas'
		| 'mpg'
		| 'cost'
		| 'time'
		| 'preference';

	/** Plain words for the Our take card and the take's history, such as "Fares: $205 → $262 per person". */
	description: string;
}

/** A matchup as a take saw it, or as it is now. */
export interface Snapshot {
	answers: Answers;
	result: Result;
}

/** The thresholds, from the Trip Pass plan. Starting points, tuned with real use. */
const THRESHOLDS = {
	/** Fares per person: 10% or $25, whichever is larger. */
	fareShare: 0.1,
	fareDollars: 25,

	gasShare: 0.15,
	mpgShare: 0.2,

	/** Any other cost line that moves its side's total by 5% ... */
	costShare: 0.05,

	/** ... or time line that moves door to door by 30 minutes. */
	timeMinutes: 30,
} as const;

/** Lines judged by their own threshold above, not the general cost rule. */
const OWN_RULES = new Set(['fly.fares', 'ride.fuel']);

/** The changes between two snapshots that are big enough to mention. */
export function meaningfulChanges(before: Snapshot, after: Snapshot): Change[] {
	const changes: Change[] = [];
	const was = before.answers;
	const now = after.answers;

	// Anything that changes a winner, always.
	if (before.result.verdict !== after.result.verdict) {
		changes.push({
			kind: 'winner',
			description: `The numbers: ${capitalize(before.result.verdict)} → ${capitalize(after.result.verdict)}`,
		});
	}

	for (const category of ['cost', 'time', 'comfort'] as const) {
		const from = before.result.winners[category];
		const to = after.result.winners[category];

		if (from !== to) {
			changes.push({
				kind: 'winner',
				description: `${capitalize(category)}: ${capitalize(from)} → ${capitalize(to)}`,
			});
		}
	}

	// Answers.
	if (was.adults !== now.adults || was.children !== now.children) {
		changes.push({
			kind: 'travelers',
			description: `Travelers: ${travelers(was)} → ${travelers(now)}`,
		});
	}

	if (was.date !== now.date) {
		changes.push({ kind: 'date', description: `Departure: ${was.date} → ${now.date}` });
	}

	if (was.car.kind !== now.car.kind) {
		changes.push({ kind: 'car', description: `Car: ${carName(was)} → ${carName(now)}` });
	}

	if (was.fromAirport !== now.fromAirport) {
		changes.push({
			kind: 'from-airport',
			description: `From the airport: ${was.fromAirport} → ${now.fromAirport}`,
		});
	}

	if (preferenceLabelIndex(was.preference) !== preferenceLabelIndex(now.preference)) {
		changes.push({
			kind: 'preference',
			description: `Travel preference: "${preferenceLabel(was.preference)}" → "${preferenceLabel(now.preference)}"`,
		});
	}

	// Fares, per person.
	const fareBefore = before.result.fly?.farePerPerson ?? null;
	const fareAfter = after.result.fly?.farePerPerson ?? null;

	if (fareBefore !== null && fareAfter !== null) {
		const threshold = Math.max(THRESHOLDS.fareShare * fareBefore, THRESHOLDS.fareDollars);

		if (Math.abs(fareAfter - fareBefore) >= threshold) {
			changes.push({
				kind: 'fares',
				description: `Fares: ${formatMoney(fareBefore)} → ${formatMoney(fareAfter)} per person`,
			});
		}
	}

	// Gas and fuel economy.
	if (changedBy(before.result.ride.gasPrice, after.result.ride.gasPrice, THRESHOLDS.gasShare)) {
		changes.push({
			kind: 'gas',
			description: `Gas: ${formatMoney(before.result.ride.gasPrice)} → ${formatMoney(after.result.ride.gasPrice)} a gallon`,
		});
	}

	const mpgBefore = before.result.ride.mpg;
	const mpgAfter = after.result.ride.mpg;

	if (
		mpgBefore !== null &&
		mpgAfter !== null &&
		changedBy(mpgBefore, mpgAfter, THRESHOLDS.mpgShare)
	) {
		changes.push({ kind: 'mpg', description: `Fuel economy: ${mpgBefore} → ${mpgAfter} mpg` });
	}

	// Any other line, by how far it moves its side.
	for (const sideName of ['ride', 'fly'] as const) {
		const sideBefore = before.result[sideName];
		const sideAfter = after.result[sideName];

		if (!sideBefore || !sideAfter) {
			continue;
		}

		for (const line of sideAfter.lines) {
			if (OWN_RULES.has(line.id)) {
				continue;
			}

			const previous = sideBefore.lines.find((candidate) => candidate.id === line.id);
			const change = counted(line) - (previous ? counted(previous) : 0);

			// Descriptions may be saved in a matchup's history, which keeps no
			// figures calculated from Google's routes. So only Fly's cost lines,
			// which don't depend on the drive, give amounts.
			const amounts = line.kind === 'cost' && line.side === 'fly';
			const description = amounts
				? `${shortLabel(line)}: ${moneyChange(previous, line)}`
				: `${shortLabel(line)} changed`;

			if (line.kind === 'cost' && Math.abs(change) >= THRESHOLDS.costShare * sideBefore.cost) {
				changes.push({ kind: 'cost', description });
			}

			if (line.kind === 'time' && Math.abs(change) >= THRESHOLDS.timeMinutes) {
				changes.push({ kind: 'time', description });
			}
		}
	}

	return changes;
}

/** A line's contribution to its side's total. */
function counted(line: Line): number {
	return line.on ? line.value : 0;
}

function changedBy(before: number, after: number, share: number): boolean {
	return before > 0 && Math.abs(after - before) / before >= share;
}

/** The part of a label before its details: "Fuel · 540 miles at 27 mpg" becomes "Fuel". */
function shortLabel(line: Line): string {
	return line.label.split(' · ')[0] ?? line.label;
}

function moneyChange(before: Line | undefined, after: Line): string {
	const from = before ? counted(before) : 0;

	return `${formatMoney(from)} → ${formatMoney(counted(after))}`;
}

function travelers(answers: Answers): string {
	const adults = `${answers.adults} ${answers.adults === 1 ? 'adult' : 'adults'}`;

	if (answers.children === 0) {
		return adults;
	}

	return `${adults} and ${answers.children} ${answers.children === 1 ? 'child' : 'children'}`;
}

function carName(answers: Answers): string {
	return answers.car.kind === 'own' ? 'own car' : 'rental';
}

function capitalize(word: string): string {
	return word.charAt(0).toUpperCase() + word.slice(1);
}
