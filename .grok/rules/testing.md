# Testing

This repo is a TypeScript FSA library. Tests protect the public API contract and library behavior.

## Principles

- Tests live in `test/` as `*.spec.js` files, run via Mocha with the `tsx` loader (`cross-env NODE_OPTIONS=--import=tsx`).
- Prioritize workflow/contract tests (`api-contract`, `api-artifact`, `error-codes`) over line-hit goals.
- Coverage threshold is **90%** lines, statements, functions, and branches (enforced by `.c8rc.json` in `npm test`).
- Do not introduce coverage-only hacks — every assertion should test real behavior.
- Keep tests deterministic: same FSA input always produces the same output.

## Layered validation

1. **Every task** — `npm test` + `npm run lint` (ESLint + encoding gate) + `npm run audit:ci` (separate audit gate). Never skip these.
2. **Library changes** — add/extend a unit test for the changed behavior in the relevant suite (`dfa`, `nfa`, `simulators`, `components`, `utils`, etc.).
3. **New error codes** — add to `test/error-codes.spec.js` to lock the error catalog.
4. **API surface changes** — update `test/api-contract.spec.js` and `test/api-artifact.spec.js`.

Match depth to what you touched, but never skip lint + test. Call out residual risk when a layer could not be exercised locally.

## Running a single suite

```bash
cross-env NODE_OPTIONS=--import=tsx npx mocha "test/dfa.spec.js"
```
