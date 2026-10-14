# Ride or Fly: engine

The public, open-source scoring engine for Ride or Fly (Apache 2.0). It turns a trip's answers and the app's lookup data into line items, scores time, cost, and comfort, and decides which way the numbers lean. It also holds the Our take prompt, the input builder, the output check, and the batch data jobs. The full design is "The scoring engine" section of `../MVP Plan.md`, which is the source of truth. Check it before changing a formula or default, and point out anything that conflicts with it.

The private `app` repo installs this package at one exact version. The app depends on the engine, never the reverse.

## About the owner

The owner is a web developer who builds custom WordPress themes and plugins. Infrastructure and DevOps are outside their usual work.

- Explain command-line, npm, and GitHub Actions steps plainly, and say what each command does before asking them to run it.
- When something resembles WordPress, use the comparison.
- The owner doesn't travel, so travel-domain defaults (weights, fees, buffers, comfort values) are Claude's call, with a short rationale. Product, scope, legal, and brand decisions are the owner's.
- Never push to `master`, merge a pull request, push a version tag, or publish to npm without asking first.

## Rules

- **This repo is public.** Nothing private goes in: no secrets, no API keys, no affiliate or commission data, no app code, and no user data.
- **Never commit Google's route results**, including drive times or distances copied from Google Maps. Google's terms forbid storing them. Test data and benchmark trips use made-up drive figures or OpenStreetMap-based routing, credited.
- **The engine stays pure.** No network calls, no Cloudflare or Node-only dependencies, no reading the clock or randomness inside scoring. The same inputs must always give the same output, in the browser and on the server.
- **Any change that can move a result** (a formula, a default, a threshold) is a new minor version, with a changelog entry saying what moved.
- **The npm package holds only the built engine,** the prompt, and the default assumptions. The site, posts, benchmark trips, and data jobs stay out of it, so they never change its hash.

## Files

| Path | What it is |
| --- | --- |
| `src/index.ts` | The public API: everything the app imports |
| `src/types.ts` | The data model: answers, lookups, edits, and the result |
| `src/units.ts` | Names for plain numbers (`Dollars`, `Minutes`, `Miles`, ...) |
| `src/defaults.ts` | Every assumption and estimate, with its reason |
| `src/score.ts` | `score()`: builds Ours and Yours, applies edits, decides |
| `src/ride.ts`, `src/fly.ts` | Each side's cost and time lines |
| `src/clock.ts`, `src/sun.ts` | The 8:00 a.m. travel clock: stops, meals, night driving |
| `src/comfort.ts`, `src/verdict.ts` | Comfort adjustments, leans, verdict, confidence |
| `src/compare.ts` | Ours vs. Yours, and meaningful changes |
| `src/airports.ts` | Ranking airport pairs; too close to fly |
| `src/notes.ts` | "You'd have missed this" notes |
| `src/validate.ts` | Ranges for answers and assumptions |
| `src/take/` | Our take: the prompt, its input, figures, the check, filling, and the code-written summary |
| `test/` | Vitest tests; `test/fixtures.ts` has the sample matchups (made-up figures) |
| `scripts/build.mjs` | Builds `dist/engine.min.js` reproducibly and prints its integrity hash |
| `scripts/smoke.mjs` | Imports the built file and scores a matchup |
| `benchmarks/` | Real trips for Phase 1's accuracy gate; its README has the format, how to gather a trip, lessons, and the coverage slate |
| `scripts/benchmarks.mjs` | Scores each benchmark trip and compares it to the real figures |
| `CHANGELOG.md` | What moved in each version |

## Commands

| Task | Command |
| --- | --- |
| Install | `npm install` |
| Tests | `npm test` |
| Format and lint (fix with `npm run format`) | `npm run check` |
| Types | `npm run typecheck` |
| Build and print the integrity hash | `npm run build` |
| Everything CI runs | `npm run verify` |
| Benchmark trips (after a build) | `npm run benchmarks` |

## Code style

The engine is open source, so it's written to be read.

- Tabs for indenting, single quotes, and Biome's formatting (`npm run format`).
- Short, helpful comments: why something is the way it is, not what the next line does. Every exported function gets a one-line doc comment, and so does any field whose meaning isn't obvious from its name.
- Precise types in the TypeScript itself, using the names in `src/units.ts`. They play the role PHPStan's docblock types play in PHP, checked on every build.
- Blank lines between steps, and section comments (`// --- The car ---`) in long functions.
