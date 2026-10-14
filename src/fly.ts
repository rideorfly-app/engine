/*
 * The Fly side: every cost and time line for flying, door to door, from
 * leaving home to reaching the destination's door.
 */

import { mealsBetween } from './clock';
import { DRIVE, FLY, FOOD, START_TIME } from './defaults';
import { mealCost } from './food';
import { formatMoney } from './format';
import { stateGasPrice } from './gas';
import { straightLineMiles } from './geo';
import { type DraftLine, draftLine, type LineSpec, totalOf } from './lines';
import type { Settings } from './settings';
import type { Answers, FlightLookups, GroundLeg, Lookups } from './types';
import type { ClockMinutes, Dollars, Minutes } from './units';

export interface FlyDraft {
	lines: DraftLine[];
	connections: number;
	arrival: ClockMinutes;

	/** For comfort: the reliability figures the flight was scored with. */
	delayChance: number;
	cancelChance: number;
}

export function buildFly(
	answers: Answers,
	lookups: Lookups,
	flight: FlightLookups,
	settings: Settings,
): FlyDraft {
	const travelers = answers.adults + answers.children;
	const { origin, destination } = flight;
	const lines: LineSpec[] = [];

	// --- The flight ---

	// If DOT lists a scheduled nonstop, one exists. Otherwise assume a connection.
	const connections = flight.fare?.stops ?? (flight.schedule ? 0 : 1);
	const airMiles = straightLineMiles(origin, destination);
	const reliability = flight.reliability ?? FLY.fallbackReliability;

	if (flight.fare) {
		lines.push({
			id: 'fly.fares',
			kind: 'cost',
			label: `Fares · ${travelers} × ${formatMoney(flight.fare.perPerson)}`,
			amount: flight.fare.perPerson * travelers,
			from: flight.fare,
		});
	} else {
		const perPerson = estimatedFare(airMiles, connections);

		lines.push({
			id: 'fly.fares',
			kind: 'cost',
			label: `Fares · ${travelers} × ${formatMoney(perPerson)}, estimated (no recent fare found)`,
			amount: perPerson * travelers,
		});
	}

	if (answers.checkedBags > 0) {
		lines.push({
			id: 'fly.bags',
			kind: 'cost',
			label: `Checked bags · ${answers.checkedBags}`,
			amount: answers.checkedBags * FLY.checkedBagFee,
		});
	}

	if (answers.pets > 0) {
		lines.push({
			id: 'fly.pets',
			kind: 'cost',
			label: answers.pets === 1 ? 'A pet in the cabin' : `${answers.pets} pets in the cabin`,
			amount: answers.pets * FLY.petFee,
		});
	}

	// --- Getting to the departure airport ---

	const toAirport = answers.toAirport;
	const startGas = stateGasPrice(lookups, answers.from.state);

	switch (toAirport.mode) {
		case 'park': {
			const perDay = origin.parkingPerDay ?? FLY.parkingPerDay[origin.size];
			const mpg = answers.car.kind === 'own' ? (settings.mpg ?? answers.car.mpg) : FLY.otherCarMpg;
			const days = toAirport.daysParked;

			lines.push(
				{
					id: 'fly.parking',
					kind: 'cost',
					label: `Parking at ${origin.code} · ${days} ${days === 1 ? 'day' : 'days'} at ${formatMoney(perDay)}`,
					amount: perDay * days,
				},
				{
					id: 'fly.fuelToAirport',
					kind: 'cost',
					label: `Fuel to ${origin.code}`,
					amount: (flight.toOrigin.miles / mpg) * startGas,
				},
				drivingTime('fly.timeToAirport', `To ${origin.code}`, flight.toOrigin),
				{
					id: 'fly.shuttle',
					kind: 'time',
					label: 'Parking shuttle',
					amount: FLY.parkingShuttleMinutes,
				},
			);
			break;
		}

		case 'dropoff':
			lines.push(
				{
					id: 'fly.fuelToAirport',
					kind: 'cost',
					label: `Dropped off at ${origin.code} · the driver's fuel, there and back`,
					amount: ((flight.toOrigin.miles * 2) / FLY.otherCarMpg) * startGas,
				},
				drivingTime('fly.timeToAirport', `To ${origin.code}`, flight.toOrigin),
			);
			break;

		case 'rideshare':
			lines.push(
				{
					id: 'fly.rideToAirport',
					kind: 'cost',
					label: `Rideshare to ${origin.code}`,
					amount: rideshareCost(flight.toOrigin, travelers),
				},
				drivingTime('fly.timeToAirport', `Rideshare to ${origin.code}`, flight.toOrigin),
			);
			break;

		case 'transit':
			lines.push(
				{
					id: 'fly.transitToAirport',
					kind: 'cost',
					label: `Transit to ${origin.code}`,
					amount: FLY.transit.farePerPerson * travelers,
				},
				transitTime('fly.timeToAirport', `Transit to ${origin.code}`, flight.toOrigin),
			);
			break;
	}

	// --- At the airports and in the air ---

	const buffer =
		settings.arrivalBufferMinutes ??
		FLY.arrivalBufferMinutes[origin.size] +
			(answers.checkedBags > 0 ? FLY.checkedBagExtraMinutes : 0);

	lines.push(
		{
			id: 'fly.buffer',
			kind: 'time',
			label: `Arrive early at ${origin.code}: check-in, security, boarding`,
			amount: buffer,
		},
		flightTime(flight, airMiles, connections),
		{
			id: 'fly.delay',
			kind: 'time',
			label: connections > 0 ? 'Expected delay, both flights' : 'Expected delay',
			amount: reliability.averageDelayMinutes * (connections + 1),
			...(flight.reliability ? { from: flight.reliability } : {}),
		},
		{ id: 'fly.offPlane', kind: 'time', label: 'Off the plane', amount: FLY.offPlaneMinutes },
	);

	if (answers.checkedBags > 0) {
		lines.push({
			id: 'fly.baggageClaim',
			kind: 'time',
			label: 'Baggage claim',
			amount: FLY.baggageClaimMinutes,
		});
	}

	// --- From the arrival airport to the door ---

	const endGas = stateGasPrice(lookups, answers.to.state);

	switch (answers.fromAirport) {
		case 'rental': {
			const cars = Math.ceil(travelers / DRIVE.travelersPerCar);

			lines.push(
				{
					id: 'fly.fromAirport',
					kind: 'cost',
					label: `Rental car at ${destination.code} · one day, with taxes and fees`,
					amount: lookups.rental.destination * DRIVE.rentalTaxesAndFees * cars,
				},
				{
					id: 'fly.rentalCounter',
					kind: 'time',
					label: 'Rental counter',
					amount: FLY.rentalCounterMinutes,
				},
				drivingTime(
					'fly.timeFromAirport',
					`${destination.code} to the door`,
					flight.fromDestination,
				),
			);
			break;
		}

		case 'rideshare':
			lines.push(
				{
					id: 'fly.fromAirport',
					kind: 'cost',
					label: `Rideshare from ${destination.code}`,
					amount: rideshareCost(flight.fromDestination, travelers),
				},
				drivingTime(
					'fly.timeFromAirport',
					`${destination.code} to the door`,
					flight.fromDestination,
				),
			);
			break;

		case 'pickup':
			lines.push(
				{
					id: 'fly.fromAirport',
					kind: 'cost',
					label: `Picked up at ${destination.code} · the driver's fuel, there and back`,
					amount: ((flight.fromDestination.miles * 2) / FLY.otherCarMpg) * endGas,
				},
				drivingTime(
					'fly.timeFromAirport',
					`${destination.code} to the door`,
					flight.fromDestination,
				),
			);
			break;

		case 'transit':
			lines.push(
				{
					id: 'fly.fromAirport',
					kind: 'cost',
					label: `Transit from ${destination.code}`,
					amount: FLY.transit.farePerPerson * travelers,
				},
				transitTime(
					'fly.timeFromAirport',
					`Transit from ${destination.code}`,
					flight.fromDestination,
				),
			);
			break;
	}

	// --- Food, once the day's length is known ---

	const timeSoFar = totalOf(
		lines.map((spec) => draftLine('fly', spec)),
		'time',
	);
	const arrival = START_TIME + timeSoFar;
	const meals = mealsBetween(START_TIME, arrival);

	lines.push({
		id: 'fly.food',
		kind: 'cost',
		label:
			meals === 0
				? 'Snacks and drinks at the airport'
				: `Airport food · ${meals} ${meals === 1 ? 'meal' : 'meals'}, plus snacks`,
		amount:
			meals * mealCost(answers, lookups) * FOOD.airportMarkup + FOOD.snacksPerPerson * travelers,
	});

	return {
		lines: lines.map((spec) => draftLine('fly', spec)),
		connections,
		arrival,
		delayChance: reliability.delayChance,
		cancelChance: reliability.cancelChance,
	};
}

/** With no cached fare: the larger of a floor or a per-mile estimate, more with a connection. */
export function estimatedFare(airMiles: number, connections: number): Dollars {
	const { minimum, base, perMile, connectionFactor } = FLY.fallbackFare;
	const fare = Math.max(minimum, base + perMile * airMiles);

	return connections > 0 ? fare * connectionFactor : fare;
}

/** A rideshare, per car of four: a base fare, per mile, and per minute, plus tip and fees. */
export function rideshareCost(leg: GroundLeg, travelers: number): Dollars {
	const { base, perMile, perMinute, tipAndFees, ridersPerCar } = FLY.rideshare;
	const cars = Math.ceil(travelers / ridersPerCar);

	return cars * (base + perMile * leg.miles + perMinute * leg.minutes) * tipAndFees;
}

function drivingTime(id: string, label: string, leg: GroundLeg): LineSpec {
	return { id, kind: 'time', label, amount: leg.minutes, from: leg };
}

/** Transit takes about twice as long as driving the same leg, plus the wait. */
function transitTime(id: string, label: string, leg: GroundLeg): LineSpec {
	return {
		id,
		kind: 'time',
		label,
		amount: leg.minutes * FLY.transit.timeFactor + FLY.transit.waitMinutes,
	};
}

/**
 * Gate to gate: the cached fare's duration when it has one, then DOT's
 * scheduled nonstop time, then an estimate from the distance.
 */
function flightTime(flight: FlightLookups, airMiles: number, connections: number): LineSpec {
	const label =
		connections === 0
			? `Nonstop flight, ${flight.origin.code} to ${flight.destination.code}`
			: `Flights via ${connections === 1 ? 'a connection' : `${connections} connections`}`;

	if (flight.fare?.minutes !== undefined) {
		return {
			id: 'fly.flights',
			kind: 'time',
			label,
			amount: flight.fare.minutes,
			from: flight.fare,
		};
	}

	if (connections === 0 && flight.schedule) {
		return {
			id: 'fly.flights',
			kind: 'time',
			label,
			amount: flight.schedule.minutes,
			from: flight.schedule,
		};
	}

	const distance = connections > 0 ? airMiles * FLY.connectingDistanceFactor : airMiles;
	const amount: Minutes =
		(connections + 1) * FLY.perFlightOverheadMinutes +
		(distance / FLY.cruiseMph) * 60 +
		connections * FLY.layoverMinutes;

	return { id: 'fly.flights', kind: 'time', label, amount };
}
