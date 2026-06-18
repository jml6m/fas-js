# Function annotation protocol

Only **foundational** math boundaries use `@fas-correctness` labels. Everything else uses normal comments if needed.

Grep anchors: `@fas-correctness`, `@theorem-implemented-test`, `@coverage-caveat`

## Source (`src/`) — two labels only

| Label                 | When                                                   | Example                       |
| --------------------- | ------------------------------------------------------ | ----------------------------- |
| `DEFINITIONAL`        | Direct encoding of a formal definition                 | `contains` = M accepts w      |
| `THEOREM-IMPLEMENTED` | Standard TOC construction; proof cited, not duplicated | `subsetConstruction`, `toDFA` |

### Minimal source template

```text
/**
 * @fas-correctness DEFINITIONAL | THEOREM-IMPLEMENTED
 * @fas-spec <one-line definition or theorem citation>
 */
```

Optional non-math comments (algorithm steps, dead-state rationale) are plain prose — **not** part of this template.

`THEOREM-IMPLEMENTED` functions must include:

```text
/* @coverage-caveat: c8 line/branch 100% on this function ≠ verified for all inputs in Σ* — fixture instances only */
```

## Tests — one label for foundational verification

| Label                       | When                                                               |
| --------------------------- | ------------------------------------------------------------------ |
| `@theorem-implemented-test` | Verifies a `DEFINITIONAL` or `THEOREM-IMPLEMENTED` source function |

Place on the `describe` or `it` block:

```javascript
// @theorem-implemented-test — structural subset witness + acceptance smoke
```

### Required pairing

| Source `@fas-correctness` | Test requirement                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| `DEFINITIONAL`            | At least one `@theorem-implemented-test`                                                                  |
| `THEOREM-IMPLEMENTED`     | `@theorem-implemented-test` via structural witness assertions (`test/helpers/subsetWitnessAssertions.js`) |

### No `maxLength` / no EXHAUSTIVE-BOUNDED

Do **not** use arbitrary word-length caps, `languagesEquivalent`-style sampling, or bounded enumeration to claim theorem verification. Powerset construction is verified by **structural witnesses** (L1–L4) plus **minimal acceptance smoke** on witness words — not by enumerating Σ^≤n.

### Strictly prohibited

- Treating **c8 coverage %** as proof of a theorem or Σ\* correctness.
- Equivalence oracles in **`src/`**.
- Naming spot-checks “equivalent”, “iff”, or “proved”.

## Powerset construction reference

`subsetConstruction` / `toDFA()` implement:

- \(q'\_0 = E(\{q_0\})\)
- \(\delta'(R, a) = E\left(\bigcup\_{r \in R} \delta(r, a)\right)\)
- \(F' = \{ R \in Q' \mid R \cap F \neq \emptyset \}\)
- Explicit `dead` when \(\delta'\) is \(\emptyset\) (complete DFA for simulation)

**Theorem (L5, cited):** Sipser Thm. 1.19 — every NFA has an equivalent DFA. See [`subset-construction.md`](subset-construction.md).

Tests assert structural witnesses via `subsetOf` and minimal acceptance smoke on canonical NFA fixtures.
