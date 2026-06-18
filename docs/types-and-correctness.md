# Types vs correctness

TypeScript (`npm run typecheck`) catches **structural** mistakes at build time: wrong argument types, missing fields, passing a DFA where an NFA is required, inconsistent return shapes.

It does **not** prove that an algorithm preserves language equivalence or matches a textbook construction. That still depends on tests and review.

Practical split:

- **Types** — API shape, DFA vs NFA boundaries, simulator input/output contracts.
- **Tests** — behavior on fixtures, structural checks where we have an independent reference in `test/helpers/`.
- **No** bounded `maxLength` equivalence oracles in `src/`.