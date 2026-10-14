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
| `LICENSE` | Apache License 2.0, the official text |
| `NOTICE` | Copyright and the trademark note |
| `README.md` | Public description of the engine |

## Commands

None yet. Tooling (TypeScript, Vitest, esbuild, Biome) comes in the first pull request.
