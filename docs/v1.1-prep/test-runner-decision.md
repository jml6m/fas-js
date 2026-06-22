# Test Runner Decision

Closes [#218](https://github.com/jml6m/fas-js/issues/218).

## Options evaluated

| Option | Pros | Cons |
|--------|------|------|
| **Mocha 10 + Chai + nyc/c8** | Minimal test rewrite; familiar API | Extra deps; nyc being phased out |
| **Node `node --test` + assert** | Zero test-runner dep; built-in | Rewrite 62 tests; Chai matchers lost |

## Recommendation: **Mocha 10 + c8**

Aligns with incremental migration:

1. Phase 3a: Upgrade Mocha 6 → 10, keep Chai, swap nyc → c8
2. Phase 3b (optional later): Migrate to `node --test` if desired

`node --test` is attractive long-term but rewriting 5 spec files for marginal gain delays the TypeScript migration. Mocha 10 works with ESM/CJS and has stable Chai integration.

## Coverage tool: **c8**

- Native V8 coverage (faster, Node 18+)
- Drop-in replacement for nyc CLI flags
- Target: `--check-coverage --lines 100` on `main-v1-1-prep`

## Migration plan

1. Add `c8` devDependency; configure in `package.json` or `.c8rc.json`
2. Update `npm test` script
3. Verify Windows + Linux CI (regression for #220)
4. Proceed with TypeScript migration
