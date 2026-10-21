/*
 * Every assumption the engine makes when there's no data, in one place.
 *
 * These are estimates, and lines built from them are tagged "estimate" on the
 * page. Each one is a starting point, tuned against the benchmark trips and
 * real use. Changing any of them can move a result, so it's a new minor
 * version with a changelog entry.
 */

import type { AirportSize, Weights } from './types';
import type { Dollars, Minutes } from './units';

/** Both sides leave the door at 8:00 a.m., on the start's clock. */
export const START_TIME: Minutes = 8 * 60;

/** A meal counts when the traveler is still on the way at one of these times. */
export const MEAL_TIMES = {
	breakfast: 8 * 60,
	lunch: 12 * 60,
	dinner: 18 * 60,
} as const;

export const DRIVE = {
	/** Hours behind the wheel per day. Editable in the workbench. */
	maxDrivingHours: 10,

	/** A short stop for fuel and restrooms ... */
	restStopMinutes: 15,

	/** ... every 2.5 hours of driving ... */
	restIntervalMinutes: 150,

	/** ... or every 2 hours with children along. */
	restIntervalWithChildrenMinutes: 120,

	/** A quick-serve meal stop. */
	mealStopMinutes: 30,

	/** Getting off the road, checking in, and checking out, per hotel night. */
	hotelOverheadMinutes: 60,

	/** Expected weather delay for each listed winter pass the route crosses in season ... */
	winterDelayPerPassMinutes: 30,

	/** ... up to this much in all. */
	winterDelayMaxMinutes: 60,

	/** November through March. */
	winterMonths: [11, 12, 1, 2, 3] as readonly number[],

	/** Above this, the drive needs a second car. */
	travelersPerCar: 5,

	/** Hotel rooms are one per four travelers, rounded up. */
	travelersPerRoom: 4,

	/** Tires and maintenance, per mile, own car only (AAA's Your Driving Costs is the likely source). */
	wearPerMile: 0.1,

	/** Mileage-driven value loss, own car only. Shown, but off by default. */
	depreciationPerMile: 0.15,

	/** Taxes and fees on top of a rental's daily rate. */
	rentalTaxesAndFees: 1.22,

	/** Dropping a rental in another city, per car. */
	oneWayDropFee: 150 as Dollars,

	/** A typical rental's fuel economy. */
	rentalMpg: 30,
} as const;

export const FOOD = {
	/** Snacks and drinks, per person per travel day. */
	snacksPerPerson: 5 as Dollars,

	/** Airport meals cost more than roadside ones. */
	airportMarkup: 1.25,

	/** A child's meal, as a share of an adult's. */
	childShare: 2 / 3,
} as const;

export const FLY = {
	/** How early to arrive before departure, by airport size. */
	arrivalBufferMinutes: { large: 105, medium: 75, small: 60 } as Record<AirportSize, Minutes>,

	/** More time to check bags. */
	checkedBagExtraMinutes: 15,

	/** The shuttle from an airport parking lot. */
	parkingShuttleMinutes: 15,

	/** Getting off the plane and out of the gate area. */
	offPlaneMinutes: 15,
	baggageClaimMinutes: 20,
	rentalCounterMinutes: 30,

	/** Estimating a flight with no data: taxi, climb, and descent ... */
	perFlightOverheadMinutes: 30,

	/** ... plus cruising at about this speed ... */
	cruiseMph: 450,

	/** ... plus a layover per connection. */
	layoverMinutes: 90,

	/** A connection flies farther than the straight line. */
	connectingDistanceFactor: 1.15,

	/** Each checked bag, as most travelers' first bag. */
	checkedBagFee: 35 as Dollars,

	/** A pet in the cabin. */
	petFee: 125 as Dollars,

	/** Daily parking when the airport isn't in the parking table. */
	parkingPerDay: { large: 15, medium: 12, small: 8 } as Record<AirportSize, Dollars>,

	/** Fuel economy for a friend's car on a drop-off or pickup, or for parking when the drive is a rental. */
	otherCarMpg: 27,

	/** A rideshare: a base fare, per mile, and per minute, plus tip and fees, per car of four. */
	rideshare: {
		base: 2.5 as Dollars,
		perMile: 1.2 as Dollars,
		perMinute: 0.3 as Dollars,
		tipAndFees: 1.2,
		ridersPerCar: 4,
	},

	/** Transit: a fare per person, and twice the drive time plus a wait. */
	transit: {
		farePerPerson: 3 as Dollars,
		timeFactor: 2,
		waitMinutes: 15,
	},

	/** With no cached fare: the larger of a floor or a per-mile estimate, more with a connection. */
	fallbackFare: {
		minimum: 89 as Dollars,
		base: 65 as Dollars,
		perMile: 0.12 as Dollars,
		connectionFactor: 1.15,
	},

	/** With no DOT record for the pair, typical figures for a domestic flight. */
	fallbackReliability: {
		averageDelayMinutes: 15,
		delayChance: 0.2,
		disruptChance: 0.015,
	},
} as const;

/*
 * Comfort. Both sides start at 7 out of 10, and these named adjustments move
 * them. The user's travel preference is the only way experiences count.
 */
export const COMFORT = {
	start: 7,

	/** The preference slider, at full Ride or full Fly. */
	preference: 1.5,

	ride: {
		/** Per hour of driving over 4 on the longest driving day. */
		longDayPerHour: -0.4,
		longDayAfterHours: 4,

		perHotelNight: -0.5,

		/** Driving straight through past the daily limit, alone or with someone to share the wheel. */
		straightThroughAlone: -1.5,
		straightThroughShared: -0.75,

		/** Per hour of driving after sunset. */
		nightPerHour: -0.2,

		/** Per 100 miles, scaled by the route's fatality rate against the national rate. */
		roadRiskPer100Miles: -0.05,

		winterPass: -0.5,

		/** Children on a driving day over 5 hours. */
		children: -0.5,
		childrenAfterHours: 5,

		/** No pet-in-cabin rules. */
		pets: 0.5,
	},

	fly: {
		/** Per hour door to door over 6. */
		longDayPerHour: -0.2,
		longDayAfterHours: 6,

		perConnection: -1,

		/** Times the chance of a delay over 15 minutes, and of a cancellation or diversion. */
		delayChance: -2,
		disruptChance: -10,

		children: -0.5,
		pets: -1.5,
		checkedBags: -0.2,
	},
} as const;

export const VERDICT = {
	/** Cost leads because most drive-or-fly decisions turn on it. Comfort is the softest of the three. */
	weights: { cost: 0.4, time: 0.35, comfort: 0.25 } as Weights,

	/** A comfort gap this large is a full lean. */
	comfortSpread: 5,

	/** Below this overall lean it's a toss-up ... */
	tossUpBelow: 0.05,

	/** ... below this, it leans ... and above it, a clear call. */
	leansBelow: 0.15,

	/** A category lean this small shows as Even. */
	evenWithin: 0.04,
} as const;

/*
 * Working out a route's expected delay for the month of travel from DOT's
 * monthly records, which arrive about two months late. See src/delay.ts.
 */
export const DELAY = {
	/** The seasonal change is averaged over this many past years ... */
	seasonYears: 3,

	/** ... skipping these, so one unusual year doesn't skew it. */
	skipYears: [2020] as readonly number[],

	/** ... looking back no further than this for them. */
	lookBackYears: 6,

	/** A route with fewer flights than this in its newest month borrows its airports' seasonal pattern. */
	thinRouteFlights: 100,
} as const;

export const AIRPORTS = {
	/** Candidates are airports with passenger service within this distance of each end. */
	searchRadiusMiles: 100,

	/** Estimating a drive to a candidate airport from the straight line. */
	roadFactor: 1.2,
	localMph: 50,

	/** Under this distance, or with the same nearest airport at both ends, it's too close to fly. */
	tooCloseMiles: 100,
} as const;
