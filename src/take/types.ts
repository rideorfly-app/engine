import type { Confidence, Verdict } from '../types';

/**
 * Our take, as the model returns it. Figures appear only as placeholders,
 * such as {cost_diff}, until fillTake() swaps in the values.
 */
export interface Take {
	verdict: Verdict;
	confidence: Confidence;

	/** Two to four plain sentences. */
	summary: string;

	/** Up to three short reasons. */
	reasons: string[];

	/** Up to two things the numbers don't capture. */
	worth_considering: string[];

	/** Required whenever the take's verdict differs from the numbers': what it weighed differently. */
	differs_from_numbers: string | null;

	/** On a re-evaluation: whether the changes justify a different call, and why. */
	changes_assessment: string | null;

	/** Two sentences for shared links, with no figures and no placeholders. */
	share_summary: string;
}

/** One of the model's earlier takes on this matchup, for a re-evaluation. */
export interface TakeHistoryEntry {
	/** 1 for the first take. */
	take: number;

	/** A short summary of the inputs at the time, such as "2 adults, own car". */
	inputs: string;

	verdict: Verdict;
	confidence: Confidence;
	reasons: string[];
}

/** A figure the take may quote by name. */
export interface Figure {
	name: string;

	/** What it means, for the model. */
	meaning: string;

	/** The formatted value that replaces the placeholder. */
	value: string;
}
