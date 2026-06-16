# Regular-language tests — what they verify

`test/languages.spec.js` exercises `src/languages/` (CLI-only in v1.6; not the browser demo).

Annotation rules: [`function-annotation-protocol.md`](function-annotation-protocol.md) (minimal — `DEFINITIONAL` / `THEOREM-IMPLEMENTED` only).

Theorem citation for language equivalence: [`subset-construction.md`](subset-construction.md).

## Foundational tests (`@theorem-implemented-test`)

| Source | Test |
|--------|------|
| `contains` (`DEFINITIONAL`) | `contains(w) agrees with simulateFSA(M, w)` |
| `subsetConstruction` / `toDFA()` (`THEOREM-IMPLEMENTED`) | Structural `subsetOf` witness (L1–L4) + minimal acceptance smoke |

No `maxLength` word enumeration. Powerset construction is verified by **structural witnesses** per canonical NFA — not by sampling Σ^≤n.

## Coverage caveat

`test/languages.spec.js` emits `[fas-js @coverage-caveat]` on stderr. **c8 100% on `subsetConstruction` / `toDFA` does not mean Σ* verification** — only that fixture instances were exercised.

## Other tests

Union / concat / star closure and membership edge cases are ordinary regression tests (witness words or spot checks) — not `@theorem-implemented-test`.

## Commands

```bash
npm run test:languages
```