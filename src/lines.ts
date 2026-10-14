/*
 * Building lines. Each builder describes a line with its unrounded amount and
 * where the figure came from; this turns it into a rounded Line.
 */

import { roundCost, roundMinutes } from './rounding';
import type { Dated, Line, LineKind, SideName, SourceTag } from './types';

/** A line before the user's edits, so it has no `ours` yet. */
export type DraftLine = Omit<Line, 'ours'>;

export interface LineSpec {
	id: string;
	kind: LineKind;
	label: string;

	/** Dollars or minutes, unrounded. */
	amount: number;

	/** Defaults to an estimate. Pass the lookup to tag the line as sourced. */
	from?: Dated;

	/** Defaults to counted. */
	on?: boolean;

	empty?: boolean;
}

/** Rounds a line's total ($5 or 5 minutes) and tags its source. */
export function draftLine(side: SideName, spec: LineSpec): DraftLine {
	const source: SourceTag = spec.from ? 'sourced' : 'estimate';
	const value = spec.kind === 'cost' ? roundCost(spec.amount) : roundMinutes(spec.amount);

	const line: DraftLine = {
		id: spec.id,
		side,
		kind: spec.kind,
		label: spec.label,
		value,
		on: spec.on ?? true,
		source,
	};

	if (spec.from) {
		line.sourceName = spec.from.source;
		line.asOf = spec.from.asOf;
	}

	if (spec.empty) {
		line.empty = true;
	}

	return line;
}

/** The sum of a side's lines of one kind that are on. */
export function totalOf(lines: Array<Pick<Line, 'kind' | 'value' | 'on'>>, kind: LineKind): number {
	return lines
		.filter((line) => line.kind === kind && line.on)
		.reduce((total, line) => total + line.value, 0);
}
