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
- The expected delay never goes below zero. DOT's average counts early arrivals, so when a route's flights usually land early, the time saved comes off the flight time instead.
- The expected delay for the month of travel, from DOT's monthly rows: the route's newest month plus its seasonal change, averaged over three past years and skipping 2020. A route with fewer than 100 flights in its newest month borrows its airports' seasonal pattern, or the nation's. The newest month alone and the same month last year are offered too, for the accuracy report to compare.
- A rental for the drive is charged for each 24 hours from pickup to drop-off, so a drive straight through that runs past a day counts two days.
- Every result carries the engine, prompt, and data versions.
- Our take: prompt `take-v1`, its input, named figures, the output check, and the code-written summary.
