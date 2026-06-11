# Test Architecture — v1.1 Prep

Closes [#239](https://github.com/jml6m/fas-js/issues/239). Parent epic: [#241](https://github.com/jml6m/fas-js/issues/241).

## Goals

Tests prove **workflows and contracts**, not line coverage for its own sake. Every v1.1 prep PR must keep the public API stable and the published `lib/` artifacts faithful to `src/`.

## Layout

| File | Purpose |
|------|---------|
| `test/api-contract.spec.js` | Public API shape and minimal behavior via `src/` (tsx loader) |
| `test/api-artifact.spec.js` | Same contract exercised through **built** `lib/index.js`, `lib/index.cjs`, and `lib/bundle.js` (#235) |
| `test/error-codes.spec.js` | Stable catalog for `E-001` … `E-013` — exact `error.message` strings (#237) |
| `test/workflows.spec.js` | Generated complete DFAs; `simulateFSA` vs `stepOnceFSA` equivalence (#240) |
| `test/digraph-cli.spec.js` | CLI-style golden DOT string for a large ring machine (#236) |
| `test/dfa.spec.js`, `test/nfa.spec.js` | Automaton construction and `createFSA` integration |
| `test/simulators.spec.js` | Simulation edge cases and type guards |
| `test/components.spec.js`, `test/utils.spec.js` | Component and utility unit tests |

## Execution

```bash
npm test   # build (tsup) → c8 coverage → mocha test/**/*.spec.js
```

- **Loader**: `tsx` imports TypeScript from `src/` in most specs.
- **Artifacts**: `api-artifact.spec.js` imports `lib/` **after** `npm run build` (enforced by the `test` script).
- **Coverage**: 90% floor on lines, statements, functions, and branches (`.c8rc.json`). See [coverage-policy.md](./coverage-policy.md).

## Principles

1. **Artifact fidelity** — consumers use `lib/`; artifact tests are mandatory (#235).
2. **Error stability** — thrown messages are part of the contract; one catalog test per code (#237).
3. **Workflow-first** — prefer generated machines and end-to-end simulate/step paths over isolated line hits (#240).
4. **No coverage hacks** — do not add tests whose only purpose is `logging: true` or similar (#238).
5. **Digraph** — golden **DOT strings** in Node tests; browser graph rendering is manual/demo QA, not image snapshots (#236).

## Related issues

- #235 — `lib/` artifact tests
- #237 — error catalog
- #238 — prune coverage-driven tests; sync policy docs
- #240 — generated FSA workflows
- #236 — digraph CLI golden