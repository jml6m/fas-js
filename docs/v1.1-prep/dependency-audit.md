# Dependency Audit — fas-js v1.1 Prep

Closes [#214](https://github.com/jml6m/fas-js/issues/214).

## Production dependencies (`dependencies`)

| Package | Version | Purpose | v1.1 recommendation |
|---------|---------|---------|---------------------|
| `@babel/runtime` | 7.6.0 | Babel transpiled helpers in bundle | **Remove** after TypeScript + modern bundler (Phase 3) |
| `chalk` | 2.4.2 | Console logging in simulators | **Move to devDependency** or remove; should not ship in published bundle |
| `core-js` | 3.2.1 | `@babel/preset-env` polyfills via `useBuiltIns: usage` | **Remove** from prod; target Node 18+ and modern browsers in Phase 3 |
| `regenerator-runtime` | 0.13.3 | Async generator support via Babel | **Remove** with preset-env change |

**Published bundle today:** Browserify inlines chalk, core-js polyfills, and Babel helpers into `lib/bundle.js`. The npm `files` field only ships the bundle, but the bundle is larger than necessary.

## Dev dependencies (build & test)

| Package | Version | Purpose | v1.1 recommendation |
|---------|---------|---------|---------------------|
| `@babel/*` + `babelify` | 7.6.x | Transpile Flow → JS for Browserify | **Replace** with TypeScript + `tsup`/`rollup` (Phase 3) |
| `browserify` + `tinyify` | 16.x / 2.x | UMD bundle | **Replace** with dual ESM/CJS/UMD build (Phase 3) |
| `flow-bin` | 0.107.0 | Type checking | **Replace** with `typescript` (Phase 3) |
| `mocha` + `chai` | 6.2 / 4.2 | Test runner | **Upgrade** to Mocha 10+ or migrate to `node --test` (Phase 3) |
| `nyc` | 17.1.0 | Coverage (upgraded #220) | **Replace** with `c8` when migrating test stack |
| `cross-env` | 6.0.0 | `NODE_ENV=test` for istanbul | **Keep** until test stack migration |
| `pre-commit` | 1.2.2 | Local git hook | **Remove** in Phase 3; CI-only gates |
| `rimraf` | 3.0.0 | Clean `lib/` | **Upgrade** to rimraf 5+ or use `node:fs` rm |

## Safe to remove after Phase 3

- Entire Babel + Flow + Browserify toolchain
- `chalk`, `core-js`, `@babel/runtime`, `regenerator-runtime` from any published artifact
- `pre-commit` package

## Keep through v1.1 release

- Current Browserify pipeline until TypeScript migration PR lands
- `nyc` 17.x (Windows + Node 22 compatible)