# Phase 3 Readiness Checklist

Use this before starting the TypeScript + tsup modernization PR stack.

## Completed in Phase 2 (this milestone)

- [x] Governance: CONTRIBUTING, issue templates, PR template, branch rules
- [x] Windows `npm test` fix (#220, nyc 17)
- [x] API contract tests (#221)
- [x] Audit docs: dependencies, dependabot, build spec, TS plan, test runner, coverage, security
- [x] Demo v1.1 in-repo + GitHub Pages workflow (#223) — <https://jml6m.github.io/fas-js/v1.1/>
- [x] README + demo links (#224)
- [x] Release runbook (#225)

## Phase 3 PR stack (recommended order)

1. **Test stack** — Mocha 10 + c8, raise coverage to 100%
2. **TypeScript migration** — all `src/` → `.ts`, remove Flow
3. **tsup build** — ESM + CJS + UMD per [build-target-spec.md](./build-target-spec.md)
4. **Dependency cleanup** — remove chalk/core-js/babel runtime from bundle
5. **Security** — fail CI on high audit findings
6. **pre-commit removal** — CI-only gates

## Merge gate (every Phase 3 PR)

```bash
npm ci
npm test
# api-contract.spec.js included in test suite
```

## Human decisions deferred to Phase 3 start

- Exact npm version number for v1.1 release (`1.4.0` vs `1.3.3`)
- Whether to fail `npm audit` immediately or after toolchain PR
