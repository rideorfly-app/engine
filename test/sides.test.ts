import { describe, expect, it } from 'vitest';
import { buildFly, estimatedFare, rideshareCost } from '../src/fly';
import { totalOf } from '../src/lines';
import { buildRide, hotelNights } from '../src/ride';
import type { Settings } from '../src/settings';
import type { FlightLookups } from '../src/types';
import { familyAnswers, familyLookups, soloAnswers, soloLookups } from './fixtures';

const settings: Settings = { maxDrivingHours: 10, hotel: true };

/** A line's value by id, or undefined if the side has no such line. */
const lineValue = (lines: Array<{ id: string; value: number }>, id: string) =>
	lines.find((line) => line.id === id)?.value;

describe('hotelNights', () => {
	it('is driving hours over the limit, rounded up, minus one', () => {
		expect(hotelNights(22 * 60, 10)).toBe(2);
		expect(hotelNights(15 * 60, 10)).toBe(1);
		expect(hotelNights(10 * 60, 10)).toBe(0);
		expect(hotelNights(8 * 60, 10)).toBe(0);
	});
});

describe('buildRide', () => {
	it('prices the family drive', () => {
		const ride = buildRide(familyAnswers(), familyLookups(), settings);

		// 540 mi ÷ 27 mpg × $3.10 = $62, rounded to $60.
		expect(lineValue(ride.lines, 'ride.fuel')).toBe(60);
		expect(lineValue(ride.lines, 'ride.wear')).toBe(55);

		// One lunch: $19 × (2 adults + 2 children at two-thirds), plus $20 of snacks.
		expect(lineValue(ride.lines, 'ride.food')).toBe(85);

		expect(totalOf(ride.lines, 'cost')).toBe(200);
	});

	it('shows depreciation without counting it', () => {
		const ride = buildRide(familyAnswers(), familyLookups(), settings);
		const depreciation = ride.lines.find((line) => line.id === 'ride.depreciation');

		expect(depreciation?.value).toBe(80);
		expect(depreciation?.on).toBe(false);
	});

	it('shows an empty Tolls line', () => {
		const tolls = buildRide(familyAnswers(), familyLookups(), settings).lines.find(
			(line) => line.id === 'ride.tolls',
		);

		expect(tolls).toMatchObject({ value: 0, empty: true, on: true });
	});

	it('adds stops and a winter delay in December', () => {
		const ride = buildRide(familyAnswers(), familyLookups(), settings);

		expect(lineValue(ride.lines, 'ride.driving')).toBe(490);
		expect(lineValue(ride.lines, 'ride.restStops')).toBe(45);
		expect(lineValue(ride.lines, 'ride.mealStops')).toBe(30);
		expect(lineValue(ride.lines, 'ride.winterDelay')).toBe(30);
		expect(totalOf(ride.lines, 'time')).toBe(595);
	});

	it('drops the winter delay in summer', () => {
		const ride = buildRide(familyAnswers({ date: '2026-07-10' }), familyLookups(), settings);

		expect(lineValue(ride.lines, 'ride.winterDelay')).toBeUndefined();
	});

	it('adds hotel nights to a long drive', () => {
		const lookups = familyLookups();
		lookups.drive.minutes = 22 * 60;

		const ride = buildRide(familyAnswers(), lookups, settings);

		expect(ride.nights).toBe(2);
		expect(ride.plan.days).toHaveLength(3);

		// Two nights, one room for four, at $110.
		expect(lineValue(ride.lines, 'ride.hotel')).toBe(220);
		expect(lineValue(ride.lines, 'ride.hotelNights')).toBe(120);
	});

	it('keeps the hotel line, switched off, when driving straight through', () => {
		const lookups = familyLookups();
		lookups.drive.minutes = 15 * 60;

		const ride = buildRide(familyAnswers(), lookups, { ...settings, hotel: false });
		const hotel = ride.lines.find((line) => line.id === 'ride.hotel');

		expect(ride.straightThrough).toBe(true);
		expect(hotel?.on).toBe(false);
		expect(hotel?.value).toBe(110);
		expect(lineValue(ride.lines, 'ride.hotelNights')).toBeUndefined();
	});

	it('prices a rental with its drop fee', () => {
		const ride = buildRide(familyAnswers({ car: { kind: 'rental' } }), familyLookups(), settings);

		// $55 a day × 1.22.
		expect(lineValue(ride.lines, 'ride.rental')).toBe(65);
		expect(lineValue(ride.lines, 'ride.dropFee')).toBe(150);
		expect(lineValue(ride.lines, 'ride.wear')).toBeUndefined();
	});

	it('charges a rental for each 24 hours on the road, even straight through', () => {
		const answers = familyAnswers({ car: { kind: 'rental' } });
		const lookups = familyLookups();
		const straight = { ...settings, hotel: false };

		// 15 hours of driving plus stops ends before 8:00 the next morning: one day.
		lookups.drive.minutes = 15 * 60;
		expect(lineValue(buildRide(answers, lookups, straight).lines, 'ride.rental')).toBe(65);

		// 22 hours plus stops runs past it: two days, $55 × 1.22 × 2.
		lookups.drive.minutes = 22 * 60;
		expect(lineValue(buildRide(answers, lookups, straight).lines, 'ride.rental')).toBe(135);

		// With hotels, the same drive takes three days.
		expect(lineValue(buildRide(answers, lookups, settings).lines, 'ride.rental')).toBe(200);
	});

	it('adds a second car above five travelers', () => {
		const ride = buildRide(familyAnswers({ adults: 4, children: 2 }), familyLookups(), settings);

		// The second car's fuel and wear: $62 + $54.
		expect(lineValue(ride.lines, 'ride.secondCar')).toBe(115);
	});

	it('uses the user’s gas price and mpg', () => {
		const ride = buildRide(familyAnswers(), familyLookups(), {
			...settings,
			gasPrice: 4,
			mpg: 40,
		});

		// 540 ÷ 40 × $4 = $54.
		expect(lineValue(ride.lines, 'ride.fuel')).toBe(55);
	});
});

describe('buildFly', () => {
	const familyFlight = () => familyLookups().flight as FlightLookups;

	it('prices the family flight', () => {
		const fly = buildFly(familyAnswers(), familyLookups(), familyFlight(), settings);

		expect(lineValue(fly.lines, 'fly.fares')).toBe(515);
		expect(lineValue(fly.lines, 'fly.bags')).toBe(70);

		// The default rate for a large hub: 6 days × $15.
		expect(lineValue(fly.lines, 'fly.parking')).toBe(90);

		// 25 miles ÷ 27 mpg × $3.10.
		expect(lineValue(fly.lines, 'fly.fuelToAirport')).toBe(5);

		// The friend's 44-mile round trip.
		expect(lineValue(fly.lines, 'fly.fromAirport')).toBe(5);
	});

	it('uses the airport’s own parking rate when it has one', () => {
		const flight = familyFlight();
		flight.origin.parkingPerDay = 10;

		const fly = buildFly(familyAnswers(), familyLookups(), flight, settings);

		expect(lineValue(fly.lines, 'fly.parking')).toBe(60);
	});

	it('lays out the family’s day', () => {
		const fly = buildFly(familyAnswers(), familyLookups(), familyFlight(), settings);

		expect(lineValue(fly.lines, 'fly.timeToAirport')).toBe(35);
		expect(lineValue(fly.lines, 'fly.shuttle')).toBe(15);

		// A large hub, plus time to check bags.
		expect(lineValue(fly.lines, 'fly.buffer')).toBe(120);
		expect(lineValue(fly.lines, 'fly.flights')).toBe(95);
		expect(lineValue(fly.lines, 'fly.delay')).toBe(15);
		expect(lineValue(fly.lines, 'fly.baggageClaim')).toBe(20);
		expect(totalOf(fly.lines, 'time')).toBe(345);
	});

	it('counts lunch at the airport, at airport prices', () => {
		const fly = buildFly(familyAnswers(), familyLookups(), familyFlight(), settings);

		// Arriving at 1:45 p.m. spans lunch: $63.33 × 1.25, plus $20 of snacks.
		expect(fly.arrival).toBe(13 * 60 + 45);
		expect(lineValue(fly.lines, 'fly.food')).toBe(100);
	});

	it('estimates a fare when none was found', () => {
		const flight = familyFlight();
		flight.fare = null;

		const fly = buildFly(familyAnswers(), familyLookups(), flight, settings);
		const fares = fly.lines.find((line) => line.id === 'fly.fares');

		expect(fares?.source).toBe('estimate');
		expect(fares?.label).toContain('estimated');
	});

	it('assumes a connection when DOT lists no nonstop', () => {
		const flight = familyFlight();
		flight.schedule = null;
		flight.fare = { source: 'Travelpayouts', asOf: '2026-10-10', perPerson: 129 };

		const fly = buildFly(familyAnswers(), familyLookups(), flight, settings);

		expect(fly.connections).toBe(1);

		// Two flights' overhead, about 450 flown miles at 450 mph, and a layover: 60 + 60 + 90.
		expect(lineValue(fly.lines, 'fly.flights')).toBe(210);
		expect(lineValue(fly.lines, 'fly.delay')).toBe(30);
	});

	it('takes an early-arriving route’s time off the flight, not as a negative delay', () => {
		const flight = familyFlight();
		flight.reliability = {
			source: 'DOT',
			asOf: '2026-07-31',
			averageDelayMinutes: -4,
			delayChance: 0.12,
			disruptChance: 0.03,
		};

		const fly = buildFly(familyAnswers(), familyLookups(), flight, settings);

		// 95 scheduled minutes, landing 4 early: 91, rounded to 90.
		expect(lineValue(fly.lines, 'fly.flights')).toBe(90);
		expect(lineValue(fly.lines, 'fly.delay')).toBe(0);
	});

	it('prices the solo trip’s rideshare and transit', () => {
		const lookups = soloLookups();
		const fly = buildFly(soloAnswers(), lookups, lookups.flight as FlightLookups, settings);

		// ($2.50 + 13 mi × $1.20 + 40 min × $0.30) × 1.2 = $36.12.
		expect(lineValue(fly.lines, 'fly.rideToAirport')).toBe(35);
		expect(lineValue(fly.lines, 'fly.fromAirport')).toBe(5);

		// Twice the 20-minute drive, plus 15.
		expect(lineValue(fly.lines, 'fly.timeFromAirport')).toBe(55);
	});
});

describe('helpers', () => {
	it('estimates fares from distance, with a floor', () => {
		expect(estimatedFare(100, 0)).toBe(89);
		expect(estimatedFare(1000, 0)).toBe(185);
		expect(estimatedFare(1000, 1)).toBeCloseTo(212.75);
	});

	it('prices one rideshare per four riders', () => {
		const leg = { source: 'Google Maps', asOf: '2026-10-14', miles: 10, minutes: 20 };

		expect(rideshareCost(leg, 4)).toBeCloseTo(24.6);
		expect(rideshareCost(leg, 5)).toBeCloseTo(49.2);
	});
});
