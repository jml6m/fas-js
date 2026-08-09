# Coverage Policy — Workflow-First

## Philosophy

Coverage is a **sanity check**, not the definition of done. Tests must prove **workflows and contracts** (API behavior, error codes, artifact fidelity, generated-machine equivalence). Do **not** add tests whose only purpose is to execute an uncovered line — we want to enforce correct functionality not just satisfy arbitrary metrics.

## Targets

| Branch | Gate (c8) |
|--------|-----------|
| `master` | **90%** lines, statements, functions, branches |
| version integration branches | **90%** lines, statements, functions, branches |

Aspire toward higher coverage when it falls out naturally from meaningful tests. The floor is ~90%; there is no reward for 100% line hits without behavioral assertions.

High coverage on language algorithms means fixture instances were exercised, not full input-space verification. TypeScript catches structural mistakes; tests catch behavior.

## CI config

See [`.c8rc.json`](.c8rc.json) — all four metrics at 90%. Interface-only files and barrel `index.ts` re-exports are excluded.

### Coverage scope excludes `scripts/`

`.c8rc.json` `include` is `src/**/*.ts` only — the CI guards under `scripts/` are **deliberately outside** line-coverage scope. Two reasons:

1. A guard *executes* during `check:security` (part of `npm test`), so incidental execution would report it as "covered" even with no dedicated test — coverage cannot answer "does every guard have a real test?".
2. The guards are `.mjs` run as subprocesses / side-effecting imports; measuring their lines would be noisy and would reward incidental execution over behavioral assertions — the opposite of this policy.

Guard-test completeness is therefore enforced **structurally**, not by coverage: see below.

## Guard-test completeness gate

Every guard script (`scripts/check-*.mjs`) must ship a matching unit-test spec (`test/check-*.spec.js`). This is enforced fail-closed by [`scripts/check-guard-tests.mjs`](scripts/check-guard-tests.mjs) (run via `check:security` in `npm test` and CI): adding a `check-*.mjs` without its spec fails CI. The gate is itself a `check-*.mjs` and so is subject to its own rule (it ships with [`test/check-guard-tests.spec.js`](test/check-guard-tests.spec.js)). This closes the gap where [`check-public-api.mjs`](scripts/check-public-api.mjs) shipped untested — structural, independent of line coverage.

## Exception process

Only for genuinely unreachable defensive code:

1. Inline comment: `// coverage:ignore-next-line — reason, see #NNN`
2. Linked GitHub issue
3. Reviewer approval

## Related work

- #238 — prune coverage-driven tests; align docs with enforced thresholds
- #235 — validate `lib/` artifacts, not only `src/` via tsx
- #240 — property-based / generated DFA checks
