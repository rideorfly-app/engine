import { describe, expect, it } from 'vitest';
import { validateAnswers, validateAssumptions } from '../src/validate';
import { familyAnswers } from './fixtures';

describe('validateAnswers', () => {
	it('accepts a normal trip', () => {
		expect(validateAnswers(familyAnswers())).toEqual([]);
	});

	it('rejects places outside the lower 48 and DC', () => {
		const answers = familyAnswers({
			to: { id: '1571550', name: 'Honolulu', state: 'HI', lat: 21.31, lon: -157.86 },
		});

		expect(validateAnswers(answers).map((problem) => problem.field)).toEqual(['to']);
	});

	it('rejects the same place at both ends', () => {
		const answers = familyAnswers();
		answers.to = answers.from;

		expect(validateAnswers(answers).map((problem) => problem.field)).toContain('to');
	});

	it('rejects impossible dates', () => {
		expect(validateAnswers(familyAnswers({ date: '2026-02-30' }))[0]?.field).toBe('date');
		expect(validateAnswers(familyAnswers({ date: '12/18/2026' }))[0]?.field).toBe('date');
	});

	it('checks counts against their ranges', () => {
		const fields = validateAnswers(
			familyAnswers({ adults: 0, children: 12, pets: 5, car: { kind: 'own', mpg: 4 } }),
		).map((problem) => problem.field);

		expect(fields).toEqual(expect.arrayContaining(['adults', 'children', 'pets', 'mpg']));
	});

	it('allows two checked bags per traveler', () => {
		expect(validateAnswers(familyAnswers({ checkedBags: 8 }))).toEqual([]);
		expect(validateAnswers(familyAnswers({ checkedBags: 9 }))[0]?.field).toBe('checkedBags');
	});
});

describe('validateAssumptions', () => {
	it('accepts weights that add up to 100%', () => {
		expect(validateAssumptions({ weights: { cost: 0.5, time: 0.3, comfort: 0.2 } })).toEqual([]);
	});

	it('rejects weights that don’t', () => {
		expect(validateAssumptions({ weights: { cost: 0.5, time: 0.5, comfort: 0.5 } })).toHaveLength(
			1,
		);
	});

	it('checks the daily driving limit', () => {
		expect(validateAssumptions({ maxDrivingHours: 30 })[0]?.field).toBe('maxDrivingHours');
	});
});
