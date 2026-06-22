# Security Remediation Plan

Closes [#222](https://github.com/jml6m/fas-js/issues/222).

## Current state (post nyc 17 upgrade)

`npm audit` reports vulnerabilities in **transitive** dependencies of the legacy Browserify/Babel tree. Most are dev-only and do not ship in `lib/bundle.js`.

## Categorization

| Category | Action | Examples |
|----------|--------|----------|
| **Fix now** | Safe patch bumps via Dependabot | `debug`, `minimist` patches |
| **Fix with toolchain upgrade** | Resolved by removing Browserify/Babel | `elliptic`, old `glob`, `browserify` tree |
| **Accepted risk (dev-only)** | Document until Phase 3 | Nested audit findings in unused code paths |

## CI policy recommendation

Change `npm audit --audit-level=high` from `continue-on-error: true` to **fail** on `main-v1-1-prep` once Phase 3 toolchain lands. Keep `continue-on-error` on `master` until v1.1 merges.

## Ordered remediation PRs (Phase 3)

1. Toolchain swap (TypeScript + tsup) — eliminates largest transitive tree
2. Regenerate `package-lock.json` with `npm ci` clean install
3. Enable audit failure in CI on `main-v1-1-prep`
4. Triage any remaining production-bundle findings separately
