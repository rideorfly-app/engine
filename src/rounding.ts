import type { Dollars, Minutes } from './units';

/** Line totals are rounded to the nearest $5 ... */
export const COST_STEP: Dollars = 5;

/** ... and the nearest 5 minutes. */
export const MINUTE_STEP: Minutes = 5;

/**
 * Rounds to the nearest multiple of `step`, with halves going up.
 *
 * A tiny nudge keeps float noise (52.4999999 instead of 52.5) from rounding
 * the wrong way, so every browser and server gets the same answer.
 */
export function roundToStep(value: number, step: number): number {
	const rounded = Math.floor(value / step + 0.5 + 1e-9) * step;

	// Avoid -0, which would print as "-$0".
	return rounded === 0 ? 0 : rounded;
}

/** Rounds a line's cost total to the nearest $5. */
export function roundCost(dollars: Dollars): Dollars {
	return roundToStep(dollars, COST_STEP);
}

/** Rounds a line's time total to the nearest 5 minutes. */
export function roundMinutes(minutes: Minutes): Minutes {
	return roundToStep(minutes, MINUTE_STEP);
}
