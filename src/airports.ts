/*
 * Choosing airports, and spotting trips too close to fly.
 *
 * The app sends the airports with passenger service near each end, and each
 * pairing's fare. The engine estimates the drives to and from each airport
 * from the straight line, scores the whole Fly side for every pairing, and
 * ranks them. Only the chosen pair then gets real drive times.
 */

import { comfortScore, flyComfort } from './comfort';
import { AIRPORTS, DRIVE, VERDICT } from './defaults';
import { buildFly, type FlyRates } from './fly';
import { straightLineMiles } from './geo';
import { totalOf } from './lines';
import type { Airport, Answers, FlightLookups, GroundLeg, Place, Weights } from './types';
import type { Miles } from './units';

export interface NearbyAirport {
	airport: Airport;
	miles: Miles;
}

/** Airports within the search radius of a place, nearest first. */
export function nearbyAirports(
	place: Place,
	airports: Airport[],
	radius: Miles = AIRPORTS.searchRadiusMiles,
): NearbyAirport[] {
	return airports
		.map((airport) => ({ airport, miles: straightLineMiles(place, airport) }))
		.filter((nearby) => nearby.miles <= radius)
		.sort((a, b) => a.miles - b.miles || a.airport.code.localeCompare(b.airport.code));
}

/**
 * Too close to fly: the ends are under 100 miles apart, or the same airport is
 * nearest to both. The places question checks this before any lookup starts,
 * and the server checks it again.
 */
export function tooCloseToFly(from: Place, to: Place, airports: Airport[]): boolean {
	if (straightLineMiles(from, to) < AIRPORTS.tooCloseMiles) {
		return true;
	}

	const nearestToStart = nearbyAirports(from, airports, Number.POSITIVE_INFINITY)[0];
	const nearestToDestination = nearbyAirports(to, airports, Number.POSITIVE_INFINITY)[0];

	return nearestToStart?.airport.code === nearestToDestination?.airport.code;
}

/** One airport pairing to rank, with its fare and DOT data. */
export type PairCandidate = Pick<
	FlightLookups,
	'origin' | 'destination' | 'fare' | 'schedule' | 'reliability'
>;

export interface RankedPair {
	origin: string;
	destination: string;
	cost: number;
	minutes: number;
	comfort: number;

	/** Lower is better. */
	penalty: number;
}

/**
 * Ranks airport pairings, best first.
 *
 * Each pairing's cost and time are compared with the best of all the
 * pairings, and its comfort with the most comfortable one, weighted the same
 * way as the verdict.
 */
export function rankAirportPairs(
	answers: Answers,
	rates: FlyRates,
	candidates: PairCandidate[],
	weights: Weights = VERDICT.weights,
): RankedPair[] {
	const scored = candidates.map((candidate) => {
		const flight: FlightLookups = {
			...candidate,
			toOrigin: estimatedLeg(answers.from, candidate.origin),
			fromDestination: estimatedLeg(answers.to, candidate.destination),
		};

		const fly = buildFly(answers, rates, flight, {
			maxDrivingHours: DRIVE.maxDrivingHours,
			hotel: true,
		});
		const minutes = totalOf(fly.lines, 'time');
		const comfort = comfortScore(
			flyComfort(answers, {
				minutes,
				connections: fly.connections,
				delayChance: fly.delayChance,
				disruptChance: fly.disruptChance,
			}),
		);

		return {
			origin: candidate.origin.code,
			destination: candidate.destination.code,
			cost: totalOf(fly.lines, 'cost'),
			minutes,
			comfort,
			groundMiles: flight.toOrigin.miles + flight.fromDestination.miles,
		};
	});

	const cheapest = Math.min(...scored.map((pair) => pair.cost));
	const fastest = Math.min(...scored.map((pair) => pair.minutes));
	const comfiest = Math.max(...scored.map((pair) => pair.comfort));

	return scored
		.map((pair) => ({
			...pair,
			penalty:
				weights.cost * (pair.cost / cheapest) +
				weights.time * (pair.minutes / fastest) +
				(weights.comfort * (comfiest - pair.comfort)) / VERDICT.comfortSpread,
		}))
		.sort(
			(a, b) =>
				a.penalty - b.penalty ||
				a.groundMiles - b.groundMiles ||
				`${a.origin}${a.destination}`.localeCompare(`${b.origin}${b.destination}`),
		)
		.map(({ groundMiles: _groundMiles, ...pair }) => pair);
}

/** A drive to or from an airport, estimated from the straight line. */
function estimatedLeg(place: Place, airport: Airport): GroundLeg {
	const miles = straightLineMiles(place, airport) * AIRPORTS.roadFactor;

	// Only used for ranking, never shown, so it has no date.
	return {
		source: 'Estimated from distance',
		asOf: '',
		miles,
		minutes: (miles / AIRPORTS.localMph) * 60,
	};
}
