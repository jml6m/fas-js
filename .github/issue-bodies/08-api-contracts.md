Add golden/contract tests for the public API before any modernization PRs land:

- `createFSA(Q, Σ, δ, q0, F)` — DFA and NFA creation, validation errors
- `simulateFSA(w, fsa, ...)` — acceptance, rejection, `returnEndState`
- `stepOnceFSA(w, qin, fsa, ...)` — single-step transitions

**Deliverables:**
- Contract test file(s) that must pass on every Phase 3 PR
- Documented breaking-change process (major version only)