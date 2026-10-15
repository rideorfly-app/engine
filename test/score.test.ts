import { describe, expect, it } from 'vitest';
import { roadRiskRatio } from '../src/comfort';
import { score } from '../src/score';
import type { Line, Result } from '../src/types';
import { confidenceOf, winnerOf } from '../src/verdict';
import { familyAnswers, familyLookups, soloAnswers, soloLookups } from './fixtures';

const line = (result: Result, id: string): Line | undefined =>
	[...result.ride.lines, ...(result.fly?.lines ?? [])].find((candidate) => candidate.id === id);

describe('score: the family trip', () => {
	const result = score(familyAnswers(), familyLookups());

	it('totals both sides', () => {
		expect(result.ride.cost).toBe(200);
		expect(result.ride.minutes).toBe(595);
		expect(result.fly?.cost).toBe(785);
		expect(result.fly?.minutes).toBe(345);
	});

	it('scores comfort from the named adjustments', () => {
		// 7 + 0.45 preference − 1.67 long day − 0.08 dark − 0.28 road risk − 0.5 pass − 0.5 children.
		expect(result.ride.comfort).toBeCloseTo(4.42, 1);

		// 7 − 0.45 preference − 0.51 reliability − 0.5 children − 0.2 bags.
		expect(result.fly?.comfort).toBeCloseTo(5.34, 2);
	});

	it('leans Ride on cost, though flying wins time and comfort', () => {
		expect(result.verdict).toBe('ride');
		expect(result.confidence).toBe('leans');
		expect(result.winners).toEqual({ cost: 'ride', time: 'fly', comfort: 'fly' });
		expect(result.leans.overall).toBeCloseTo(0.105, 2);
	});

	it('records the engine, prompt, and data versions', () => {
		expect(result.engineVersion).toMatch(/^\d+\.\d+\.\d+$/);
		expect(result.promptVersion).toBe('take-v1');
		expect(result.dataVersion).toBe('2026-10-14');
	});
});

describe('score: the solo trip', () => {
	const result = score(soloAnswers(), soloLookups());

	it('is close, and leans Fly', () => {
		expect(result.ride.cost).toBe(120);
		expect(result.fly?.cost).toBe(130);
		expect(result.ride.minutes).toBe(450);
		expect(result.fly?.minutes).toBe(325);
		expect(result.verdict).toBe('fly');
		expect(result.confidence).toBe('leans');
	});

	it('weights the route’s road risk by its miles in each state', () => {
		expect(roadRiskRatio(soloLookups())).toBeCloseTo(0.744, 3);
	});
});

describe('score: edits', () => {
	it('uses a typed value, and keeps Ours beside it', () => {
		const result = score(familyAnswers(), familyLookups(), {
			lines: { 'ride.fuel': { value: 70 } },
		});

		expect(line(result, 'ride.fuel')).toMatchObject({
			value: 70,
			source: 'yours',
			ours: { value: 60, on: true },
		});
		expect(result.ride.cost).toBe(210);
	});

	it('treats Ours’s own value typed back in as no edit', () => {
		const result = score(familyAnswers(), familyLookups(), {
			lines: { 'ride.fuel': { value: 60 } },
		});

		expect(line(result, 'ride.fuel')?.source).toBe('sourced');
	});

	it('switches lines off and on', () => {
		const result = score(familyAnswers(), familyLookups(), {
			lines: { 'ride.food': { on: false }, 'ride.depreciation': { on: true } },
		});

		// −$85 food, +$80 depreciation.
		expect(result.ride.cost).toBe(195);
	});

	it('fills in the empty Tolls line', () => {
		const result = score(familyAnswers(), familyLookups(), {
			lines: { 'ride.tolls': { value: 12 } },
		});

		expect(line(result, 'ride.tolls')).toMatchObject({ value: 12, source: 'yours' });
		expect(line(result, 'ride.tolls')?.empty).toBeUndefined();
	});

	it('adds custom lines to their side', () => {
		const result = score(familyAnswers(), familyLookups(), {
			custom: [{ id: 'custom.1', side: 'fly', kind: 'cost', label: 'Kennel', value: 120 }],
		});

		expect(result.fly?.cost).toBe(905);
		expect(line(result, 'custom.1')?.source).toBe('yours');
	});

	it('marks lines behind a changed assumption as the user’s', () => {
		const result = score(familyAnswers(), familyLookups(), { assumptions: { gasPrice: 4.5 } });

		expect(line(result, 'ride.fuel')).toMatchObject({ value: 90, source: 'yours' });
	});

	it('uses the user’s weights', () => {
		const result = score(soloAnswers(), soloLookups(), {
			assumptions: { weights: { cost: 1, time: 0, comfort: 0 } },
		});

		expect(result.verdict).toBe('ride');
		expect(result.weights.cost).toBe(1);
	});

	it('scales comfort’s long-day penalty with an edited driving time', () => {
		const result = score(soloAnswers(), soloLookups(), {
			lines: { 'ride.driving': { value: 480 } },
		});
		const longDay = result.ride.comfortLines.find(
			(adjustment) => adjustment.id === 'ride.comfort.longDay',
		);

		// 8 hours is 4 over: −1.6.
		expect(longDay?.points).toBeCloseTo(-1.6);
	});
});

describe('score: long drives', () => {
	const longLookups = () => {
		const lookups = familyLookups();
		lookups.drive.minutes = 15 * 60;
		lookups.drive.minutesWithoutTraffic = 15 * 60;

		return lookups;
	};

	it('asks a group "hotel or straight through?" once', () => {
		const result = score(familyAnswers(), longLookups());

		expect(result.questions).toEqual([{ kind: 'long-drive', drivingMinutes: 900, limitHours: 10 }]);
		expect(result.ride.nights).toBe(1);
	});

	it('stops asking once answered', () => {
		const result = score(familyAnswers({ longDrive: 'straight' }), longLookups());

		expect(result.questions).toEqual([]);
		expect(result.ride.straightThrough).toBe(true);
		expect(line(result, 'ride.hotel')?.on).toBe(false);
	});

	it('treats switching off the hotel line as driving straight through', () => {
		const result = score(familyAnswers(), longLookups(), {
			lines: { 'ride.hotel': { on: false } },
		});

		expect(result.questions).toEqual([]);
		expect(result.ride.straightThrough).toBe(true);
		expect(
			result.ride.comfortLines.some(
				(adjustment) => adjustment.id === 'ride.comfort.straightThrough',
			),
		).toBe(true);
	});

	it('assumes a hotel for a solo traveler, without asking', () => {
		const lookups = soloLookups();
		lookups.drive.minutes = 15 * 60;

		const result = score(soloAnswers(), lookups);

		expect(result.questions).toEqual([]);
		expect(line(result, 'ride.hotel')?.on).toBe(true);
	});
});

describe('score: too close to fly', () => {
	it('returns Ride, clearly, with no Fly side', () => {
		const result = score(soloAnswers(), soloLookups({ flight: null }));

		expect(result.fly).toBeNull();
		expect(result.verdict).toBe('ride');
		expect(result.confidence).toBe('clear');
	});
});

describe('notes', () => {
	it('mentions the winter pass on the family drive', () => {
		const result = score(familyAnswers(), familyLookups());

		expect(result.notes.map((note) => note.id)).toContain('winter');
	});

	it('says nothing about traffic when drive times have none', () => {
		const lookups = soloLookups();
		delete lookups.drive.minutesWithoutTraffic;

		expect(score(soloAnswers(), lookups).notes.map((note) => note.id)).not.toContain('traffic');
	});

	it('mentions heavy traffic, once drive times include it', () => {
		const lookups = soloLookups();
		lookups.drive.minutesWithoutTraffic = 340;

		expect(score(soloAnswers(), lookups).notes[0]?.text).toBe(
			'Traffic adds about 50m to the drive on this day.',
		);
	});

	it('shows at most two', () => {
		const result = score(familyAnswers({ pets: 1 }), familyLookups());

		expect(result.notes.length).toBeLessThanOrEqual(2);
	});
});

describe('verdict helpers', () => {
	it('sorts the overall lean into toss-up, leans, and clear', () => {
		expect(confidenceOf(0.04)).toBe('toss-up');
		expect(confidenceOf(-0.1)).toBe('leans');
		expect(confidenceOf(0.2)).toBe('clear');
	});

	it('calls small category leans Even', () => {
		expect(winnerOf(0.03)).toBe('even');
		expect(winnerOf(-0.05)).toBe('fly');
	});
});
