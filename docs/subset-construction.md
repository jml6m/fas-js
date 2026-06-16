# Subset construction (`toDFA`)

Internal API: `RegularLanguage.toDFA()` and `subsetConstruction()` in `src/languages/`. Not exported from the npm package (`createFSA`, `simulateFSA`, `stepOnceFSA` only).

## Theorem (cited, not proved in code)

**Theorem 1.19** (equivalence of NFAs and DFAs): Every nondeterministic finite automaton has an equivalent deterministic finite automaton.

Reference: Michael Sipser, *Introduction to the Theory of Computation*, 3rd ed., Theorem 1.19 (subset / powerset construction).

Language equivalence \(L(M) = L(N)\) over \(\Sigma^*\) follows from that theorem. fas-js does **not** attempt a machine-checked proof of L5.

## What we implement

Powerset construction with ε-closure:

- \(q'_0 = E(\{q_0\})\)
- \(\delta'(R, a) = E\left(\bigcup_{r \in R} \delta(r, a)\right)\)
- \(F' = \{ R \in Q' \mid R \cap F \neq \emptyset \}\)
- explicit `dead` when \(\delta'\) yields \(\emptyset\) (complete DFA for simulation)

## What we verify in CI

| Layer | Claim | Mechanism |
|-------|-------|-----------|
| L1–L4 | Construction matches the definition | Structural `subsetOf` witness + `assertSubsetStructuralWitness` in `test/languages.spec.js` |
| Smoke | Acceptance agrees on witness words | `assertAcceptanceSmoke` — regression only, not \(\Sigma^*\) |
| L5 | Language preserved | Cited theorem above; `@coverage-caveat` on source |

See also [`function-annotation-protocol.md`](function-annotation-protocol.md) and [`languages-testing.md`](languages-testing.md).