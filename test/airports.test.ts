import { describe, expect, it } from 'vitest';
import {
	nearbyAirports,
	type PairCandidate,
	rankAirportPairs,
	tooCloseToFly,
} from '../src/airports';
import type { Airport, Place } from '../src/types';
import { soloAnswers, soloLookups } from './fixtures';

const denver: Place = { id: '0820000', name: 'Denver', state: 'CO', lat: 39.74, lon: -104.99 };
const boulder: Place = { id: '0807850', name: 'Boulder', state: 'CO', lat: 40.01, lon: -105.27 };
const saltLake: Place = {
	id: '4967000',
	name: 'Salt Lake City',
	state: 'UT',
	lat: 40.76,
	lon: -111.89,
};

const DEN: Airport = {
	code: 'DEN',
	name: 'Denver International',
	size: 'large',
	lat: 39.86,
	lon: -104.67,
};
const SLC: Airport = {
	code: 'SLC',
	name: 'Salt Lake City',
	size: 'large',
	lat: 40.79,
	lon: -111.98,
};
const MDW: Airport = {
	code: 'MDW',
	name: 'Chicago Midway',
	size: 'large',
	lat: 41.79,
	lon: -87.75,
};
const ORD: Airport = { code: 'ORD', name: "Chicago O'Hare", size: 'large', lat: 41.98, lon: -87.9 };
const MKE: Airport = {
	code: 'MKE',
	name: 'Milwaukee Mitchell',
	size: 'medium',
	lat: 42.95,
	lon: -87.9,
};
const MSP: Airport = {
	code: 'MSP',
	name: 'Minneapolis–Saint Paul',
	size: 'large',
	lat: 44.88,
	lon: -93.22,
};

describe('tooCloseToFly', () => {
	it('is true under 100 miles', () => {
		expect(tooCloseToFly(denver, boulder, [DEN, SLC])).toBe(true);
	});

	it('is false for Denver to Salt Lake City', () => {
		expect(tooCloseToFly(denver, saltLake, [DEN, SLC])).toBe(false);
	});

	it('is true when the same airport is nearest to both ends', () => {
		expect(tooCloseToFly(denver, saltLake, [DEN])).toBe(true);
	});
});

describe('nearbyAirports', () => {
	it('lists airports within the radius, nearest first', () => {
		const chicago = soloAnswers().from;

		expect(
			nearbyAirports(chicago, [MSP, MKE, ORD, MDW]).map((nearby) => nearby.airport.code),
		).toEqual(['MDW', 'ORD', 'MKE']);
	});
});

describe('rankAirportPairs', () => {
	const pair = (origin: Airport, perPerson: number): PairCandidate => ({
		origin,
		destination: MSP,
		fare: { source: 'Travelpayouts', asOf: '2026-10-12', perPerson },
		schedule: { source: 'DOT', asOf: '2026-09-01', minutes: 99 },
		reliability: null,
	});

	it('picks the cheaper fare when the airports are alike', () => {
		const ranked = rankAirportPairs(soloAnswers(), soloLookups(), [pair(ORD, 89), pair(MDW, 59)]);

		expect(ranked.map((ranking) => ranking.origin)).toEqual(['MDW', 'ORD']);
	});

	it('doesn’t chase a cheap fare to a distant airport', () => {
		const ranked = rankAirportPairs(soloAnswers(), soloLookups(), [pair(MKE, 45), pair(MDW, 59)]);

		// Milwaukee's $14 saving costs a rideshare of about 100 miles.
		expect(ranked[0]?.origin).toBe('MDW');
	});
});
