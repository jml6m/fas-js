# Regular-language tests

`test/languages.spec.js` covers `src/languages/` (internal; not the npm API or browser demo).

| Area | What tests check |
|------|------------------|
| `contains` | Agrees with `simulateFSA` on sample words |
| `union` / `concat` / `kleeneStar` | Sample words vs textbook membership helpers in `test/helpers/membershipAssertions.js` |
| `subsetConstruction` / `toDFA` | Structural witness L1–L4 (`test/helpers/subsetWitnessAssertions.js`) + sample-word agreement NFA vs DFA |
| DFA equivalence | `dfaLanguagesEqual` in `test/helpers/` (test-only; not in `src/`) |

Do not put bounded word enumeration or equivalence oracles in `src/`.

```bash
npm run test:languages
```