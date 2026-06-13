# Fast Iteration

Some problems need a quick probe before they belong in tests or the library. Use short-lived scripts to learn fast, then promote or delete.

## When to reach for a scratch script

- You need to exercise one FSA function (`simulateFSA`, `stepOnceFSA`, `createFSA`) in isolation.
- You want to see exactly what a specific automaton accepts/rejects without committing to a test.
- A bug only shows up for a specific input string or state-transition combination.

Prefer a 20-line probe over guessing from static reading.

## Conventions

- Put any reusable probe in `scripts/scratch/` with a descriptive name; run with `node scripts/scratch/<file>.mjs`.
- Import from `src/` (via `tsx`) instead of copying logic inline.
- Keep the library itself dependency-free and simple — do not pull new deps in just to debug.
- Delete or promote when done. Do not leave debug probes in `src/` or `test/`.

## Promoting to durable automation

Promote a probe when the check will be re-run after future changes and is stable enough to assert on:

1. Move it into a proper spec under `test/` (Mocha auto-discovers `*.spec.js`).
2. Add an `npm run` script only if it will be used routinely.
3. Remove the scratch original.

## What not to do

- Do not hardcode absolute paths or secrets in probes.
- Do not add permanent `package.json` scripts for one-off investigations.
- Do not patch coverage gaps with assertions that assert nothing meaningful — the 90% threshold is a floor, not a target.
