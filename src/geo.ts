import type { Miles } from './units';

/** Earth's mean radius in miles. */
const EARTH_RADIUS: Miles = 3958.8;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** The straight-line (great-circle) distance between two points. */
export function straightLineMiles(
	a: { lat: number; lon: number },
	b: { lat: number; lon: number },
): Miles {
	const dLat = toRadians(b.lat - a.lat);
	const dLon = toRadians(b.lon - a.lon);

	const h =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLon / 2) ** 2;

	return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(h));
}
