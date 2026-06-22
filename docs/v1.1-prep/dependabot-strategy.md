# Dependabot Strategy — fas-js v1.1 Prep

Closes [#215](https://github.com/jml6m/fas-js/issues/215).

## Problem

`dependabot.yml` previously ignored nearly all meaningful upgrades, freezing a 2019-era stack and blocking security fixes.

## v1.1 prep policy

1. **GitHub Actions** — weekly grouped bumps (unchanged).
2. **npm** — monthly grouped bumps; ignores removed except where noted below.
3. **All npm PRs target `main-v1-1-prep`** via Dependabot branch naming; merge only when CI passes.
4. **No auto-merge** — human or agent review required.

## Remaining ignores (temporary)

| Dependency | Reason | Remove when |
|------------|--------|-------------|
| `flow-bin` | Flow frozen until TS migration | Phase 3 TS PR merges |
| `@babel/preset-flow` | Same | Phase 3 TS PR merges |

## Removed ignores (effective this phase)

All other previous ignores (mocha, rimraf, chalk, cross-env, babel runtime, lodash pin, elliptic pin) are lifted. Dependabot may open upgrade PRs; evaluate each against CI and the [security remediation plan](./security-remediation.md).

## Grouping

- **babel group** — keep until Babel removed in Phase 3
- Consider adding **mocha group** and **types group** after test runner decision

## Security-only fast path

Critical `npm audit` findings should get dedicated issues (see #222) rather than blind `npm audit fix --force`.
