# Benchmark trips

One-way trips used to check the engine's numbers against what driving and flying really cost and take. The target: each side's door-to-door time within 15% of the real figure, and its total cost within 20%.

A benchmark is only as good as its real figures, so every piece of a real total says how it's known (see Bases below), and the report shows how much of each total was actually observed. A trip that's mostly judgment calls checks the engine's math, not its accuracy. For that reason the set is not a release or merge gate yet. It grows as observed data arrives: DOT's records of real flights now, and users' "How did it go?" reports after launch.

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
| `actual` | For each side, `time` and `cost` as lists of parts. The real total is their sum |
| `notes` | Gaps, judgment calls, and anything a later reader should know |

Each part of `actual` looks like this:

```json
{ "what": "Driving", "amount": 254, "basis": "average", "source": "OSRM (OpenStreetMap contributors), 2026-10-14" }
```

`amount` is minutes in a `time` list and dollars in a `cost` list.

### Bases

How each part is known, strongest first:

| Basis | Meaning | Examples |
| --- | --- | --- |
| `observed` | Measured on real trips | DOT's records of real flights; a traveler's own times and receipts |
| `price` | A real price for this trip, or a posted rate | A fare shown for the date; a parking rate; a bag fee; EIA's pump prices |
| `average` | A published average or a routing model | OSRM drive times; AAA's wear per mile; GSA meal and lodging rates |
| `judgment` | Someone's estimate; `source` says whose | Time at the airport; how long stops take; snacks |

## Rules

- **No Google route results.** Drive and ground-leg times come from OpenStreetMap-based routing, credited as "OSRM (OpenStreetMap contributors)".
- **Booking sites by hand only.** Fares shown on a site for a date are fine to record for this set. Never script a booking site.
- **Every part names its basis, source, and date.** A judgment call's source is whoever made it, such as "Claude's call".
- **Prefer the strongest basis available.** Replace a judgment call with an observed figure whenever one exists.
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
5. **The flight's real length and delays.** Two different sets of months:
   - **The real result** (`actual`): the trip's month a year earlier, since the trip's own month hasn't happened.
   - **The engine's inputs** (`schedule` and `reliability`): only data published before the trip, worked out the way the plan's "Delay figures" section says. Take DOT's newest month, then add the average change from that month to the trip's month over the last three years. Using the real result's month as an input too would be grading the engine with its own answer key.

   BTS publishes each month about two to three months late, as a zip of about 30 MB:

   ```sh
   curl -o bts.zip "https://transtats.bts.gov/PREZIP/On_Time_Reporting_Carrier_On_Time_Performance_1987_present_2025_11.zip"
   node scripts/benchmark-flights.mjs bts.zip ALL DAL HOU
   node scripts/benchmark-flights.mjs bts.zip WN OMA DEN BZN --offsets 0,-60,-60
   ```

   `ALL` takes every airline on the route, as the engine's figures do; a two-letter code takes one. For a nonstop, it prints the scheduled time (for `schedule`), the delay figures (for `reliability`), and the observed time from scheduled departure to actual arrival (an `observed` part of `actual`). For a connection, it takes each day's shortest one and follows it as it really went, missed connections included; there's no `schedule` or `reliability` for the pair, and the fare carries the scheduled length and one stop. Keep the zip out of the repo.
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
- **Label every part, and look at the shares.** Before the labels, both trips "passed" while flight times were half guesswork. With them, the report shows that drive times have no observed data at all yet.
- **DOT's monthly files are the best observed source available now.** They give real flight times, delays, and cancellations for every route, free. Use the same month a year earlier, so the season matches.
- **Watch for unusual months.** November 2025 included the FAA's flight cuts during the federal shutdown (5.6% of Dallas–Houston flights cancelled), and July 2024 included the CrowdStrike outage (5.2%). Averaging the seasonal change over three years keeps one bad month from skewing the inputs, but a real result from a bad month will still read worse than usual.
- **Don't use the same data for the inputs and the real result.** At first, Dallas–Houston used November 2025 for both and matched exactly. With inputs from July 2026 plus the seasonal change, the engine lands 7% under a November that ran worse than usual.
- **A connection's real time depends on which one.** Each day's shortest Southwest connection from Omaha to Bozeman is the 6:25 a.m.; the 10:40 a.m. takes about 85 minutes longer. The script uses the shortest, which travel sites quote too.
- **Rome2Rio's itinerary average was close.** It said 289 minutes for Omaha–Bozeman; DOT's schedules give 267 for the shortest connection. Use DOT.
- **BTS's CSV quotes city names with commas in them** ("Dallas, TX"). Parse it properly.
- **OSRM may run slow on highways.** It gave Dallas–Houston 4 h 14 min, a little longer than the 3½ to 4 hours usually quoted. Watch for a pattern across trips before tuning anything.
- **Southwest's route pages hold a fare calendar** in the page's data, so Southwest routes are quick to gather. Other airlines' pages don't; the first non-Southwest trip will show what works for them.
- **Some figures have several sources that disagree.** Bozeman's December rental average was $135, $169, or $231 depending on the site. Record the one used and the others in `notes`.
- **Families eat differently.** A hotel breakfast is usually free, and meal stops with children run longer than 30 minutes.
- **Prefer one source for a whole table.** IIHS covers every state's road death rate in one place, GSA's API covers every city's rates, and EIA covers every gas region; that's quicker and more consistent than searching state by state.
- **Bag fees move.** Southwest started charging in 2025 and raised fees in April 2026. Check the airline's current fee for each trip.
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
| The delay data job's average | Not built yet | Must count early arrivals: Dallas–Houston averages 9 minutes that way and 17 counting only late flights. Only the first adds up to the real flight time | Dallas–Houston |
| Delay on a connection | Each flight's delay added (2 × 15 min) | The real connection ran 10 minutes over schedule; the layover absorbs most of the first flight's delay | Omaha–Bozeman |
| Expected delay below zero | Shown as is: "Expected delay −5 min" | Dallas–Houston's November estimate is −3.7 minutes, since flights usually land early. It's right in the math, but a negative delay line may confuse people; it could be folded into the flight time instead | Dallas–Houston |
| When flights leave | Not modeled | The shortest connection may be at dawn; the next one can add 1½ hours | Omaha–Bozeman |

## Coverage

Twenty trips that test the same thing are worth less than five that don't. Each new trip should add something on this list that the set doesn't have yet.

More hand-built trips are paused at two: without observed data behind them, more trips mostly add judgment calls. The set grows again with real trips (from users' "How did it go?" reports, or anyone's own trip with times and receipts), or when a new source makes a part observable, such as drive times.

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
| 3 | Los Angeles → San Francisco | Couple; California gas; large airports; rideshare both ways; not Southwest | |
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
