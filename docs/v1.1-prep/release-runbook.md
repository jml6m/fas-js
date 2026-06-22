# Release Runbook — master → main at v1.1

Closes [#225](https://github.com/jml6m/fas-js/issues/225).

## Pre-merge checklist

- [ ] All Phase 3 PRs merged to `main-v1-1-prep`
- [ ] `npm test` passes at 100% coverage (or documented exceptions)
- [ ] API contract tests pass
- [ ] Demo deployed: <https://jml6m.github.io/fas-js/v1.1/>
- [ ] README updated
- [ ] Human reviews final PR

## Release steps

| Step | Owner | Action |
|------|-------|--------|
| 1 | Human | Open PR `main-v1-1-prep` → `master`; get approval |
| 2 | Human | Squash/merge PR |
| 3 | Human | Rename default branch `master` → `main` on GitHub |
| 4 | Agent/Human | Update badge URLs in README (CI, Codecov) |
| 5 | Human | Bump `version` in `package.json` (e.g. `1.4.0`) |
| 6 | Human | `git tag v1.x.y && git push origin v1.x.y` on `main` |
| 7 | CI | `publish.yml` OIDC publish to npm |
| 8 | Human | Enable GitHub Pages from `main` if workflow branch ref needs update |

## URLs/refs to update

- README CI badge: `branch=main`
- Codecov badge: `branch/main`
- `AGENTS.md` / `CONTRIBUTING.md` branch references
- `.github/workflows/ci.yml` push branches
- `.github/workflows/pages.yml` trigger branch (may stay `main-v1-1-prep` until archived, or switch to `main`)

## npm publish

Existing workflow unchanged: tag `v*.*.*` on stable branch triggers OIDC trusted publishing with npm 11.5.1+.
