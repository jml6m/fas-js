# Contributing to fas-js

fas-js is maintained by one person. Issues and pull requests are welcome, and response times are
best-effort.

## What's wanted

- Bug reports with a minimal reproduction: the automaton, the input, what you expected.
- Fixes and tests for the regular-language core, and documentation corrections.
- Performance work that keeps the public API unchanged.

Changes to the public API (`createFSA`, `simulateFSA`, `stepOnceFSA` and their types) need a
maintainer decision first, and are usually saved for a major version.

## Before you open a PR

Open an issue first for anything beyond a typo, so the design is agreed before code is written.
Use the templates under [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/).

Target the current release integration branch (`chore/vX.Y-*`), not the default branch. A check
rejects other PRs into the default branch.

## Contributing from a fork

- **Branch.** Fork the repository, branch from the current release integration branch and open the
  PR against it. The default branch only takes release merges.
- **One PR, one change.** Each PR targets the integration branch directly, never another PR's
  branch, and shows only its own change. If it depends on work that hasn't merged yet, wait for
  that to merge and rebase.
- **Agree the approach first.** For anything beyond a typo or small fix, open or comment on an
  issue and agree the approach there. Follow the design an issue describes; to propose a different
  one, say so on the issue before writing code.
- **Milestone.** The issue a PR links must be in a milestone (see [PR conventions](#pr-conventions)).
  A maintainer adds it, so ask on the issue if it has none.
- **CI and edits.** CI on a first contribution runs after a maintainer approves it. Leave "Allow
  edits from maintainers" checked.
- **Review.** A maintainer reviews and approves every PR into the integration branch before it
  merges, as time allows; there is no fixed response time.
- Don't open a PR you don't plan to see through.

Issues labelled `good first issue` or `help wanted` are good places to start.

## Local gates

```bash
npm ci
npm test            # the full chain: typecheck, lint, build, guard checks, tests with coverage
npm run docs:lint   # markdownlint, if you touched Markdown
```

`npm test` is not only the unit tests: it fails on type errors, lint, a broken build, the guard
scripts, or coverage under 90%. CI runs the same steps, plus `npm audit`, an import-cycle check
(`npm run health:circular`) and a link check on Markdown.

## PR conventions

- The PR description has a line starting with `Closes #N`, or `Relates to #N` if the PR does only
  part of the issue. The issue must be open and in a milestone. The `issue-link` check requires
  it.
- Keep a PR to one change. PRs are squash-merged.
- Don't bump the version in `package.json`. That happens in the release.

## Where the rules live

[AGENTS.md](AGENTS.md) has the build commands, the architecture and the locked-files rule.
Security reports go through [SECURITY.md](SECURITY.md).
