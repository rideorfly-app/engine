// Observed flight times for a benchmark trip, from DOT's on-time records. For
// gathering benchmark trips only; the engine itself never reads these files.
//
// Download a month of "Reporting Carrier On-Time Performance" from BTS (about
// 30 MB), then:
//
//   node scripts/benchmark-flights.mjs FILE.zip WN DAL HOU
//   node scripts/benchmark-flights.mjs FILE.zip WN OMA DEN BZN --offsets 0,-60,-60
//
// AIRLINE is a two-letter code, or ALL for every airline on the route, as the
// engine's delay figures are. The first form is a nonstop. The second is a connection: each day's shortest
// one (at least 45 minutes to connect), flown as it really went, with a missed
// connection rebooked on the next flight out. --offsets gives each airport's
// clock relative to the first, in minutes (Mountain is −60 from Central).

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const args = process.argv.slice(2);
const offsetFlag = args.indexOf('--offsets');
const offsets = offsetFlag >= 0 ? args.splice(offsetFlag, 2)[1].split(',').map(Number) : [];
const [file, airline, ...airports] = args;

if (!file || airports.length < 2) {
	console.error(
		'Usage: node scripts/benchmark-flights.mjs FILE.zip AIRLINE FROM [VIA] TO [--offsets 0,a,b]',
	);
	process.exit(1);
}

const legs = new Set(airports.slice(1).map((to, i) => `${airports[i]}-${to}`));
const offsetOf = Object.fromEntries(airports.map((code, i) => [code, offsets[i] ?? 0]));

// --- Read the month's flights for this airline and these legs ---

/** Splits one CSV line. BTS quotes text fields, which can hold commas ("Dallas, TX"). */
const split = (line) =>
	[...line.matchAll(/"([^"]*)"|([^,]*)/g)]
		.filter((m) => m.index === 0 || line[m.index - 1] === ',')
		.map((m) => m[1] ?? m[2]);

const unzip = spawn('unzip', ['-p', file, '*.csv']);
const lines = createInterface({ input: unzip.stdout });

let columns = null;
const flights = [];

for await (const line of lines) {
	const fields = split(line);
	if (!columns) {
		columns = Object.fromEntries(fields.map((name, i) => [name, i]));
		continue;
	}

	const get = (name) => fields[columns[name]];
	if (airline !== 'ALL' && get('Reporting_Airline') !== airline) continue;
	if (!legs.has(`${get('Origin')}-${get('Dest')}`)) continue;

	flights.push({
		date: get('FlightDate'),
		origin: get('Origin'),
		dest: get('Dest'),
		scheduledDeparture: get('CRSDepTime'),
		scheduledMinutes: Number(get('CRSElapsedTime')),
		departureDelay: Number(get('DepDelay')),
		actualMinutes: Number(get('ActualElapsedTime')),
		arrivalDelay: Number(get('ArrDelay')),
		flown: get('Cancelled') === '0.00' && get('Diverted') === '0.00',
	});
}

// --- Summaries ---

const mean = (list) => list.reduce((sum, n) => sum + n, 0) / list.length;
const median = (list) => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];
const percent = (n) => `${(n * 100).toFixed(1)}%`;

/** On-time figures for one leg: what `lookups.flight.reliability` takes. */
function legSummary(origin, dest) {
	const all = flights.filter((f) => f.origin === origin && f.dest === dest);
	const flown = all.filter((f) => f.flown);
	const delays = flown.map((f) => f.arrivalDelay);

	console.log(`${airline} ${origin}–${dest}: ${all.length} flights, ${flown.length} flown`);
	console.log(
		`  scheduled gate to gate: ${mean(flown.map((f) => f.scheduledMinutes)).toFixed(1)} min`,
	);
	console.log(`  average arrival delay, early arrivals counted: ${mean(delays).toFixed(1)} min`);
	console.log(
		`  (late flights only, early as 0: ${mean(delays.map((d) => Math.max(d, 0))).toFixed(1)} min)`,
	);
	console.log(
		`  more than 15 minutes late: ${percent(delays.filter((d) => d > 15).length / delays.length)}`,
	);
	console.log(
		`  cancelled or diverted: ${percent(all.filter((f) => !f.flown).length / all.length)}`,
	);
	return flown;
}

/** Minutes after midnight, on the first airport's clock. */
function clock(flight) {
	const hhmm = flight.scheduledDeparture.padStart(4, '0');
	const departs = Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(2)) - offsetOf[flight.origin];
	const departed = departs + flight.departureDelay;

	return {
		departs,
		arrives: departs + flight.scheduledMinutes,
		departed: flight.flown ? departed : null,
		arrived: flight.flown ? departed + flight.actualMinutes : null,
	};
}

if (airports.length === 2) {
	const flown = legSummary(...airports);
	const observed = flown.map((f) => f.scheduledMinutes + f.arrivalDelay);
	console.log(
		`  OBSERVED scheduled departure to actual arrival: mean ${mean(observed).toFixed(1)}, median ${median(observed)} min`,
	);
} else {
	const [from, via, to] = airports;
	legSummary(from, via);
	legSummary(via, to);

	const days = Map.groupBy(flights, (f) => f.date);
	const scheduled = [];
	const observed = [];
	let rebooked = 0;
	let stranded = 0;

	for (const dayFlights of days.values()) {
		const first = dayFlights.filter((f) => f.origin === from).map(clock);
		const second = dayFlights
			.filter((f) => f.origin === via)
			.map(clock)
			.sort((a, b) => a.departs - b.departs);

		// The day's shortest connection that leaves at least 45 minutes to connect.
		let best = null;
		for (const leg of first) {
			const onward = second.find((s) => s.departs >= leg.arrives + 45);
			if (
				onward &&
				(!best || onward.arrives - leg.departs < best.onward.arrives - best.leg.departs)
			) {
				best = { leg, onward };
			}
		}
		if (!best) continue;

		const { leg, onward } = best;
		scheduled.push(onward.arrives - leg.departs);
		if (leg.arrived === null) {
			stranded++;
			continue;
		}

		// Made it if the first flight landed 30 minutes before the onward one left.
		if (onward.departed !== null && leg.arrived + 30 <= onward.departed) {
			observed.push(onward.arrived - leg.departs);
			continue;
		}

		const later = second.find(
			(s) => s.departed !== null && s.departs > onward.departs && s.departed >= leg.arrived + 45,
		);
		if (later) {
			rebooked++;
			observed.push(later.arrived - leg.departs);
		} else {
			stranded++;
		}
	}

	console.log(
		`${airline} ${from}–${via}–${to}: each day's shortest connection, ${scheduled.length} days`,
	);
	console.log(`  scheduled: ${mean(scheduled).toFixed(1)} min`);
	console.log(
		`  missed the connection and rebooked that day: ${rebooked}; not completed that day: ${stranded}`,
	);
	console.log(
		`  OBSERVED scheduled departure to actual arrival: mean ${mean(observed).toFixed(1)}, median ${median(observed)} min, ${observed.length} days`,
	);
}
