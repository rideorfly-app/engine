/*
 * The engine's data model, in one place.
 *
 * Three things go in: the user's Answers, the Lookups the app fetched, and the
 * user's Edits. One thing comes out: a Result, with every line, the comfort
 * breakdown, and the verdict.
 */

import type {
	Chance,
	ClockMinutes,
	Dollars,
	Hours,
	IsoDate,
	Miles,
	Minutes,
	StateCode,
} from './units';

// ---------------------------------------------------------------------------
// Answers: what the user told us
// ---------------------------------------------------------------------------

/** A start or destination: a Census place or ZIP code area. "Your door" is its center. */
export interface Place {
	/** The Census place GEOID, or the ZIP code. */
	id: string;
	name: string;
	state: StateCode;
	lat: number;
	lon: number;
}

/** The car for the drive. */
export type Car = { kind: 'own'; mpg: number } | { kind: 'rental' };

/** How the traveler gets to the departure airport. */
export type ToAirport =
	| { mode: 'park'; daysParked: number }
	| { mode: 'dropoff' }
	| { mode: 'rideshare' }
	| { mode: 'transit' };

/**
 * How the traveler gets from the arrival airport to the destination. Only this
 * ride counts, never a car for the stay: Ride or Fly compares the travel, not
 * the whole trip.
 */
export type FromAirport = 'rental' | 'rideshare' | 'pickup' | 'transit';

/** The answer to "Stop at a hotel on the way, or drive straight through?" */
export type LongDriveChoice = 'hotel' | 'straight';

export interface Answers {
	from: Place;
	to: Place;

	/** The departure date. The MVP compares one-way trips only. */
	date: IsoDate;

	/** Only adults can share the wheel. */
	adults: number;
	children: number;

	car: Car;
	toAirport: ToAirport;
	fromAirport: FromAirport;

	checkedBags: number;
	pets: number;

	/** From −100 ("Airports are my happy place") to 100 ("The road trip is half the point"). 0 is no preference. */
	preference: number;

	/** Set once the page has asked. Until then, a hotel is assumed. */
	longDrive?: LongDriveChoice;
}

// ---------------------------------------------------------------------------
// Lookups: what the app fetched for this matchup
// ---------------------------------------------------------------------------

/** Where a figure came from, for its source tag and tooltip. */
export interface Dated {
	/** Shown beside the figure, such as "Google Maps" or "Travelpayouts". */
	source: string;
	asOf: IsoDate;
}

/** The drive, summarized by the app from Google's route. The engine never sees the route's path. */
export interface Drive extends Dated {
	miles: Miles;

	/** Traffic-aware driving time for the travel day. */
	minutes: Minutes;

	/** The same drive without traffic, for the rush-hour note. */
	minutesWithoutTraffic: Minutes;

	/** How many of the route's miles fall in each state, for gas prices and road safety. */
	milesByState: Partial<Record<StateCode, Miles>>;

	/** Names of listed winter passes the route crosses, such as "Sherman Summit (I-80)". */
	winterPasses: string[];

	/** The route's midpoint, for sunset and sunrise. */
	midpoint: { lat: number; lon: number };
}

/** The FAA's hub categories, simplified. Nonhub airports count as small. */
export type AirportSize = 'large' | 'medium' | 'small';

export interface Airport {
	/** The IATA code, such as "DEN". */
	code: string;
	name: string;
	size: AirportSize;
	lat: number;
	lon: number;

	/** The cheapest daily rate with a shuttle, from the hand-kept parking table, when the airport is in it. */
	parkingPerDay?: Dollars;
}

/** A drive between a door and an airport. */
export interface GroundLeg extends Dated {
	miles: Miles;
	minutes: Minutes;
}

/** A recent cached fare for the airport pair and date. */
export interface Fare extends Dated {
	perPerson: Dollars;

	/** Gate to gate, layovers included, when the cached fare says. */
	minutes?: Minutes;

	/** Connections, when the cached fare says. 0 is nonstop. */
	stops?: number;
}

/** DOT's on-time record for the airport pair. */
export interface Reliability extends Dated {
	averageDelayMinutes: Minutes;

	/** The chance a flight arrives more than 15 minutes late. */
	delayChance: Chance;
	cancelChance: Chance;
}

export interface FlightLookups {
	origin: Airport;
	destination: Airport;

	/** From the start's door to the departure airport. */
	toOrigin: GroundLeg;

	/** From the arrival airport to the destination's door. */
	fromDestination: GroundLeg;

	/** Null when no cached fare was found; the engine estimates one. */
	fare: Fare | null;

	/** DOT's scheduled time for a nonstop. If DOT lists one, a nonstop exists. */
	schedule: (Dated & { minutes: Minutes }) | null;

	/** Null when DOT has no record for the pair; the engine uses typical figures. */
	reliability: Reliability | null;
}

/** EIA's weekly retail gasoline regions. California is reported apart from the rest of the West Coast. */
export type GasRegion =
	| 'new-england'
	| 'central-atlantic'
	| 'lower-atlantic'
	| 'midwest'
	| 'gulf-coast'
	| 'rocky-mountain'
	| 'west-coast'
	| 'california';

/** GSA per diem rates for one place. */
export interface PerDiem {
	/** The lunch share of the meals rate. It stands in for a quick-serve meal. */
	lunch: Dollars;

	/** One night's lodging. */
	lodging: Dollars;
}

export interface Lookups {
	drive: Drive;

	/** The chosen airports and their lookups, or null when the trip is too close to fly. */
	flight: FlightLookups | null;

	gas: Dated & {
		/** Regular gasoline, per gallon. */
		byRegion: Partial<Record<GasRegion, Dollars>>;

		/** Used for any region that's missing. */
		national: Dollars;
	};

	perDiem: Dated & {
		start: PerDiem;
		destination: PerDiem;

		/** Where a long drive stops for the night, when the app knows. */
		overnight?: PerDiem;
	};

	/** Regional average daily rental rates, before taxes and fees. */
	rental: Dated & {
		start: Dollars;
		destination: Dollars;
	};

	/** NHTSA road deaths per 100 million vehicle miles. */
	roadSafety: Dated & {
		byState: Partial<Record<StateCode, number>>;
		national: number;
	};

	/**
	 * The start's offset from UTC on the travel date, in minutes, such as −420
	 * for Mountain Standard Time. The whole trip runs on the start's clock.
	 */
	utcOffsetMinutes: number;
}

// ---------------------------------------------------------------------------
// Edits: what the user changed in the workbench
// ---------------------------------------------------------------------------

export type SideName = 'ride' | 'fly';

export type LineKind = 'cost' | 'time';

/** How much each category counts toward the overall verdict. They add up to 1. */
export interface Weights {
	cost: number;
	time: number;
	comfort: number;
}

/** Assumptions the workbench lets the user change, with a stepper. */
export interface Assumptions {
	maxDrivingHours: Hours;
	weights: Weights;

	/** Replaces the route's gas price. */
	gasPrice?: Dollars;

	/** Replaces the answer's mpg. */
	mpg?: number;

	/** Replaces the airport's arrival buffer. */
	arrivalBufferMinutes?: Minutes;
}

/** A change to one line: a typed value, switching it off or on, or both. */
export interface LineEdit {
	value?: number;
	on?: boolean;
}

/** A line the user added. */
export interface CustomLine {
	id: string;
	side: SideName;
	kind: LineKind;
	label: string;
	value: number;
}

export interface Edits {
	/** Keyed by line id, such as "ride.fuel". */
	lines?: Record<string, LineEdit>;
	custom?: CustomLine[];
	assumptions?: Partial<Assumptions>;
}

// ---------------------------------------------------------------------------
// The result
// ---------------------------------------------------------------------------

/**
 * Where a line's figure came from: a data source, our own formula, or the
 * user. A line set back to what Ours used goes back to its original tag.
 */
export type SourceTag = 'sourced' | 'estimate' | 'yours';

export interface Line {
	/** Stable across versions, such as "ride.fuel". Edits and placeholders refer to it. */
	id: string;
	side: SideName;
	kind: LineKind;
	label: string;

	/** Dollars or minutes, as counted: rounded, or as the user typed it. */
	value: number;

	/** Whether it counts toward the side's total. */
	on: boolean;

	/** The value and switch before the user's edits. */
	ours: { value: number; on: boolean };

	source: SourceTag;

	/** A line we don't estimate, such as tolls, shown empty until the user fills it in. */
	empty?: boolean;

	/** For the tooltip, such as "Travelpayouts" and the date its price is from. */
	sourceName?: string;
	asOf?: IsoDate;
}

export interface ComfortLine {
	id: string;
	side: SideName;
	label: string;

	/** Plus or minus, from a starting point of 7. Comfort isn't rounded. */
	points: number;
}

export interface Side {
	side: SideName;
	lines: Line[];
	comfortLines: ComfortLine[];

	/** The sum of the lines that are on. */
	cost: Dollars;
	minutes: Minutes;

	/** From 0 to 10. */
	comfort: number;
}

export interface RideSide extends Side {
	side: 'ride';
	drivingMinutes: Minutes;
	days: number;
	nights: number;
	straightThrough: boolean;
	nightDrivingMinutes: Minutes;
	arrival: ClockMinutes;

	/** The daily driving limit the drive was laid out with. */
	maxDrivingHours: Hours;

	/** The gas price and fuel economy the drive was scored with. mpg is null for a rental. */
	gasPrice: Dollars;
	mpg: number | null;
}

export interface FlySide extends Side {
	side: 'fly';
	origin: string;
	destination: string;
	connections: number;
	arrival: ClockMinutes;

	/** The fare per person: the cached or estimated one, or the user's total ÷ travelers once edited. */
	farePerPerson: Dollars;
}

export type Verdict = 'ride' | 'fly';

export type Confidence = 'toss-up' | 'leans' | 'clear';

export type Winner = Verdict | 'even';

/** Each category's lean, from −1 (Fly) to +1 (Ride), and the weighted overall. */
export interface Leans {
	cost: number;
	time: number;
	comfort: number;
	overall: number;
}

/** Something the page needs to ask before the numbers are settled. */
export interface Question {
	kind: 'long-drive';
	drivingMinutes: Minutes;
	limitHours: Hours;
}

/** A "you'd have missed this" note. */
export interface Note {
	id: string;
	text: string;
}

export interface Result {
	engineVersion: string;

	ride: RideSide;

	/** Null when the trip is too close to fly. */
	fly: FlySide | null;

	weights: Weights;
	leans: Leans;
	verdict: Verdict;
	confidence: Confidence;
	winners: { cost: Winner; time: Winner; comfort: Winner };

	questions: Question[];
	notes: Note[];
}
