// Gathers a benchmark trip's drive from OpenStreetMap: miles, minutes, the
// midpoint, miles in each state, and where a 10-hour driving day ends. For
// gathering benchmark trips only; the engine itself never calls the network.
//
//   node scripts/benchmark-route.mjs FROM_LAT,FROM_LON TO_LAT,TO_LON
//
// Uses the public OSRM server for the route and Nominatim for states, at one
// request a second, as Nominatim's usage policy asks.

const [from, to] = process.argv.slice(2).map((arg) => arg.split(',').map(Number));
if (!from || !to) {
	console.error('Usage: node scripts/benchmark-route.mjs FROM_LAT,FROM_LON TO_LAT,TO_LON');
	process.exit(1);
}

const METERS_PER_MILE = 1609.34;
const STATE_SAMPLE_MILES = 20;
const DAY_DRIVING_SECONDS = 10 * 3600;
const agent = { 'User-Agent': 'rideorfly-benchmarks (https://github.com/rideorfly-app/engine)' };

const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=true`;
const route = (await (await fetch(url, { headers: agent })).json()).routes[0];
const points = route.geometry.coordinates;
const miles = route.distance / METERS_PER_MILE;

// --- Distance along the path, scaled to OSRM's own total ---

/** Miles between two [lon, lat] points. */
function haversine([lon1, lat1], [lon2, lat2]) {
	const rad = Math.PI / 180;
	const dLat = (lat2 - lat1) * rad;
	const dLon = (lon2 - lon1) * rad;
	const h =
		Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
	return 2 * 3958.8 * Math.asin(Math.sqrt(h));
}

const along = [0];
for (let i = 1; i < points.length; i++)
	along.push(along[i - 1] + haversine(points[i - 1], points[i]));
const scale = miles / along.at(-1);

// --- Miles in each state ---

const states = new Map();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The two-letter state at a point on the path, asked of Nominatim once. */
async function stateAt(i) {
	if (states.has(i)) return states.get(i);
	await sleep(1100);
	const [lon, lat] = points[i];
	const reverse = `https://nominatim.openstreetmap.org/reverse?format=json&zoom=5&lat=${lat}&lon=${lon}`;
	const { address } = await (await fetch(reverse, { headers: agent })).json();
	const code = (address?.['ISO3166-2-lvl4'] ?? 'US-??').replace('US-', '');
	states.set(i, code);
	return code;
}

// Sample every ~20 miles, then narrow each change of state down to one point.
const step = Math.max(1, Math.floor((points.length * STATE_SAMPLE_MILES) / along.at(-1)));
const samples = [];
for (let i = 0; i < points.length; i += step) samples.push(i);
samples.push(points.length - 1);

const borders = [{ at: 0, state: await stateAt(0) }];
for (let k = 1; k < samples.length; k++) {
	let lo = samples[k - 1];
	let hi = samples[k];
	if ((await stateAt(hi)) === (await stateAt(lo))) continue;

	while (hi - lo > 1) {
		const mid = Math.floor((lo + hi) / 2);
		if ((await stateAt(mid)) === (await stateAt(lo))) lo = mid;
		else hi = mid;
	}
	borders.push({ at: hi, state: await stateAt(hi) });
}

const milesByState = {};
borders.forEach(({ at, state }, k) => {
	const end = borders[k + 1]?.at ?? points.length - 1;
	milesByState[state] = (milesByState[state] ?? 0) + (along[end] - along[at]) * scale;
});

// --- Where the first 10-hour driving day ends ---

let seconds = 0;
let dayEnd = null;
for (const s of route.legs[0].steps) {
	seconds += s.duration;
	if (seconds >= DAY_DRIVING_SECONDS) {
		dayEnd = { lon: s.maneuver.location[0], lat: s.maneuver.location[1], road: s.ref || s.name };
		break;
	}
}

const round = (n, places = 1) => Math.round(n * 10 ** places) / 10 ** places;
const middle = points[Math.floor(points.length / 2)];

console.log(
	JSON.stringify(
		{
			miles: round(miles),
			minutes: Math.round(route.duration / 60),
			milesByState: Object.fromEntries(Object.entries(milesByState).map(([s, m]) => [s, round(m)])),
			midpoint: { lat: round(middle[1], 2), lon: round(middle[0], 2) },
			tenHourMark: dayEnd,
		},
		null,
		'\t',
	),
);
