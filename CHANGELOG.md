# Changelog

Every change that can move a result (a formula, a default, or a threshold) is a new minor version, and is listed here with what moved.

## 0.1.0 (unreleased)

The first version of the engine.

- Ride and Fly cost and time lines, door to door, each rounded to $5 or 5 minutes. Drive times come without traffic for the MVP; the rush-hour note appears only once the app passes a time without traffic beside a traffic-aware one.
- The 8:00 a.m. travel clock for rest stops, meals, and night driving.
- Comfort from named adjustments, starting both sides at 7.
- The verdict: cost 40%, time 35%, comfort 25%; a toss-up below 0.05, leans below 0.15.
- The user's edits, Ours vs. Yours, and meaningful changes.
- Airport ranking and the too-close-to-fly check.
- Flight reliability is two figures: the chance of a delay (15 minutes or more late, as DOT counts it, `delayChance`) and the chance of a disruption (cancelled or diverted, `disruptChance`). DOT's monthly rows use the same names, `delayShare` and `disruptShare`.
- The expected delay never goes below zero. DOT's average counts early arrivals, so when a route's flights usually land early, the time saved comes off the flight time instead.
- The expected delay for the month of travel, from DOT's monthly rows: the route's figures for the same month of the year, averaged over the past five years and skipping 2020. A small route counts for less and its two airports' figures for that month for more: a route with 100 flights a month counts half, a busier one more. A route with no past year for the month starts from its newest month. The newest month alone and the same month last year are offered too, for the accuracy report to compare.
  - Chosen by the accuracy report's first run, 36 months from 2023 to 2025, estimating 3 and 6 months ahead. Per route, the average delay was off by 7.6 minutes, against 9.5 for the same month last year, 10.1 for the newest month plus the seasonal change averaged over three years, and 11.2 for the newest month alone. It was best in each of the three years. The seasonal-change method it replaced was dropped, and so was a nudge for how the current year is running, which didn't improve it.
  - It runs about 2 minutes optimistic overall, because delays have crept up and the older years in the average pull it down.
- A rental for the drive is charged for each 24 hours from pickup to drop-off, so a drive straight through that runs past a day counts two days.
- Every result carries the engine, prompt, and data versions.
- Our take: prompt `take-v1`, its input, named figures, the output check, and the code-written summary.
