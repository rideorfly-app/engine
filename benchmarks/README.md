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
2. **The drive.** Run the route helper. It asks the public OSRM server for the route and Nominatim for the states, and prints miles, minutes, miles in each state, the midpoint, and where a 10-hour driving day ends (for picking the overnight town). A long route takes a minute or two, because Nominatim allows one request a second.

   ```sh
   node scripts/benchmark-route.mjs FROM_LAT,FROM_LON TO_LAT,TO_LON
   ```

   For each door-to-airport leg, a plain OSRM call is enough (`distance` is meters, `duration` is seconds):

   ```sh
   curl -s "https://router.project-osrm.org/route/v1/driving/FROM_LON,FROM_LAT;TO_LON,TO_LAT?overview=false"
   ```
3. **Airports.** Use the FAA's hub size (large, medium, small; nonhubs count as small). Wikipedia's airport pages state it.
4. **The fare.** Search the airline's route page or a booking site for the date, by hand. Record the price, the fare type (Basic, Main), the date it was shown, and connections. Southwest's route pages (`southwest.com/en/flights/flights-from-CITY-to-CITY`) carry a dated one-way fare calendar in the page's data; look for `"departureDate"` next to `"totalPrice"`. Pick the trip's date from the dates that have a fare.
5. **The flight's length.** DOT's scheduled time when there's a nonstop, otherwise the airline's or a travel site's typical length for the itinerary (Rome2Rio lists connecting itineraries' averages). With no nonstop, `schedule` is null and the fare carries `minutes` and `stops`.
6. **Gas.** EIA's weekly regular gasoline table at `eia.gov/petroleum/gasdiesel/` has every region on one page.
7. **Meals and lodging.** GSA per diem for each city, the overnight town included. GSA's API answers with the demo key, no sign-up, and gives the county area and each month's lodging:

   ```sh
   curl -s "https://api.gsa.gov/travel/perdiem/v2/rates/city/Bozeman/state/MT/year/2027?api_key=DEMO_KEY"
   ```

   The lunch figure is from GSA's M&IE breakdown table (`gsa.gov/mie`), keyed by the area's daily M&IE total (`meals` in the API).
8. **Wear.** AAA's Your Driving Costs: tires, maintenance, and repair per mile.
9. **Road safety.** IIHS's state-by-state page lists every state's deaths per 100 million miles and the national rate, from NHTSA's FARS data, in one table.
10. **Parking, bags, and rental.** The airport's own parking page for its cheapest lot with a shuttle; the airline's current bag fees; the rental's daily rate for the month and the airport's taxes and fees.
11. **Run it** with `npm run benchmarks`, and write down anything learned below.

### Reference figures

These change rarely, so later trips can reuse them until they're out of date.

| Figure | Value | Source and date |
| --- | --- | --- |
| GSA lunch by M&IE total | $68 → $19, $74 → $20, $80 → $22, $86 → $23, $92 → $26 | GSA M&IE breakdown, FY2027 |
| Tires, maintenance, and repair | 11.04¢ a mile | AAA Your Driving Costs, 2025 |
| Road deaths per 100 million miles | US 1.19; TX 1.35; NE 1.15; IA 1.05; SD 1.40; WY 1.10; MT 1.49 | IIHS from FARS, 2024 (posted June 2026) |
| Southwest checked bags | $45 first, $55 second | Southwest, from 2026-04-09 |
| GSA per diem used so far | Dallas $184; Houston $133; Omaha $128; Spearfish, SD $113; Bozeman $169 (lodging); all $80 M&IE | GSA FY2027 |

## Lessons so far

Add to this list with every trip, so the next one is quicker and better.

- **Define "real" on the engine's basis first.** The first try counted only gas for the drive and failed by 161%; the engine's fuel line was within 2%.
- **Meal cost and meal time should agree.** Dallas–Houston counts lunch in the drive's real cost but has no lunch stop in its real time. It still passes, but at +11.5% it's the closest check. A real trip report would settle how long the stop takes.
- **Real flight times leave out delay, so far.** Neither trip's real total includes an expected delay, because DOT's record for a single route is hard to find; the engine adds 15–30 minutes. Fly time will read a little high until a delay source is settled. Once the DOT data job exists, add the route's average arrival delay to `actual` too.
- **OSRM may run slow on highways.** It gave Dallas–Houston 4 h 14 min, a little longer than the 3½ to 4 hours usually quoted. Watch for a pattern across trips before tuning anything.
- **Southwest's route pages hold a fare calendar** in the page's data, so Southwest routes are quick to gather. Other airlines' pages don't; the first non-Southwest trip will show what works for them.
- **Some figures have several sources that disagree.** Bozeman's December rental average was $135, $169, or $231 depending on the site. Record the one used and the others in `notes`.
- **Families eat differently.** A hotel breakfast is usually free, and meal stops with children run longer than 30 minutes.
- **Prefer one source for a whole table.** IIHS covers every state's road death rate in one place, GSA's API covers every city's rates, and EIA covers every gas region; that's quicker and more consistent than searching state by state.
- **Bag fees move.** Southwest started charging in 2025 and raised fees in April 2026. Check the airline's current fee for each trip.
- **DOT's on-time record for one route is hard to find by web search.** Leave `reliability` null (the engine uses its typical figures) until the DOT data job exists.
- **Skip web searches for "how early to arrive."** The results are mostly spam pages.
- **Cost:** Dallas–Houston took about 20,000 Claude tokens; Omaha–Bozeman about 35,000, since a long, multi-state trip with a family has more pieces. With the route helper and reference figures, expect 20,000 to 30,000 a trip.

## What the trips suggest for tuning

Patterns to confirm across more trips before changing a default. Changing one is a minor version with a changelog entry.

| Default | Engine | What the trips found | Trips |
| --- | --- | --- | --- |
| `DRIVE.wearPerMile` | 10¢ | AAA says 11.04¢ | Both |
| `FLY.checkedBagFee` | $35 | Southwest charges $45 since April 2026 | Omaha–Bozeman |
| Hotel breakfast | Counted as a meal | Usually free at mid-range hotels | Omaha–Bozeman: ride cost +10.6%, most of it this |
| `DRIVE.mealStopMinutes` | 30 | 45 with children seems more realistic | Omaha–Bozeman |
| Airport meal | GSA lunch × 1.25 | About $18 an adult at a quick-serve counter | Omaha–Bozeman |

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
| 2 | Omaha → Bozeman | Family of four; winter pass; one night; thirsty car; connection; medium to small airport; parking; checked bags; rental at the destination; crosses a time zone | Done |
| 3 | Los Angeles → San Francisco | Couple; California gas; large airports; rideshare both ways; not Southwest | Next |
| 4 | Manhattan → Boston | Solo; transit both ends; toll roads | |
| 5 | Baltimore → Philadelphia | Too close to fly | |
| 6 | Chicago → Nashville | Family with a dog | |
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
