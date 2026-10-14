import { describe, expect, it } from 'vitest';
import { compare, meaningfulChanges } from '../src/compare';
import { preferenceLabel, preferenceLabelIndex } from '../src/preference';
import { score } from '../src/score';
import type { Answers, Edits, Lookups } from '../src/types';
import { familyAnswers, familyLookups, soloAnswers, soloLookups } from './fixtures';

const snapshot = (answers: Answers, lookups: Lookups, edits: Edits = {}) => ({
	answers,
	result: score(answers, lookups, edits),
});

describe('compare', () => {
	it('lists only the lines that differ', () => {
		const ours = score(familyAnswers(), familyLookups());
		const yours = score(familyAnswers(), familyLookups(), {
			lines: { 'ride.food': { on: false } },
		});

		const comparison = compare(ours, yours);

		expect(comparison.lines.map((line) => line.id)).toEqual(['ride.food']);
		expect(comparison.ride.cost).toEqual({ ours: 200, yours: 115, change: -85 });
		expect(comparison.message).toBeNull();
	});

	it('says so when the edits flip the numbers', () => {
		const ours = score(soloAnswers(), soloLookups());
		const yours = score(soloAnswers(), soloLookups(), { lines: { 'fly.fares': { value: 250 } } });

		expect(compare(ours, yours).message).toBe('With your changes, the numbers now favor Ride.');
	});
});

describe('meaningfulChanges', () => {
	it('finds nothing in a small tweak', () => {
		const before = snapshot(familyAnswers(), familyLookups());
		const after = snapshot(familyAnswers(), familyLookups(), { assumptions: { mpg: 29 } });

		expect(meaningfulChanges(before, after)).toEqual([]);
	});

	it('describes a change in travelers', () => {
		const before = snapshot(familyAnswers({ children: 0 }), familyLookups());
		const after = snapshot(familyAnswers(), familyLookups());

		expect(meaningfulChanges(before, after)).toContainEqual({
			kind: 'travelers',
			description: 'Travelers: 2 adults → 2 adults and 2 children',
		});
	});

	it('counts a fare change of $25 or 10% per person, whichever is larger', () => {
		const before = snapshot(familyAnswers(), familyLookups());

		// $515 → $535 for four is $5 a person: not meaningful.
		const small = snapshot(familyAnswers(), familyLookups(), {
			lines: { 'fly.fares': { value: 535 } },
		});

		// $515 → $640 is about $31 a person: meaningful.
		const large = snapshot(familyAnswers(), familyLookups(), {
			lines: { 'fly.fares': { value: 640 } },
		});

		expect(meaningfulChanges(before, small).some((change) => change.kind === 'fares')).toBe(false);
		expect(meaningfulChanges(before, large)).toContainEqual({
			kind: 'fares',
			description: 'Fares: $129 → $160 per person',
		});
	});

	it('counts gas when it moves 15% or more', () => {
		const before = snapshot(familyAnswers(), familyLookups());
		const after = snapshot(familyAnswers(), familyLookups(), { assumptions: { gasPrice: 3.75 } });

		expect(meaningfulChanges(before, after).map((change) => change.kind)).toContain('gas');
	});

	it('counts a winner that flips', () => {
		const before = snapshot(soloAnswers(), soloLookups());
		const after = snapshot(soloAnswers(), soloLookups(), {
			lines: { 'fly.fares': { value: 250 } },
		});

		expect(meaningfulChanges(before, after)[0]).toEqual({
			kind: 'winner',
			description: 'The numbers: Fly → Ride',
		});
	});

	it('gives no drive figures for Ride lines, which come from Google’s route', () => {
		const before = snapshot(familyAnswers(), familyLookups());
		const after = snapshot(familyAnswers(), familyLookups(), {
			lines: { 'ride.food': { on: false } },
		});

		expect(meaningfulChanges(before, after)).toContainEqual({
			kind: 'cost',
			description: 'Meals and snacks changed',
		});
	});

	it('counts a preference that crosses into another label', () => {
		const before = snapshot(familyAnswers({ preference: 30 }), familyLookups());
		const after = snapshot(familyAnswers({ preference: 80 }), familyLookups());

		expect(meaningfulChanges(before, after).map((change) => change.kind)).toContain('preference');
	});
});

describe('preference labels', () => {
	it('maps the slider to five labels', () => {
		expect(preferenceLabelIndex(-100)).toBe(0);
		expect(preferenceLabelIndex(0)).toBe(2);
		expect(preferenceLabelIndex(30)).toBe(3);
		expect(preferenceLabel(100)).toBe('The road trip is half the point');
	});
});
