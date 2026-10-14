/*
 * The code-written summary. It stands in for Our take when the AI budget is
 * reached, the call fails, or no checked take arrives in time, and the page
 * labels it "Written from the numbers." It has the same fields as a take, so
 * the page shows it the same way, and it passes the same check.
 */

import type { Result, Verdict, Winner } from '../types';
import type { Take } from './types';

/** How the summary names each side. */
const MODE: Record<Verdict, string> = { ride: 'driving', fly: 'flying' };

export function writtenFromNumbers(result: Result): Take {
	const { verdict, confidence, winners, ride, fly } = result;

	if (!fly) {
		return {
			verdict: 'ride',
			confidence: 'clear',
			summary:
				'This trip is too close to fly. Driving it is the quickest way there, and {ride_drive_time} at the wheel gets you to the door.',
			reasons: ['Too close to fly'],
			worth_considering: [],
			differs_from_numbers: null,
			changes_assessment: null,
			share_summary: 'This trip is too close to fly. Driving it is the way to go.',
		};
	}

	const cheaper: Verdict = ride.cost <= fly.cost ? 'ride' : 'fly';
	const faster: Verdict = ride.minutes <= fly.minutes ? 'ride' : 'fly';
	const side = MODE[verdict];

	const summary = [
		`${capitalize(MODE[cheaper])} costs {cost_diff} less: {ride_cost} to drive, {fly_cost} to fly.`,
		`${capitalize(MODE[faster])} gets you there {time_diff} sooner, door to door.`,
		comfortSentence(winners.comfort),
		confidence === 'toss-up'
			? "Overall it's a toss-up, so decide on what the numbers don't measure."
			: confidence === 'leans'
				? `Overall, the numbers lean toward ${side}.`
				: `Overall, ${side} is the clear call.`,
	].join(' ');

	const reasons: string[] = [];

	if (winners.cost === verdict) {
		reasons.push(`{cost_diff} cheaper by ${verdict === 'ride' ? 'car' : 'air'}`);
	}

	if (winners.time === verdict) {
		reasons.push(`{time_diff} faster door to door`);
	}

	if (winners.comfort === verdict) {
		reasons.push(`More comfortable, {${verdict}_comfort}`);
	}

	if (reasons.length === 0) {
		reasons.push(`The weighted numbers favor ${side}`);
	}

	return {
		verdict,
		confidence,
		summary,
		reasons,
		worth_considering: [],
		differs_from_numbers: null,
		changes_assessment: null,
		share_summary: `${capitalize(MODE[cheaper])} comes out cheaper, and ${MODE[faster]} gets there sooner. ${
			confidence === 'toss-up'
				? "Overall it's a toss-up."
				: `Overall, the numbers ${confidence === 'clear' ? 'clearly favor' : 'lean toward'} ${side}.`
		}`,
	};
}

function comfortSentence(winner: Winner): string {
	if (winner === 'even') {
		return 'Comfort is about even: {ride_comfort} to drive, {fly_comfort} to fly.';
	}

	return winner === 'ride'
		? 'Comfort favors driving, {ride_comfort} to {fly_comfort}.'
		: 'Comfort favors flying, {fly_comfort} to {ride_comfort}.';
}

function capitalize(word: string): string {
	return word.charAt(0).toUpperCase() + word.slice(1);
}
