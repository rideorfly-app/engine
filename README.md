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
| Data jobs | Monthly and yearly scripts that turn public data (such as DOT flight records) into the files the engine reads |
| Reports and posts | A site at open.rideorfly.app (coming), with monthly accuracy reports |

## Checking the live site

Once releases begin, each one is built by GitHub Actions and published to npm with provenance, which links the package to the exact commit it was built from. Ride or Fly will serve that file unchanged and list its version and hash on its Verify page, so anyone can compare the code running on the site with the code here.

## License

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

The license covers the code, not the brand. The "Ride or Fly" name and logo are trademarks and aren't licensed for reuse.
