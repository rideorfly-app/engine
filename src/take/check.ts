/*
 * The check every take must pass before anyone sees it.
 *
 * It confirms the fields, then makes sure the take adds no figures of its
 * own: any digit outside a placeholder, any unknown placeholder, or a
 * spelled-out amount of money, time, or distance fails. A failed take is
 * retried once, then replaced by the code-written summary.
 */

import type { Confidence, Verdict } from '../types';
import type { Figure, Take } from './types';

export type TakeCheck = { ok: true; take: Take } | { ok: false; problems: string[] };

export interface TakeCheckContext {
	/** The figures this matchup's take may use. */
	figures: Figure[];

	/** The numbers' verdict, to know when "differs_from_numbers" is required. */
	numbersVerdict: Verdict;

	/** A re-evaluation must explain its "changes_assessment". */
	reevaluation?: boolean;
}

const VERDICTS: readonly Verdict[] = ['ride', 'fly'];
const CONFIDENCES: readonly Confidence[] = ['toss-up', 'leans', 'clear'];

const LIMITS = {
	summarySentences: { min: 2, max: 4 },
	shareSentences: { min: 2, max: 2 },
	reasons: { min: 1, max: 3 },
	worthConsidering: { min: 0, max: 2 },

	/** Characters, to keep every field short enough for its card. */
	summaryLength: 700,
	itemLength: 200,
	paragraphLength: 600,
} as const;

/** {cost_diff}, {ride_time}, and so on. */
const PLACEHOLDER = /\{([a-z_]+)\}/g;

const NUMBER_WORDS =
	'one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|dozen|half';

const UNITS = 'dollars?|bucks?|cents?|hours?|hrs?|minutes?|mins?|miles?|days?';

/**
 * A spelled-out amount: a number word, perhaps a few joining words, then a
 * unit ("nine hours", "a few hundred dollars", "two-day drive"), or "an hour"
 * and the like. Counts of people ("two kids") don't match.
 */
const SPELLED_AMOUNT = new RegExp(
	`\\b(?:${NUMBER_WORDS})(?:[\\s-]+(?:and|a|of|or|to|more|${NUMBER_WORDS}))*[\\s-]+(?:${UNITS})\\b|\\ban?[\\s-]+(?:hour|minute|mile|dollar|buck)s?\\b`,
	'i',
);

/** Checks a model's raw output. Returns the take, or every problem with it. */
export function checkTake(raw: unknown, context: TakeCheckContext): TakeCheck {
	const problems: string[] = [];

	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
		return { ok: false, problems: ['The take must be a JSON object.'] };
	}

	const take = raw as Record<string, unknown>;
	const known = new Set(context.figures.map((figure) => figure.name));

	// --- The fields ---

	if (!VERDICTS.includes(take.verdict as Verdict)) {
		problems.push('"verdict" must be "ride" or "fly".');
	}

	if (!CONFIDENCES.includes(take.confidence as Confidence)) {
		problems.push('"confidence" must be "toss-up", "leans", or "clear".');
	}

	const summary = text(take.summary, 'summary', LIMITS.summaryLength, problems);
	const shareSummary = text(take.share_summary, 'share_summary', LIMITS.paragraphLength, problems);
	const reasons = list(take.reasons, 'reasons', LIMITS.reasons, problems);
	const worthConsidering = list(
		take.worth_considering,
		'worth_considering',
		LIMITS.worthConsidering,
		problems,
	);
	const differs = optionalText(take.differs_from_numbers, 'differs_from_numbers', problems);
	const assessment = optionalText(take.changes_assessment, 'changes_assessment', problems);

	if (summary !== null) {
		sentences(summary, 'summary', LIMITS.summarySentences, problems);
	}

	if (take.verdict !== context.numbersVerdict && !differs) {
		problems.push('"differs_from_numbers" is required when the verdict differs from the numbers.');
	}

	if (context.reevaluation && !assessment) {
		problems.push('"changes_assessment" is required on a re-evaluation.');
	}

	// --- No figures of its own ---

	const withFigures: Array<[string, string | null]> = [
		['summary', summary],
		['differs_from_numbers', differs],
		['changes_assessment', assessment],
		...reasons.map((reason, index): [string, string] => [`reasons[${index}]`, reason]),
		...worthConsidering.map((item, index): [string, string] => [
			`worth_considering[${index}]`,
			item,
		]),
	];

	for (const [field, value] of withFigures) {
		if (value !== null) {
			figuresOnly(value, field, known, problems);
		}
	}

	if (shareSummary !== null) {
		sentences(shareSummary, 'share_summary', LIMITS.shareSentences, problems);

		if (/[{}]/.test(shareSummary) || /\d/.test(shareSummary) || SPELLED_AMOUNT.test(shareSummary)) {
			problems.push('"share_summary" must have no figures and no placeholders.');
		}
	}

	if (problems.length > 0) {
		return { ok: false, problems };
	}

	return {
		ok: true,
		take: {
			verdict: take.verdict as Verdict,
			confidence: take.confidence as Confidence,
			summary: summary as string,
			reasons,
			worth_considering: worthConsidering,
			differs_from_numbers: differs,
			changes_assessment: assessment,
			share_summary: shareSummary as string,
		},
	};
}

/** Fails a field that quotes a figure any way but through a known placeholder. */
function figuresOnly(value: string, field: string, known: Set<string>, problems: string[]): void {
	for (const [, name] of value.matchAll(PLACEHOLDER)) {
		if (!known.has(name as string)) {
			problems.push(`"${field}" uses an unknown placeholder, {${name}}.`);
		}
	}

	const outside = value.replace(PLACEHOLDER, '');

	if (/[{}]/.test(outside)) {
		problems.push(`"${field}" has a malformed placeholder.`);
	}

	if (/\d/.test(outside)) {
		problems.push(`"${field}" has a number outside a placeholder.`);
	}

	if (SPELLED_AMOUNT.test(outside)) {
		problems.push(`"${field}" spells out an amount of money, time, or distance.`);
	}
}

function text(value: unknown, field: string, maxLength: number, problems: string[]): string | null {
	if (typeof value !== 'string' || value.trim() === '') {
		problems.push(`"${field}" must be text.`);

		return null;
	}

	if (value.length > maxLength) {
		problems.push(`"${field}" is too long.`);
	}

	return value.trim();
}

function optionalText(value: unknown, field: string, problems: string[]): string | null {
	if (value === null || value === undefined) {
		return null;
	}

	return text(value, field, LIMITS.paragraphLength, problems);
}

function list(
	value: unknown,
	field: string,
	limits: { min: number; max: number },
	problems: string[],
): string[] {
	if (!Array.isArray(value)) {
		problems.push(`"${field}" must be a list.`);

		return [];
	}

	if (value.length < limits.min || value.length > limits.max) {
		problems.push(`"${field}" must have ${limits.min} to ${limits.max} items.`);
	}

	return value
		.map((item, index) => text(item, `${field}[${index}]`, LIMITS.itemLength, problems))
		.filter((item): item is string => item !== null);
}

/** Counts sentences by their ending punctuation, ignoring what's inside placeholders. */
function sentences(
	value: string,
	field: string,
	limits: { min: number; max: number },
	problems: string[],
): void {
	const count = value.replace(PLACEHOLDER, 'X').match(/[.!?]+(?=\s|$)/g)?.length ?? 0;

	if (count < limits.min || count > limits.max) {
		problems.push(`"${field}" must be ${limits.min} to ${limits.max} sentences.`);
	}
}
