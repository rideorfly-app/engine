import type { Figure, Take } from './types';

const PLACEHOLDER = /\{([a-z_]+)\}/g;

/**
 * Swaps each placeholder for its figure. Fill from the numbers the take was
 * written from, never the live ones, so the take doesn't shift as the user
 * edits. A take that passed checkTake() has no unknown placeholders.
 */
export function fillText(text: string, figures: Figure[]): string {
	const values = new Map(figures.map((figure) => [figure.name, figure.value]));

	return text.replace(PLACEHOLDER, (placeholder, name: string) => values.get(name) ?? placeholder);
}

/** A take with every placeholder filled in, ready to show. */
export function fillTake(take: Take, figures: Figure[]): Take {
	const fill = (text: string) => fillText(text, figures);

	return {
		...take,
		summary: fill(take.summary),
		reasons: take.reasons.map(fill),
		worth_considering: take.worth_considering.map(fill),
		differs_from_numbers:
			take.differs_from_numbers === null ? null : fill(take.differs_from_numbers),
		changes_assessment: take.changes_assessment === null ? null : fill(take.changes_assessment),
	};
}
