/*
 * The Ride side: every cost and time line for driving, door to door.
 */

import { type DrivePlan, mealsBetween, planDrive } from './clock';
import { monthOf } from './dates';
import { DRIVE, FOOD, START_TIME } from './defaults';
import { mealCost } from './food';
import { formatMiles, formatMoney } from './format';
import { routeGasPrice } from './gas';
import { type DraftLine, draftLine, type LineSpec } from './lines';
import type { Settings } from './settings';
import type { Answers, Lookups } from './types';
import type { Hours, Minutes } from './units';

export interface RideDraft {
	lines: DraftLine[];
	plan: DrivePlan;
	drivingMinutes: Minutes;
	nights: number;
	straightThrough: boolean;

	/** Whether the drive passes the daily limit, so the hotel question applies. */
	overLimit: boolean;
}

/** Nights on the road: the driving hours ÷ the daily limit, rounded up, minus one. */
export function hotelNights(drivingMinutes: Minutes, maxDrivingHours: Hours): number {
	return Math.max(0, Math.ceil(drivingMinutes / 60 / maxDrivingHours) - 1);
}

export function buildRide(answers: Answers, lookups: Lookups, settings: Settings): RideDraft {
	const { drive } = lookups;
	const travelers = answers.adults + answers.children;
	const lines: LineSpec[] = [];

	// --- How the drive is laid out ---

	const overLimit = drive.minutes > settings.maxDrivingHours * 60;
	const neededNights = hotelNights(drive.minutes, settings.maxDrivingHours);
	const straightThrough = neededNights > 0 && !settings.hotel;
	const nights = straightThrough ? 0 : neededNights;

	const restInterval =
		answers.children > 0 ? DRIVE.restIntervalWithChildrenMinutes : DRIVE.restIntervalMinutes;

	const plan = planDrive({
		drivingMinutes: drive.minutes,
		days: nights + 1,
		restIntervalMinutes: restInterval,
		restStopMinutes: DRIVE.restStopMinutes,
		mealStopMinutes: DRIVE.mealStopMinutes,
		date: answers.date,
		midpoint: drive.midpoint,
		utcOffsetMinutes: lookups.utcOffsetMinutes,
	});

	// --- The car ---

	const gasPrice = settings.gasPrice ?? routeGasPrice(lookups);
	const cars = Math.ceil(travelers / DRIVE.travelersPerCar);
	const miles = formatMiles(drive.miles);

	let carCost = 0;

	if (answers.car.kind === 'own') {
		const mpg = settings.mpg ?? answers.car.mpg;
		const fuel = (drive.miles / mpg) * gasPrice;
		const wear = drive.miles * DRIVE.wearPerMile;

		lines.push(
			{
				id: 'ride.fuel',
				kind: 'cost',
				label: `Fuel · ${miles} at ${mpg} mpg, ${formatMoney(gasPrice)} a gallon`,
				amount: fuel,
				from: lookups.gas,
			},
			{ id: 'ride.wear', kind: 'cost', label: 'Wear (tires, maintenance)', amount: wear },
			{
				id: 'ride.depreciation',
				kind: 'cost',
				label: 'Depreciation',
				amount: drive.miles * DRIVE.depreciationPerMile,
				on: false,
			},
		);

		carCost = fuel + wear;
	} else {
		const days = nights + 1;
		const rental = lookups.rental.start * DRIVE.rentalTaxesAndFees * days;
		const fuel = (drive.miles / DRIVE.rentalMpg) * gasPrice;

		lines.push(
			{
				id: 'ride.rental',
				kind: 'cost',
				label: `Rental car · ${days} ${days === 1 ? 'day' : 'days'}, with taxes and fees`,
				amount: rental,
			},
			{ id: 'ride.dropFee', kind: 'cost', label: 'One-way drop fee', amount: DRIVE.oneWayDropFee },
			{
				id: 'ride.fuel',
				kind: 'cost',
				label: `Fuel · ${miles} at ${DRIVE.rentalMpg} mpg, ${formatMoney(gasPrice)} a gallon`,
				amount: fuel,
				from: lookups.gas,
			},
		);

		carCost = rental + DRIVE.oneWayDropFee + fuel;
	}

	// More than five travelers need a second car. It's its own line, so a
	// family with a minivan can switch it off.
	if (cars > 1) {
		lines.push({
			id: 'ride.secondCar',
			kind: 'cost',
			label: cars === 2 ? 'A second car' : `${cars - 1} more cars`,
			amount: carCost * (cars - 1),
		});
	}

	lines.push({
		id: 'ride.tolls',
		kind: 'cost',
		label: 'Tolls · add yours if your route has them. Paying by plate usually costs more.',
		amount: 0,
		empty: true,
	});

	// --- Hotels and food ---

	if (neededNights > 0) {
		const lodging =
			lookups.perDiem.overnight?.lodging ??
			(lookups.perDiem.start.lodging + lookups.perDiem.destination.lodging) / 2;

		const rooms = Math.ceil(travelers / DRIVE.travelersPerRoom);

		lines.push({
			id: 'ride.hotel',
			kind: 'cost',
			label: `Hotel stops · ${neededNights} ${neededNights === 1 ? 'night' : 'nights'}, ${rooms} ${rooms === 1 ? 'room' : 'rooms'}`,
			amount: neededNights * rooms * lodging,
			on: !straightThrough,
		});
	}

	const meals = mealsBetween(START_TIME, plan.arrival);
	const travelDays = Math.floor(plan.arrival / (24 * 60)) + 1;

	lines.push({
		id: 'ride.food',
		kind: 'cost',
		label: `Meals and snacks · ${meals} ${meals === 1 ? 'meal' : 'meals'} on the road`,
		amount: meals * mealCost(answers, lookups) + FOOD.snacksPerPerson * travelers * travelDays,
	});

	// --- Time ---

	lines.push({
		id: 'ride.driving',
		kind: 'time',
		label: `Driving · ${miles}`,
		amount: drive.minutes,
		from: drive,
	});

	if (plan.restStops > 0) {
		lines.push({
			id: 'ride.restStops',
			kind: 'time',
			label: `Rest and fuel stops · ${plan.restStops}`,
			amount: plan.restStops * DRIVE.restStopMinutes,
		});
	}

	if (plan.mealStops > 0) {
		lines.push({
			id: 'ride.mealStops',
			kind: 'time',
			label: `Meal stops · ${plan.mealStops}`,
			amount: plan.mealStops * DRIVE.mealStopMinutes,
		});
	}

	const winterDelay = winterDelayMinutes(answers, lookups);

	if (winterDelay > 0) {
		lines.push({
			id: 'ride.winterDelay',
			kind: 'time',
			label: `Expected winter weather delay · ${drive.winterPasses.join(', ')}`,
			amount: winterDelay,
		});
	}

	if (nights > 0) {
		lines.push({
			id: 'ride.hotelNights',
			kind: 'time',
			label: 'Getting off the road and checking in and out',
			amount: nights * DRIVE.hotelOverheadMinutes,
		});
	}

	return {
		lines: lines.map((spec) => draftLine('ride', spec)),
		plan,
		drivingMinutes: drive.minutes,
		nights,
		straightThrough,
		overLimit,
	};
}

/**
 * Thirty minutes for each listed winter pass crossed from November through
 * March, up to an hour. It's an average, not a scheduled stop, so it isn't
 * placed on the clock.
 */
function winterDelayMinutes(answers: Answers, lookups: Lookups): Minutes {
	if (!DRIVE.winterMonths.includes(monthOf(answers.date))) {
		return 0;
	}

	return Math.min(
		lookups.drive.winterPasses.length * DRIVE.winterDelayPerPassMinutes,
		DRIVE.winterDelayMaxMinutes,
	);
}
