# Ride or Fly engine

The open-source scoring engine behind [Ride or Fly](https://rideorfly.app), a tool that helps people decide whether to drive or fly for a one-way trip in the US. It weighs time, cost, and comfort.

**Status:** in development. Nothing is published yet.

## What it does

The engine takes a trip's answers (where, when, who's going, and how they'd get around) and the data the app looked up (drive times, fares, gas prices, and other rates). It turns them into line items for each side, adds them up, and scores time, cost, and comfort. Then it decides which way the numbers lean: Ride or Fly, and how clearly.

It also holds the prompt for Our take, the AI's recommendation, along with the exact input the AI is sent and the check its answer must pass.

It's a pure function. The same inputs always give the same result, and it never calls an API, holds a key, or sees affiliate or commission data. That's the point of publishing it: anyone can confirm that what Ride or Fly earns from bookings plays no part in the verdict.

## What's here

| Part | What it is |
| --- | --- |
| The engine | Line items, scoring, and the verdict, published to npm as `@rideorfly/engine` |
| Default assumptions | The starting values the engine uses when there's no data, each one editable on the site |
| Our take prompt | The exact prompt sent to the AI, with its version |
| Test matchups and benchmark trips | Sample trips with expected results, and real trips used to check the engine's accuracy |

The public data the app passes in, such as DOT flight history and gas prices, comes from a separate public `data` repo (coming), along with a monthly accuracy report on the engine's flight-time estimates. Reports and other news are announced at [open.rideorfly.app](https://open.rideorfly.app), the organization's GitHub Discussions.

## Using it

```ts
import { checkTake, score, validateAnswers } from '@rideorfly/engine';

const problems = validateAnswers(answers);

// Answers and lookups in; every line, the comfort breakdown, and the verdict out.
const result = score(answers, lookups, edits);

result.verdict; // 'ride' or 'fly'
result.confidence; // 'toss-up', 'leans', or 'clear'
result.ride.lines; // each with its value, source tag, and the value Ours used
```

The engine never fetches anything. The app looks up the drive, the fare, and the rates, and passes them in as `lookups`. Every shape that goes in or comes out is in [`src/types.ts`](src/types.ts), and every assumption the engine makes, with the reason for it, is in [`src/defaults.ts`](src/defaults.ts).

## How it decides

1. **Lines.** Each side gets cost and time lines, door to door: fuel and wear, hotel stops, meals on the road, fares, bags, getting to and from the airports, the time at the airport, the flight, and expected delays. Each line's total is rounded to $5 or 5 minutes, since these are estimates to help decide, not a budget.
2. **The clock.** Both sides leave at 8:00 a.m. The drive is laid out on the clock, so meals and night driving are counted the same way for both sides.
3. **Comfort.** Both sides start at 7 out of 10, and named adjustments move them: long days, night driving, road risk by state, winter passes, connections, delay odds, children, pets, and the traveler's own preference.
4. **The verdict.** Cost, time, and comfort each become a lean toward Ride or Fly, weighted 40%, 35%, and 25% by default. The weighted sum is the verdict, and its size is the confidence.

## Development

You'll need Node 24 (see `.nvmrc`).

| Task | Command |
| --- | --- |
| Install | `npm install` |
| Run the tests | `npm test` |
| See which lines the tests never reach | `npm run coverage` |
| Check formatting and lint | `npm run check` (`npm run format` fixes what it can) |
| Check types | `npm run typecheck` |
| Build `dist/engine.min.js` and print its integrity hash | `npm run build` |
| Everything CI runs | `npm run verify` |

Test data is made up. It never comes from Google, whose route results can't be stored.

## Checking the live site

Once releases begin, each one is built by GitHub Actions, attached to its GitHub release, and published to npm with provenance, which links the package to the exact commit it was built from. Ride or Fly will serve that file unchanged and list its version and hash on its Verify page, so anyone can compare the code running on the site with the code here.

## License

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

The license covers the code, not the brand. The "Ride or Fly" name and logo are trademarks and aren't licensed for reuse.
