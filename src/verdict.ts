/*
 * The numbers' verdict.
 *
 * Each category becomes a lean from −1 (Fly) to +1 (Ride). The weighted sum
 * of the three is the overall lean: above zero is Ride, below is Fly, and its
 * size is the confidence.
 */

import { VERDICT } from './defaults';
import type { Confidence, Leans, Side, Verdict, Weights, Winner } from './types';

type Totals = Pick<Side, 'cost' | 'minutes' | 'comfort'>;

/** (Fly − Ride) ÷ the larger of the two, so a cheaper or faster Ride leans positive. */
function relativeLean(ride: number, fly: number): number {
	const larger = Math.max(Math.abs(ride), Math.abs(fly));

	return larger === 0 ? 0 : (fly - ride) / larger;
}

/** Each category's lean, and the weighted overall. */
export function computeLeans(ride: Totals, fly: Totals, weights: Weights): Leans {
	const cost = relativeLean(ride.cost, fly.cost);
	const time = relativeLean(ride.minutes, fly.minutes);
	const comfort = Math.max(-1, Math.min(1, (ride.comfort - fly.comfort) / VERDICT.comfortSpread));

	return {
		cost,
		time,
		comfort,
		overall: weights.cost * cost + weights.time * time + weights.comfort * comfort,
	};
}

/** Ride above zero, Fly below. An exact tie goes to the cheaper side, and to Ride if cost ties too. */
export function decide(leans: Leans, ride: Totals, fly: Totals): Verdict {
	if (leans.overall !== 0) {
		return leans.overall > 0 ? 'ride' : 'fly';
	}

	return fly.cost < ride.cost ? 'fly' : 'ride';
}

/** How clear the call is, from the size of the overall lean. */
export function confidenceOf(overall: number): Confidence {
	const size = Math.abs(overall);

	if (size < VERDICT.tossUpBelow) {
		return 'toss-up';
	}

	return size < VERDICT.leansBelow ? 'leans' : 'clear';
}

/** A category's winner, or Even when its lean is too small to call. */
export function winnerOf(lean: number): Winner {
	if (Math.abs(lean) < VERDICT.evenWithin) {
		return 'even';
	}

	return lean > 0 ? 'ride' : 'fly';
}
