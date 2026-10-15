// Imports the built file the way the app will, and scores a matchup, to make
// sure the bundle works on its own. Run after `npm run build`.

import * as engine from '../dist/engine.min.js';

const answers = {
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
};

const leg = (miles, minutes) => ({ source: 'Sample', asOf: '2026-10-14', miles, minutes });

const lookups = {
	drive: {
		...leg(540, 490),
		minutesWithoutTraffic: 470,
		milesByState: { CO: 90, WY: 365, UT: 85 },
		winterPasses: ['Sherman Summit (I-80)'],
		midpoint: { lat: 41.59, lon: -109.2 },
	},
	flight: {
		origin: { code: 'DEN', name: 'Denver', size: 'large', lat: 39.86, lon: -104.67 },
		destination: { code: 'SLC', name: 'Salt Lake City', size: 'large', lat: 40.79, lon: -111.98 },
		toOrigin: leg(25, 35),
		fromDestination: leg(22, 30),
		fare: { source: 'Sample', asOf: '2026-10-10', perPerson: 129 },
		schedule: { source: 'Sample', asOf: '2026-09-01', minutes: 95 },
		reliability: null,
	},
	gas: { source: 'Sample', asOf: '2026-10-05', byRegion: { 'rocky-mountain': 3.1 }, national: 3.2 },
	perDiem: {
		source: 'Sample',
		asOf: '2026-10-01',
		start: { lunch: 19, lodging: 110 },
		destination: { lunch: 19, lodging: 110 },
	},
	rental: { source: 'Sample', asOf: '2026-09-01', start: 55, destination: 55 },
	roadSafety: { source: 'Sample', asOf: '2026-06-01', byState: {}, national: 1.26 },
	utcOffsetMinutes: -420,
	dataVersion: 'sample',
};

const result = engine.score(answers, lookups);

if (result.verdict !== 'ride' || result.engineVersion !== engine.ENGINE_VERSION) {
	console.error('The built engine gave an unexpected result:', result.verdict);
	process.exit(1);
}

console.log(
	`smoke test   ${result.verdict}, ${result.confidence} (engine ${result.engineVersion})`,
);
