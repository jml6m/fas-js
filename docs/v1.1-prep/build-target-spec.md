# Build Target Spec — ESM, CJS, UMD

Closes [#216](https://github.com/jml6m/fas-js/issues/216).

## Constraints

- **UMD** `lib/bundle.js` with global `fasJs` must continue for jsDelivr CDN users.
- npm consumers should get **ESM + CJS** dual package in v1.1 release.
- Public API unchanged: `createFSA`, `simulateFSA`, `stepOnceFSA`.

## Target `package.json` exports (Phase 3)

```json
{
  "main": "./lib/index.cjs",
  "module": "./lib/index.js",
  "types": "./lib/index.d.ts",
  "exports": {
    ".": {
      "types": "./lib/index.d.ts",
      "import": "./lib/index.js",
      "require": "./lib/index.cjs"
    },
    "./bundle": {
      "default": "./lib/bundle.js"
    }
  },
  "files": ["lib"]
}
```

## Bundler choice: **tsup**

| Criterion | tsup | rollup | browserify (current) |
|-----------|------|--------|----------------------|
| TypeScript native | Yes | Via plugin | No |
| ESM + CJS + IIFE/UMD | Yes | Yes | UMD only |
| Config complexity | Low | Medium | Medium + Babel |
| Tree-shaking | Yes | Yes | Limited |

**Recommendation:** `tsup` for Phase 3 — single config produces ESM, CJS, and UMD (`globalName: fasJs`).

## Migration steps (Phase 3)

1. Add `tsup.config.ts` with three outputs.
2. Migrate `src/**/*.js` → `src/**/*.ts`; remove Flow.
3. Update `npm run build` to `tsup`.
4. Keep `lib/bundle.js` path stable for CDN.
5. Update demo Pages workflow to copy new bundle output (path unchanged).
6. Contract tests (#221) must pass throughout.