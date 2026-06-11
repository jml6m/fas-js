Define the target `package.json` `main` / `module` / `exports` fields and build artifacts for v1.1.

**Constraints:**
- `lib/bundle.js` UMD must continue working for jsDelivr CDN users (`fasJs` global)
- npm consumers may get ESM + CJS dual package

**Deliverables:**
- Proposed `package.json` exports map
- Bundler choice (`tsup`, `rollup`, or other) with rationale
- Migration steps from Browserify + Babelify + tinyify