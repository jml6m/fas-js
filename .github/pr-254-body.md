## Summary

**v1.6.0** — demo UX handoff, subset-construction verification, and npm security gates. Merges to `master`.

Closes #255.

## Demo (v1.6 UX on `/v1.5/` path)

- Example-first dropdown, auto-build, graph + simulation two-column layout
- Custom machine JSON in the Machine panel
- Graphviz init fix; static server `/v1.5` + `/v1.5/`; port **3200** (`npm run serve:demo`)
- Golden preset simulate tests (`test/demo-presets-golden.spec.js`)

**Local QA:** `npm run build && npm run serve:demo` → http://127.0.0.1:3200/v1.5/

## Languages / `toDFA()` (internal)

- `subsetConstruction` with structural `subsetOf` witness map
- `@theorem-implemented-test`: L1–L4 witness assertions + minimal acceptance smoke
- L5 (language equivalence): Sipser Thm. 1.19 cited in `docs/subset-construction.md` — not proved in code
- `toDFA()` remains **internal** — not in npm public API

## Security gates (v1.6)

- `npm run check:security` — public API surface lock + `npm pack` allowlist
- CI `security` job: `npm audit --audit-level=high` (fails on high)
- `test/api-artifact.spec.js` + demo bundle: exact three-function export + internal denylist
- Published tarball: `lib/` only (no `src/`, `test/`, `demo/`)

## Public API (unchanged)

`createFSA`, `simulateFSA`, `stepOnceFSA` — verified on `lib/index.js`, `lib/index.cjs`, `lib/bundle.js`, demo vendor bundle.

## Branch workflow

Updated `AGENTS.md` / `CONTRIBUTING.md`: one version integration branch off `master`; topic branches stack on it; release merges to `master` + tag.

## Test commands

```bash
npm ci
npm test
npm run test:languages
npm run test:presets
npm run serve:demo
```

## Release

After merge: tag `v1.6.0` → OIDC publish workflow (npm environment approval).