// Scores one trip from a JSON file and prints the whole comparison: each
// side's lines, comfort, the leans, and the verdict. For trying the engine
// out; see "Try it" in the README.
//
//   npm run try                      (scores examples/trip.json)
//   npm run try -- my-trip.json

import { readFileSync } from 'node:fs';
import {
	formatDuration,
	formatMoney,
	score,
	validateAnswers,
	validateAssumptions,
} from '../dist/engine.min.js';

const file = process.argv[2] ?? 'examples/trip.json';
const trip = JSON.parse(readFileSync(file, 'utf8'));
const { answers, lookups, edits = {} } = trip;

// The server refuses answers outside these ranges, so stop here too.
const problems = [...validateAnswers(answers), ...validateAssumptions(edits.assumptions ?? {})];

if (problems.length > 0) {
	console.error(`${file} has answers the engine won't accept:`);
	for (const problem of problems) console.error(`  ${problem.field}: ${problem.message}`);
	process.exit(1);
}

const result = score(answers, lookups, edits);
const name = (side) => (side === 'ride' ? 'Ride' : 'Fly');
const signed = (number) => `${number >= 0 ? '+' : '−'}${Math.abs(number).toFixed(2)}`;
const travelers = `${answers.adults} ${answers.adults === 1 ? 'adult' : 'adults'}${
	answers.children > 0
		? `, ${answers.children} ${answers.children === 1 ? 'child' : 'children'}`
		: ''
}`;

console.log(
	`\n${answers.from.name}, ${answers.from.state} → ${answers.to.name}, ${answers.to.state}`,
);
console.log(`${answers.date} · ${travelers}`);
console.log(
	`engine ${result.engineVersion} · prompt ${result.promptVersion} · data ${result.dataVersion}`,
);

for (const side of [result.ride, result.fly]) {
	if (!side) {
		console.log('\nFLY\n  Too close to fly: the numbers say Ride.');
		continue;
	}

	const heading = side.side === 'fly' ? `FLY · ${side.origin} to ${side.destination}` : 'RIDE';
	console.log(`\n${heading}`);

	for (const line of side.lines) {
		const value = line.kind === 'cost' ? formatMoney(line.value) : formatDuration(line.value);
		const state = line.empty ? '  (empty: add yours)' : line.on ? '' : '  (off, not counted)';
		const tag = line.source === 'yours' ? '  [yours]' : '';
		console.log(
			`  ${line.kind === 'cost' ? 'cost' : 'time'}  ${value.padStart(8)}  ${line.label}${state}${tag}  (${line.id})`,
		);
	}

	console.log(`  Total: ${formatMoney(side.cost)}, ${formatDuration(side.minutes)} door to door`);
	console.log(`  Comfort: ${side.comfort.toFixed(1)} out of 10, from 7`);

	for (const adjustment of side.comfortLines) {
		console.log(`    ${signed(adjustment.points)}  ${adjustment.label}`);
	}
}

console.log(`\nTHE NUMBERS: ${name(result.verdict)}, ${result.confidence}`);

for (const category of ['cost', 'time', 'comfort']) {
	const winner = result.winners[category];
	const label = winner === 'even' ? 'Even' : name(winner);
	console.log(
		`  ${category.padEnd(8)} ${label.padEnd(5)} lean ${signed(result.leans[category])} × ${Math.round(result.weights[category] * 100)}%`,
	);
}

console.log(`  overall        lean ${signed(result.leans.overall)}  (+ is Ride, − is Fly)`);

for (const question of result.questions) {
	console.log(
		`\nQuestion: the drive passes the ${question.limitHours}-hour daily limit. Add "longDrive": "hotel" or "straight" to the answers.`,
	);
}

for (const note of result.notes) console.log(`\nNote: ${note.text}`);
console.log();
