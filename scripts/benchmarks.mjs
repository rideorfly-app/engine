// Scores every benchmark trip with the built engine and compares each side to
// the trip's real figures. Each real total is the sum of its parts, and each
// part says how it's known, so the report shows how much of a total was
// actually observed. Run after `npm run build`.

import { readdirSync, readFileSync } from 'node:fs';
import { score } from '../dist/engine.min.js';

/** How far off each side may be: time within 15%, cost within 20%. */
const TARGET = { time: 0.15, cost: 0.2 };

/** How a real figure is known, from strongest to weakest. */
const BASES = ['observed', 'price', 'average', 'judgment'];

const dir = new URL('../benchmarks/', import.meta.url);
const files = readdirSync(dir).filter((name) => name.endsWith('.json'));

let misses = 0;

/** Adds up a list of parts, in total and by basis. */
function sum(parts, file) {
	const byBasis = Object.fromEntries(BASES.map((basis) => [basis, 0]));
	let total = 0;

	for (const part of parts) {
		if (!BASES.includes(part.basis)) throw new Error(`${file}: unknown basis "${part.basis}"`);
		byBasis[part.basis] += part.amount;
		total += part.amount;
	}

	return { total: Math.round(total * 100) / 100, byBasis };
}

/** One line of the report: "300 vs 269 (+11.5%) within · observed 27%, average 67%, judgment 6%". */
function check(kind, estimate, parts, file) {
	const { total, byBasis } = sum(parts, file);
	const off = (estimate - total) / total;
	const within = Math.abs(off) <= TARGET[kind];
	if (!within) misses++;

	const sign = off >= 0 ? '+' : '';
	const shares = BASES.filter((basis) => byBasis[basis] > 0)
		.map((basis) => `${basis} ${Math.round((byBasis[basis] / total) * 100)}%`)
		.join(', ');

	return `${estimate} vs ${total} (${sign}${(off * 100).toFixed(1)}%) ${within ? 'within' : 'OUTSIDE'} · ${shares}`;
}

for (const file of files) {
	const trip = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
	const result = score(trip.answers, trip.lookups, trip.edits);
	console.log(`\n${trip.id}: ${trip.title}`);

	for (const side of ['ride', 'fly']) {
		const actual = trip.actual[side];
		const ours = result[side];
		if (!actual || !ours) continue;

		console.log(`  ${side.padEnd(4)} time ${check('time', ours.minutes, actual.time, file)}`);
		console.log(`       cost ${check('cost', ours.cost, actual.cost, file)}`);
	}

	console.log(`  verdict: ${result.verdict} (${result.confidence})`);
}

console.log(`\n${files.length} trips, ${misses} checks outside the target.`);
process.exitCode = misses ? 1 : 0;
