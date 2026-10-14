# Benchmark trips

Real one-way trips, gathered by hand from public sources, used to check that the engine's numbers land close to what driving and flying really cost and take. Phase 1's gate: on every trip, each side's door-to-door time is within 15% and its total cost within 20%.

Run them with:

```sh
npm run build
npm run benchmarks
```

The trips aren't part of the npm package, so adding one never changes the engine's hash.

## A trip's file

Each trip is one JSON file, named after its route (`dallas-houston.json`).

| Field | What it holds |
| --- | --- |
| `id`, `title` | The file's name, and a one-line description: who, where, when |
| `covers` | What this trip tests that others don't (see Coverage below) |
| `gatheredOn`, `gatheredBy` | When the figures were collected, and by whom |
| `answers` | The trip as a user would answer the questions |
| `lookups` | What the app would have fetched, from public sources, each with `source` and `asOf` |
| `actual` | What each side really cost and took, with `parts` listing every piece and its source |
| `notes` | Gaps, judgment calls, and anything a later reader should know |

## Rules

- **No Google route results.** Drive and ground-leg times come from OpenStreetMap-based routing, credited as "OSRM (OpenStreetMap contributors)".
- **Booking sites by hand only.** Fares shown on a site for a date are fine to record for this set. Never script a booking site.
- **Every figure names its source and date.** A figure that's a judgment call says "(Claude's call)" or whoever made it.
- **Count the real totals on the engine's basis.** A drive's cost is gas, tires and maintenance, meals on the road, and snacks; depreciation is left out because the engine leaves it off by default. A flight's cost is the fare, bag fees, parking or rides to and from the airports, and food. Counting gas alone made the first trip's drive fail by 161% when the engine was right.
- **Don't copy the engine's own assumptions into `actual`.** If the real figure for a piece is the engine's default, the check is circular. Use an independent source, or mark it as a judgment call and keep it to small pieces.

## How to gather a trip

1. **Places.** Use a city center or a ZIP code area's center for each door. Record its lat and lon.
2. **The drive.** Ask the public OSRM server for the route (no key needed):

   ```sh
   curl -s "https://router.project-osrm.org/route/v1/driving/FROM_LON,FROM_LAT;TO_LON,TO_LAT?overview=simplified&geometries=geojson"
   ```

   `distance` is meters (÷ 1609.34 for miles) and `duration` is seconds. The midpoint is the middle coordinate of `geometry.coordinates`. Use the same call for each door-to-airport leg.
3. **Airports.** Use the FAA's hub size (large, medium, small; nonhubs count as small).
4. **The fare.** Search the airline's route page or a booking site for the date, by hand. Record the price, the fare type (Basic, Main), the date it was shown, and connections.
5. **The flight's length.** DOT's scheduled time when available, otherwise the airline's or a travel site's typical length.
6. **Gas.** EIA's weekly regular gasoline table at `eia.gov/petroleum/gasdiesel/` has every region on one page.
7. **Meals and lodging.** GSA per diem for each city. The lunch figure is from GSA's M&IE breakdown table (`gsa.gov/mie`), keyed by the city's daily M&IE total.
8. **Wear.** AAA's Your Driving Costs: tires, maintenance, and repair per mile.
9. **Road safety.** Each state's deaths per 100 million vehicle miles, from NHTSA or the state's DOT.
10. **Run it** with `npm run benchmarks`, and write down anything learned below.

### Reference figures

These change rarely, so later trips can reuse them until they're out of date.

| Figure | Value | Source and date |
| --- | --- | --- |
| GSA lunch by M&IE total | $68 → $19, $74 → $20, $80 → $22, $86 → $23, $92 → $26 | GSA M&IE breakdown, FY2027 |
| Tires, maintenance, and repair | 11.04¢ a mile | AAA Your Driving Costs, 2025 |
| National road deaths | 1.26 per 100 million miles | NHTSA |

## Lessons so far

Add to this list with every trip, so the next one is quicker and better.

- **Define "real" on the engine's basis first.** The first try counted only gas for the drive and failed by 161%; the engine's fuel line was within 2%.
- **Meal cost and meal time should agree.** Dallas–Houston counts lunch in the drive's real cost but has no lunch stop in its real time. It still passes, but at +11.5% it's the closest check. A real trip report would settle how long the stop takes.
- **OSRM may run slow on highways.** It gave Dallas–Houston 4 h 14 min, a little longer than the 3½ to 4 hours usually quoted. Watch for a pattern across trips before tuning anything.
- **Southwest's route pages show dated fares** in search results ("from $114 on Nov 3"), which makes Southwest routes quick to gather.
- **DOT's on-time record for one route is hard to find by web search.** Leave `reliability` null (the engine uses its typical figures) until the DOT data job exists.
- **Skip web searches for "how early to arrive."** The results are mostly spam pages.
- **Cost:** about 20,000 to 30,000 Claude tokens a trip once the setup is understood.

## Coverage

Twenty trips that test the same thing are worth less than five that don't. Each new trip should add something on this list that the set doesn't have yet.

| Dimension | Values to cover |
| --- | --- |
| Distance | Too close to fly; under 300 mi; 300–600; 600–1,000 (one night); over 1,500 (several nights) |
| Travelers | Solo; couple; family with young children; a group of five or six; with a pet |
| Car | Own car, thrifty and thirsty; rental |
| Airports | Large, medium, and small; a pair with no nonstop; a pair with no fare found |
| To and from the airport | Parking, drop-off, rideshare, and transit; rental, rideshare, pickup, and transit |
| Bags | None; two or more checked |
| Season and terrain | Summer; holidays; winter passes; desert heat |
| Region | Cheap and expensive gas (Gulf Coast, California); toll roads; crossing time zones |
| The drive | Straight through; hotel stop; shared driving |

### The slate

| # | Trip | Adds | Status |
| --- | --- | --- | --- |
| 1 | Dallas → Houston | Short; solo; medium airports; frequent nonstop; cheap gas; drop-off and pickup | Done |
| 2 | Omaha → Bozeman | Family of four; winter; one night; connection; small airports; parking; checked bags; rental at the destination | Next |
| 3 | Los Angeles → San Francisco | Couple; California gas; large airports; rideshare both ways | |
| 4 | Manhattan → Boston | Solo; transit both ends; toll roads | |
| 5 | Baltimore → Philadelphia | Too close to fly | |
| 6 | Chicago → Nashville | Family with a dog; crosses a time zone | |
| 7 | Seattle → Spokane | Winter pass (Snoqualmie) in January | |
| 8 | Atlanta → Orlando | Family of five; spring break; parking; bags | |
| 9 | Phoenix → Las Vegas | Rental car; desert summer | |
| 10 | Miami → New York | Couple; two-day drive; shared driving | |
| 11 | Los Angeles → New York | Coast to coast; several nights | |
| 12 | Austin → New Orleans | Group of six; two cars or a rental | |
| 13 | Salt Lake City → Jackson Hole | Small, expensive airport; ski season | |
| 14 | Minneapolis → Fargo | Small destination airport; January | |
| 15 | Pittsburgh → Washington | Turnpike tolls; transit at DCA | |
| 16 | Tampa → Key West | Small, pricey airport; scenic drive | |
| 17 | El Paso → San Antonio | Long drive inside one state | |
| 18 | Portland → Boise | Rural route; Blue Mountains in winter | |
| 19 | Small to small with no fare found | The engine's fare estimate | |
| 20 | San Diego → Salt Lake City | Straight through chosen | |
| 21 | Kansas City → St. Louis | Short; rideshare to the airport for four | |
| 22 | Denver → Albuquerque | Raton Pass; medium airports | |

Real trips from friends and family should replace or join these whenever someone has one.
