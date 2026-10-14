// Scores every benchmark trip with the built engine and compares each side to
// what the trip really cost and took. Phase 1's gate: time within 15% and cost
// within 20% on each side. Run after `npm run build`.

import { readdirSync, readFileSync } from 'node:fs';
import { score } from '../dist/engine.min.js';

const TIME_LIMIT = 0.15;
const COST_LIMIT = 0.2;

const dir = new URL('../benchmarks/', import.meta.url);
const files = readdirSync(dir).filter((name) => name.endsWith('.json'));

let failures = 0;

/** Formats one check as "300 vs 269 (+11.5%) pass". */
function check(estimate, actual, limit) {
	const off = (estimate - actual) / actual;
	const pass = Math.abs(off) <= limit;
	if (!pass) failures++;

	const sign = off >= 0 ? '+' : '';
	return `${estimate} vs ${actual} (${sign}${(off * 100).toFixed(1)}%) ${pass ? 'pass' : 'FAIL'}`;
}

for (const file of files) {
	const trip = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
	const result = score(trip.answers, trip.lookups);
	console.log(`\n${trip.id}: ${trip.title}`);

	for (const side of ['ride', 'fly']) {
		const actual = trip.actual[side];
		const ours = result[side];
		if (!actual || !ours) continue;

		console.log(`  ${side.padEnd(4)} time ${check(ours.minutes, actual.minutes, TIME_LIMIT)}`);
		console.log(`       cost ${check(ours.cost, actual.cost, COST_LIMIT)}`);
	}

	console.log(`  verdict: ${result.verdict} (${result.confidence})`);
}

console.log(`\n${files.length} trips, ${failures} checks outside the gate.`);
process.exitCode = failures ? 1 : 0;
