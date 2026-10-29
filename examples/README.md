# Trying the engine with your own trip

`trip.json` is a sample trip: Denver to Sandy, Utah, for a family of four in December. Its figures are made up. Copy it, change what you like, and score it:

```sh
cp examples/trip.json my-trip.json
npm run try -- my-trip.json
```

A trip file has three parts. The engine never looks anything up, so every figure the site would fetch is yours to fill in.

Don't commit drive times or distances copied from Google Maps; Google's terms forbid storing them. For your own copy that you keep to yourself, any source is fine. For figures you can share, OpenStreetMap routing works (see "How to gather a trip" in `benchmarks/README.md`).

## `answers`: what the question flow asks

| Field | What to put |
| --- | --- |
| `from`, `to` | A place: `id` (a ZIP code or Census place ID), `name`, `state` (two letters; lower 48 and DC only), `lat`, `lon`. The center of the city or ZIP code stands in for your door |
| `date` | The departure date, `YYYY-MM-DD` |
| `adults`, `children` | Counts. Only adults share the wheel |
| `car` | `{ "kind": "own", "mpg": 27 }` or `{ "kind": "rental" }` |
| `toAirport` | `{ "mode": "park", "daysParked": 6 }`, or `"dropoff"`, `"rideshare"`, or `"transit"` as the mode |
| `fromAirport` | `"rental"`, `"rideshare"`, `"pickup"`, or `"transit"` |
| `checkedBags`, `pets` | Counts |
| `preference` | −100 (much rather fly) to 100 (much rather drive); 0 is no preference |
| `longDrive` | Optional: `"hotel"` or `"straight"`, for a drive past the daily limit. Leave it out and the script tells you when it's needed |

## `lookups`: what the site would fetch

Every lookup has a `source` and an `asOf` date, which the page shows beside the figure.

| Field | What to put |
| --- | --- |
| `drive` | `miles`, `minutes` of driving (no stops), `milesByState` (for gas prices and road safety), `winterPasses` (names of listed passes on the route; usually `[]`), and the route's `midpoint` (for sunset; only its latitude is used) |
| `flight` | The two airports (`code`, `name`, `size`: `large`, `medium`, or `small`, `lat`, `lon`, and optional `parkingPerDay`); the drives `toOrigin` and `fromDestination` (`miles`, `minutes`); `fare` (`perPerson`, optional `minutes` and `stops`) or `null` to have the engine estimate one; `schedule` (a nonstop's `minutes`) or `null`; `reliability` (`averageDelayMinutes`, `delayChance`, `disruptChance`, from DOT) or `null` for typical figures. Set the whole `flight` to `null` for a trip too close to fly |
| `gas` | Regular gas per gallon by EIA region (`new-england`, `central-atlantic`, `lower-atlantic`, `midwest`, `gulf-coast`, `rocky-mountain`, `west-coast`, `california`), plus a `national` price for any region you leave out |
| `perDiem` | GSA's `lunch` and `lodging` rates for the `start` and `destination`, and optionally an `overnight` stop |
| `rental` | Average daily rental rates at the `start` and `destination`, before taxes and fees |
| `roadSafety` | Road deaths per 100 million miles `byState`, and the `national` rate |
| `dataVersion` | Any label for where your figures came from, such as `"mine"` |

## `edits`: what you'd change in the workbench

Optional. Leave it as `{}` to see the numbers as Ride or Fly would first show them.

```json
"edits": {
	"lines": {
		"fly.fares": { "value": 600 },
		"ride.tolls": { "value": 25 },
		"ride.depreciation": { "on": true }
	},
	"custom": [{ "id": "custom.chains", "side": "ride", "kind": "cost", "label": "Snow chains", "value": 40 }],
	"assumptions": { "maxDrivingHours": 8, "weights": { "cost": 0.5, "time": 0.3, "comfort": 0.2 } }
}
```

- **`lines`** changes a line by its id, which `npm run try` prints after each line, such as `ride.fuel` or `fly.parking`. `value` is dollars or minutes; `on` switches it on or off.
- **`custom`** adds your own lines. `kind` is `cost` (dollars) or `time` (minutes).
- **`assumptions`** changes `maxDrivingHours`, the `weights` (which must add up to 1), `gasPrice`, `mpg`, or `arrivalBufferMinutes`.
