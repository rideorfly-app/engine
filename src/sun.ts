/*
 * Sunrise and sunset, worked out from the date and coordinates with NOAA's
 * standard approximation. It's accurate to a minute or two in the lower 48,
 * which is plenty for counting how much of a drive is in the dark.
 */

import { dayOfYear, daysInYear } from './dates';
import type { IsoDate, Minutes } from './units';

/** The sun's center is 0.833° below the horizon at sunrise and sunset, allowing for refraction. */
const ZENITH = (90.833 * Math.PI) / 180;

export interface SunTimes {
	/** Minutes after midnight UTC on the date. */
	sunrise: Minutes;
	sunset: Minutes;
}

/** Sunrise and sunset on `date` at a point, in minutes after midnight UTC. */
export function sunTimes(date: IsoDate, lat: number, lon: number): SunTimes {
	// The fractional year, in radians, at noon.
	const gamma = ((2 * Math.PI) / daysInYear(date)) * (dayOfYear(date) - 1);

	// How far solar noon drifts from clock noon over the year, in minutes.
	const equationOfTime =
		229.18 *
		(0.000075 +
			0.001868 * Math.cos(gamma) -
			0.032077 * Math.sin(gamma) -
			0.014615 * Math.cos(2 * gamma) -
			0.040849 * Math.sin(2 * gamma));

	// The sun's declination, in radians.
	const declination =
		0.006918 -
		0.399912 * Math.cos(gamma) +
		0.070257 * Math.sin(gamma) -
		0.006758 * Math.cos(2 * gamma) +
		0.000907 * Math.sin(2 * gamma) -
		0.002697 * Math.cos(3 * gamma) +
		0.00148 * Math.sin(3 * gamma);

	const latitude = (lat * Math.PI) / 180;

	const cosHourAngle =
		Math.cos(ZENITH) / (Math.cos(latitude) * Math.cos(declination)) -
		Math.tan(latitude) * Math.tan(declination);

	// Clamped, so the far north's midnight sun or polar night can't produce NaN.
	const hourAngle = (Math.acos(Math.min(1, Math.max(-1, cosHourAngle))) * 180) / Math.PI;

	return {
		sunrise: 720 - 4 * (lon + hourAngle) - equationOfTime,
		sunset: 720 - 4 * (lon - hourAngle) - equationOfTime,
	};
}
