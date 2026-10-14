/*
 * "You'd have missed this" notes: one or two short lines on the costs and
 * delays people tend to forget. Rules pick them, in priority order, so the
 * same matchup always gets the same notes.
 */

import { monthOf } from './dates';
import { DRIVE } from './defaults';
import { formatDuration, formatMoney } from './format';
import { roundMinutes } from './rounding';
import type { Answers, Line, Lookups, Note, Result } from './types';

/** A result shows at most this many. */
const MAX_NOTES = 2;

/** Traffic worth mentioning. */
const TRAFFIC_MINUTES = 30;

/** Up to two notes for a scored matchup. */
export function notesFor(answers: Answers, lookups: Lookups, result: Result): Note[] {
	const notes: Note[] = [];
	const { ride, fly } = result;

	// The ride from the arrival airport is what makes driving the cheaper side.
	const fromAirport = fly?.lines.find((line) => line.id === 'fly.fromAirport' && line.on);

	if (fly && fromAirport && fromAirport.value > 0 && ride.cost < fly.cost) {
		if (fly.cost - fromAirport.value <= ride.cost) {
			notes.push({
				id: 'from-airport',
				text: `Getting from ${fly.destination} to the door (${formatMoney(fromAirport.value)}) is what makes driving cheaper.`,
			});
		}
	}

	const traffic = lookups.drive.minutes - lookups.drive.minutesWithoutTraffic;

	if (traffic >= TRAFFIC_MINUTES) {
		notes.push({
			id: 'traffic',
			text: `Traffic adds about ${formatDuration(roundMinutes(traffic))} to the drive on this day.`,
		});
	}

	const parking = fly?.lines.find((line) => line.id === 'fly.parking');

	if (fly && parking && isAmongLargest(parking, fly.lines)) {
		notes.push({
			id: 'parking',
			text: `Parking at ${fly.origin} adds ${formatMoney(parking.value)} to flying.`,
		});
	}

	const hotel = ride.lines.find((line) => line.id === 'ride.hotel');

	if (hotel && isAmongLargest(hotel, ride.lines)) {
		notes.push({
			id: 'hotel',
			text: `Hotel stops on the way add ${formatMoney(hotel.value)} to driving.`,
		});
	}

	const passes = lookups.drive.winterPasses;

	if (passes.length > 0 && DRIVE.winterMonths.includes(monthOf(answers.date))) {
		notes.push({
			id: 'winter',
			text: `The drive crosses ${passes.join(' and ')} in winter. Check road conditions before you leave.`,
		});
	}

	if (answers.pets > 0) {
		notes.push({
			id: 'pets',
			text: "Driving avoids pet-in-cabin rules. If you fly, check your airline's pet policy.",
		});
	}

	return notes.slice(0, MAX_NOTES);
}

/** Whether a line that's on is one of the two largest cost lines on its side. */
function isAmongLargest(line: Line, lines: Line[]): boolean {
	if (!line.on || line.value <= 0) {
		return false;
	}

	const largest = lines
		.filter((other) => other.kind === 'cost' && other.on)
		.map((other) => other.value)
		.sort((a, b) => b - a);

	return line.value >= (largest[1] ?? 0);
}
