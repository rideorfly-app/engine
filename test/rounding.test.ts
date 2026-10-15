import { describe, expect, it } from 'vitest';
import { roundCost, roundMinutes, roundToStep } from '../src/rounding';

describe('roundCost', () => {
	it('rounds to the nearest $5', () => {
		expect(roundCost(52)).toBe(50);
		expect(roundCost(53)).toBe(55);
		expect(roundCost(1047.9)).toBe(1050);
	});

	it('rounds halves up', () => {
		expect(roundCost(52.5)).toBe(55);
		expect(roundCost(57.5)).toBe(60);
	});

	it('is not thrown off by float noise', () => {
		// Floating-point math can land a hair to either side of a half.
		expect(roundCost(52.49999999999999)).toBe(55);
		expect(roundCost(52.50000000000001)).toBe(55);
	});

	it('never returns negative zero', () => {
		expect(Object.is(roundCost(-1), 0)).toBe(true);
	});
});

describe('roundMinutes', () => {
	it('rounds to the nearest 5 minutes', () => {
		expect(roundMinutes(487)).toBe(485);
		expect(roundMinutes(488)).toBe(490);
		expect(roundMinutes(7.5)).toBe(10);
	});
});

describe('roundToStep', () => {
	it('works with any step', () => {
		expect(roundToStep(14, 10)).toBe(10);
		expect(roundToStep(15, 10)).toBe(20);
	});
});
