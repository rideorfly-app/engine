import { describe, expect, it } from 'vitest';
import { type DrivePlanOptions, mealsBetween, planDrive } from '../src/clock';

const clock = (hours: number, minutes = 0) => hours * 60 + minutes;

const family: DrivePlanOptions = {
	drivingMinutes: 490,
	days: 1,
	restIntervalMinutes: 120,
	restStopMinutes: 15,
	mealStopMinutes: 30,
	date: '2026-12-18',
	midpoint: { lat: 41.59, lon: -109.2 },
};

describe('planDrive', () => {
	it('places rest stops and lunch on a one-day drive', () => {
		const plan = planDrive(family);

		// 8:00 → rest at 10:00 → lunch at noon → rests at 2:30 and 4:45 → arrive 5:25.
		expect(plan.restStops).toBe(3);
		expect(plan.mealStops).toBe(1);
		expect(plan.arrival).toBe(clock(17, 25));
	});

	it('counts the driving after a December sunset', () => {
		const plan = planDrive(family);

		// On the fixed clock (the sun's own, at longitude 0) sunset at this latitude is
		// about 4:47 p.m., so the last 38 minutes of the 5:25 arrival are in the dark.
		// A Mountain Time wall clock at Rock Springs would put sunset about 17 minutes
		// later, because the town sits west of its zone's middle: the cost of having
		// no time zones.
		expect(plan.nightMinutes).toBeGreaterThan(33);
		expect(plan.nightMinutes).toBeLessThan(43);
	});

	it('puts the dark an hour later on the clock in daylight saving season', () => {
		// The last standard-time day and the first daylight-saving day have almost the
		// same sun, so the same long drive spends about an hour less in the dark.
		// No stops, so the minutes in the dark are just the minutes after sunset.
		const long = { ...family, drivingMinutes: 720, restStopMinutes: 0, mealStopMinutes: 0 };
		const standard = planDrive({ ...long, date: '2026-03-07' }).nightMinutes;
		const daylight = planDrive({ ...long, date: '2026-03-08' }).nightMinutes;

		expect(standard - daylight).toBeGreaterThan(55);
		expect(standard - daylight).toBeLessThan(65);
	});

	it('stops less often without children', () => {
		const plan = planDrive({ ...family, drivingMinutes: 390, restIntervalMinutes: 150 });

		expect(plan.restStops).toBe(2);
		expect(plan.mealStops).toBe(1);
		expect(plan.nightMinutes).toBe(0);
	});

	it('splits a long drive evenly across days, each starting at 8:00', () => {
		const plan = planDrive({ ...family, drivingMinutes: 1320, days: 3 });

		expect(plan.days).toHaveLength(3);
		expect(plan.days.map((day) => day.drivingMinutes)).toEqual([440, 440, 440]);
		expect(plan.days[1]?.start).toBe(24 * 60 + clock(8));
	});

	it('keeps a straight-through drive going past midnight', () => {
		const plan = planDrive({ ...family, drivingMinutes: 1320, days: 1 });

		// Lunch, dinner, and the next morning's breakfast all come due on the road.
		expect(plan.mealStops).toBe(3);
		expect(plan.arrival).toBeGreaterThan(24 * 60);
		expect(plan.nightMinutes).toBeGreaterThan(600);
	});
});

describe('mealsBetween', () => {
	it('counts lunch on a trip that spans noon', () => {
		expect(mealsBetween(clock(8), clock(17, 25))).toBe(1);
	});

	it('skips the first day’s breakfast, eaten at home', () => {
		expect(mealsBetween(clock(8), clock(11))).toBe(0);
	});

	it('counts dinner and breakfast around a hotel night', () => {
		// Day one 8:00 a.m. to day two 4:00 p.m.: lunch, dinner, breakfast, lunch.
		expect(mealsBetween(clock(8), 24 * 60 + clock(16))).toBe(4);
	});
});
