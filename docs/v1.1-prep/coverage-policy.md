# Coverage Policy — Workflow-First (v1.1)

Closes [#219](https://github.com/jml6m/fas-js/issues/219). Revised per maintainer direction in epic [#241](https://github.com/jml6m/fas-js/issues/241).

## Philosophy

Coverage is a **sanity check**, not the definition of done. Tests must prove **workflows and contracts** (API behavior, error codes, artifact fidelity, generated-machine equivalence). Do **not** add tests whose only purpose is to execute an uncovered line — especially legacy logging branches.

## Targets

| Branch | Gate (c8) |
|--------|-----------|
| `master` | **90%** lines, statements, functions, branches |
| version integration branches | **90%** lines, statements, functions, branches |

Aspire toward higher coverage when it falls out naturally from meaningful tests. The floor is ~90%; there is no reward for 100% line hits without behavioral assertions.

High coverage on language algorithms means fixture instances were exercised, not full input-space verification. See [`../types-and-correctness.md`](../types-and-correctness.md).

## CI config

See `.c8rc.json` — all four metrics at 90%. Interface-only files and barrel `index.ts` re-exports are excluded.

## Exception process

Only for genuinely unreachable defensive code:

1. Inline comment: `// coverage:ignore-next-line — reason, see #NNN`
2. Linked GitHub issue
3. Reviewer approval

## Related work

- [`test-architecture.md`](./test-architecture.md) — full test layout and principles (#239)
- #238 — prune coverage-driven tests; align docs with enforced thresholds
- #235 — validate `lib/` artifacts, not only `src/` via tsx
- #240 — property-based / generated DFA checks