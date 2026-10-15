/*
 * The one set of formatters for money, time, and distance. The page, Our
 * take's placeholders, and the code-written summary all use these, so a figure
 * reads the same everywhere it appears.
 */

import type { Dollars, Miles, Minutes } from './units';

/** The minus sign used in changes, such as "−$85". A real minus, not a hyphen. */
const MINUS = '−';

/** Groups digits by thousands: 1050 becomes "1,050". */
function groupThousands(whole: number): string {
	return String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Money, with cents only when there are any: "$1,050", "$129", "$3.10".
 * Line totals are whole dollars; prices behind a line (gas, a fare) may not be.
 */
export function formatMoney(dollars: Dollars): string {
	const sign = dollars < 0 ? MINUS : '';
	const cents = Math.round(Math.abs(dollars) * 100);
	const whole = Math.floor(cents / 100);
	const rest = cents % 100;

	const amount =
		rest === 0
			? groupThousands(whole)
			: `${groupThousands(whole)}.${String(rest).padStart(2, '0')}`;

	return `${sign}$${amount}`;
}

/** A duration: "9h 10m", "8h 00m", or "45m" under an hour. */
export function formatDuration(minutes: Minutes): string {
	const sign = minutes < 0 ? MINUS : '';
	const total = Math.round(Math.abs(minutes));
	const hours = Math.floor(total / 60);
	const rest = total % 60;

	if (hours === 0) {
		return `${sign}${rest}m`;
	}

	return `${sign}${hours}h ${String(rest).padStart(2, '0')}m`;
}

/** A distance in whole miles: "540 miles", "1 mile". */
export function formatMiles(miles: Miles): string {
	const whole = Math.round(miles);

	return `${groupThousands(whole)} ${whole === 1 ? 'mile' : 'miles'}`;
}

/** A multi-day drive: "3 days, 22h 00m of driving". */
export function formatDrivingDays(days: number, drivingMinutes: Minutes): string {
	return `${days} ${days === 1 ? 'day' : 'days'}, ${formatDuration(drivingMinutes)} of driving`;
}

/** A change in money, always signed: "+$40", "−$85". Zero is "$0". */
export function formatMoneyChange(dollars: Dollars): string {
	return dollars > 0 ? `+${formatMoney(dollars)}` : formatMoney(dollars);
}

/** A change in time, always signed: "+3h 10m", "−25m". Zero is "0m". */
export function formatDurationChange(minutes: Minutes): string {
	return minutes > 0 ? `+${formatDuration(minutes)}` : formatDuration(minutes);
}
