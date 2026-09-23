## What

<!-- Briefly describe the change -->

## Related issues

<!-- A line starting with `Relates to #123` (or Closes / Fixes / Resolves #123). The issue must be open and in a milestone; the issue-link check enforces it. -->

## Why

<!-- Motivation or issue context -->

## How

<!-- Implementation approach; call out anything non-obvious -->

## How tested

- [ ] `npm ci`
- [ ] `npm test`
- [ ] Manual smoke test (if user-facing)

## Checklist

- [ ] PR targets the current version integration branch (`chore/vX.Y-*`), not `master`, unless this is the release merge PR or an approved stable hotfix
- [ ] Changes are focused and optimized
- [ ] Tests added or updated for new/changed behavior
- [ ] Test Coverage maintained (see [.c8rc.json](../.c8rc.json))
- [ ] No version bump in [package.json](../package.json)
- [ ] [README.md](../README.md) updated if needed; README changes need the maintainer's approval on the PR
