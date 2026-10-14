/*
 * Sample matchups for tests.
 *
 * The figures are made up but realistic. They never come from Google: its
 * route results can't be stored, and this repo is public.
 */

import type { Answers, Lookups } from '../src/types';

/** Denver to Sandy, Utah: two adults and two children, in December. */
export function familyAnswers(overrides: Partial<Answers> = {}): Answers {
	return {
		from: { id: '0820000', name: 'Denver', state: 'CO', lat: 39.74, lon: -104.99 },
		to: { id: '4967440', name: 'Sandy', state: 'UT', lat: 40.57, lon: -111.86 },
		date: '2026-12-18',
		adults: 2,
		children: 2,
		car: { kind: 'own', mpg: 27 },
		toAirport: { mode: 'park', daysParked: 6 },
		fromAirport: 'pickup',
		checkedBags: 2,
		pets: 0,
		preference: 30,
		...overrides,
	};
}

export function familyLookups(overrides: Partial<Lookups> = {}): Lookups {
	return {
		drive: {
			source: 'Google Maps',
			asOf: '2026-10-14',
			miles: 540,
			minutes: 490,
			minutesWithoutTraffic: 470,
			milesByState: { CO: 90, WY: 365, UT: 85 },
			winterPasses: ['Sherman Summit (I-80)'],
			midpoint: { lat: 41.59, lon: -109.2 },
		},
		flight: {
			origin: {
				code: 'DEN',
				name: 'Denver International',
				size: 'large',
				lat: 39.86,
				lon: -104.67,
			},
			destination: {
				code: 'SLC',
				name: 'Salt Lake City International',
				size: 'large',
				lat: 40.79,
				lon: -111.98,
			},
			toOrigin: { source: 'Google Maps', asOf: '2026-10-14', miles: 25, minutes: 35 },
			fromDestination: { source: 'Google Maps', asOf: '2026-10-14', miles: 22, minutes: 30 },
			fare: { source: 'Travelpayouts', asOf: '2026-10-10', perPerson: 129 },
			schedule: { source: 'DOT', asOf: '2026-09-01', minutes: 95 },
			reliability: {
				source: 'DOT',
				asOf: '2026-08-31',
				averageDelayMinutes: 15,
				delayChance: 0.18,
				cancelChance: 0.015,
			},
		},
		gas: {
			source: 'EIA',
			asOf: '2026-10-05',
			byRegion: { 'rocky-mountain': 3.1 },
			national: 3.2,
		},
		perDiem: {
			source: 'GSA',
			asOf: '2026-10-01',
			start: { lunch: 19, lodging: 110 },
			destination: { lunch: 19, lodging: 110 },
		},
		rental: { source: 'Rental averages', asOf: '2026-09-01', start: 55, destination: 55 },
		roadSafety: {
			source: 'NHTSA',
			asOf: '2026-06-01',
			byState: { CO: 1.1, WY: 1.45, UT: 0.95 },
			national: 1.26,
		},
		utcOffsetMinutes: -420,
		...overrides,
	};
}

/** Chicago to Minneapolis, alone, in November: built to be close. */
export function soloAnswers(overrides: Partial<Answers> = {}): Answers {
	return {
		from: { id: '60614', name: 'Chicago', state: 'IL', lat: 41.92, lon: -87.65 },
		to: { id: '55402', name: 'Minneapolis', state: 'MN', lat: 44.98, lon: -93.27 },
		date: '2026-11-05',
		adults: 1,
		children: 0,
		car: { kind: 'own', mpg: 32 },
		toAirport: { mode: 'rideshare' },
		fromAirport: 'transit',
		checkedBags: 0,
		pets: 0,
		preference: 0,
		...overrides,
	};
}

export function soloLookups(overrides: Partial<Lookups> = {}): Lookups {
	return {
		drive: {
			source: 'Google Maps',
			asOf: '2026-10-14',
			miles: 408,
			minutes: 390,
			minutesWithoutTraffic: 370,
			milesByState: { IL: 88, WI: 295, MN: 25 },
			winterPasses: [],
			midpoint: { lat: 43.8, lon: -90.4 },
		},
		flight: {
			origin: { code: 'MDW', name: 'Chicago Midway', size: 'large', lat: 41.79, lon: -87.75 },
			destination: {
				code: 'MSP',
				name: 'Minneapolis–Saint Paul',
				size: 'large',
				lat: 44.88,
				lon: -93.22,
			},
			toOrigin: { source: 'Google Maps', asOf: '2026-10-14', miles: 13, minutes: 40 },
			fromDestination: { source: 'Google Maps', asOf: '2026-10-14', miles: 12, minutes: 20 },
			fare: { source: 'Travelpayouts', asOf: '2026-10-12', perPerson: 59 },
			schedule: { source: 'DOT', asOf: '2026-09-01', minutes: 99 },
			reliability: {
				source: 'DOT',
				asOf: '2026-08-31',
				averageDelayMinutes: 12,
				delayChance: 0.2,
				cancelChance: 0.015,
			},
		},
		gas: { source: 'EIA', asOf: '2026-10-12', byRegion: { midwest: 4.25 }, national: 4.3 },
		perDiem: {
			source: 'GSA',
			asOf: '2026-10-01',
			start: { lunch: 19, lodging: 110 },
			destination: { lunch: 19, lodging: 110 },
		},
		rental: { source: 'Rental averages', asOf: '2026-09-01', start: 60, destination: 60 },
		roadSafety: {
			source: 'NHTSA',
			asOf: '2026-06-01',
			byState: { IL: 1.23, WI: 0.87, MN: 0.71 },
			national: 1.26,
		},
		utcOffsetMinutes: -360,
		...overrides,
	};
}
