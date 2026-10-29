import { describe, expect, it } from 'vitest';
import { score } from '../src/score';
import { checkTake } from '../src/take/check';
import { figuresFor } from '../src/take/figures';
import { fillTake, fillText } from '../src/take/fill';
import { buildTakeInput } from '../src/take/input';
import { TAKE_PROMPT_VERSION } from '../src/take/prompt';
import { writtenFromNumbers } from '../src/take/summary';
import type { Take } from '../src/take/types';
import { familyAnswers, familyLookups, soloAnswers, soloLookups } from './fixtures';

const answers = familyAnswers();
const lookups = familyLookups();
const result = score(answers, lookups);
const figures = figuresFor(answers, lookups, result);
const context = { figures, numbersVerdict: result.verdict };

const goodTake: Take = {
	verdict: 'fly',
	confidence: 'leans',
	summary:
		'Driving saves {cost_diff}, but {ride_drive_time} at the wheel with two kids is a lot. Flying gets everyone there by lunch.',
	reasons: ['{time_diff} faster door to door', 'A long day in the car with kids'],
	worth_considering: ['Winter weather on the pass could make the drive longer'],
	differs_from_numbers:
		'The numbers favor driving by {cost_diff}; we weighed the long day more heavily.',
	changes_assessment: null,
	share_summary: 'Flying wins this one for the family. The drive is long with kids in winter.',
};

describe('figuresFor', () => {
	it('formats each figure the way the page does', () => {
		const values = Object.fromEntries(figures.map((figure) => [figure.name, figure.value]));

		expect(values).toMatchObject({
			ride_cost: '$200',
			fly_cost: '$785',
			cost_diff: '$585',
			time_diff: '4h 10m',
			ride_drive_time: '8h 10m',
			ride_miles: '540 miles',
			fare_per_person: '$129',
			ride_cost_per_person: '$50',
			cost_diff_per_person: '$145',
		});
	});

	it('leaves out figures that don’t apply', () => {
		const names = figures.map((figure) => figure.name);

		expect(names).not.toContain('hotel_nights');
		expect(names).not.toContain('ride_drive_days');
	});
});

describe('checkTake', () => {
	it('passes a good take', () => {
		expect(checkTake(goodTake, context)).toEqual({ ok: true, take: goodTake });
	});

	it('fails a digit outside a placeholder', () => {
		const check = checkTake({ ...goodTake, reasons: ['Saves $380'] }, context);

		expect(check.ok).toBe(false);
	});

	it('fails an unknown placeholder', () => {
		const check = checkTake({ ...goodTake, reasons: ['{hotel_nights} on the road'] }, context);

		expect(check).toEqual({
			ok: false,
			problems: ['"reasons[0]" uses an unknown placeholder, {hotel_nights}.'],
		});
	});

	it.each([
		'Nine hours in the car is a lot.',
		'It saves a few hundred dollars.',
		'Flying is an hour quicker.',
		'A two-day drive with kids.',
		'About fifty miles of mountain road.',
	])('fails a spelled-out amount: "%s"', (reason) => {
		expect(checkTake({ ...goodTake, reasons: [reason] }, context).ok).toBe(false);
	});

	it.each([
		'A long day with two kids',
		'The four of you fit in one car',
		'A few hours in an airport',
	])('allows counts and vague words: "%s"', (reason) => {
		expect(checkTake({ ...goodTake, reasons: [reason] }, context).ok).toBe(true);
	});

	it('requires an explanation when the take differs from the numbers', () => {
		const check = checkTake({ ...goodTake, differs_from_numbers: null }, context);

		expect(check.ok).toBe(false);
	});

	it('requires a changes assessment on a re-evaluation', () => {
		expect(checkTake(goodTake, { ...context, reevaluation: true }).ok).toBe(false);
	});

	it('fails a share summary with a figure in it', () => {
		const check = checkTake(
			{ ...goodTake, share_summary: 'Flying saves {time_diff}. It wins.' },
			context,
		);

		expect(check.ok).toBe(false);
	});

	it('counts sentences', () => {
		const check = checkTake({ ...goodTake, summary: 'Fly.' }, context);

		expect(check).toMatchObject({ ok: false, problems: ['"summary" must be 2 to 4 sentences.'] });
	});

	it('rejects what isn’t a take at all', () => {
		expect(checkTake('Fly!', context).ok).toBe(false);
		expect(checkTake({ verdict: 'train' }, context).ok).toBe(false);
	});
});

describe('fillTake', () => {
	it('swaps placeholders for figures', () => {
		const filled = fillTake(goodTake, figures);

		expect(filled.summary).toBe(
			'Driving saves $585, but 8h 10m at the wheel with two kids is a lot. Flying gets everyone there by lunch.',
		);
		expect(filled.share_summary).toBe(goodTake.share_summary);
	});

	it('leaves an unknown placeholder alone', () => {
		expect(fillText('{nope}', figures)).toBe('{nope}');
	});
});

describe('writtenFromNumbers', () => {
	it.each([
		['the family trip', familyAnswers(), familyLookups()],
		['the solo trip', soloAnswers(), soloLookups()],
		['a trip too close to fly', soloAnswers(), soloLookups({ flight: null })],
	])('passes the same check as a take, for %s', (_name, tripAnswers, tripLookups) => {
		const tripResult = score(tripAnswers, tripLookups);
		const tripFigures = figuresFor(tripAnswers, tripLookups, tripResult);
		const summary = writtenFromNumbers(tripResult);

		expect(
			checkTake(summary, { figures: tripFigures, numbersVerdict: tripResult.verdict }),
		).toEqual({
			ok: true,
			take: summary,
		});
	});

	it('follows the numbers’ verdict', () => {
		const summary = writtenFromNumbers(result);

		expect(summary.verdict).toBe(result.verdict);
		expect(fillTake(summary, figures).summary).toContain(
			'Driving costs $585 less: $200 to drive, $785 to fly.',
		);
	});
});

describe('buildTakeInput', () => {
	const input = buildTakeInput(answers, lookups, result);

	it('names the prompt version and the matchup', () => {
		expect(input.prompt_version).toBe(TAKE_PROMPT_VERSION);
		expect(input.matchup).toMatchObject({
			from: 'Denver, CO',
			to: 'Sandy, UT',
			travel_preference: "Give me a good playlist and I'm fine",
			daily_driving_limit_hours: 10,
		});
	});

	it('sends figure names and meanings, not values', () => {
		expect(input.figures[0]).toEqual({ name: 'ride_cost', meaning: 'Total cost to drive' });
	});

	it('leaves out lines nobody has filled in', () => {
		expect(input.numbers.ride.lines.some((line) => line.label.startsWith('Tolls'))).toBe(false);
	});
});
