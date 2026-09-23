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

Target the current release integration branch (`chore/vX.Y-*`), not `master`. A check rejects
other PRs into `master`.

## Local gates

```bash
npm ci
npm test            # the full chain: typecheck, lint, build, guard checks, tests with coverage
npm run docs:lint   # markdownlint, if you touched Markdown
```

`npm test` is not only the unit tests: it fails on type errors, lint, a broken build, the guard
scripts, or coverage under 90%. CI runs the same steps, plus `npm audit` and a link check on
Markdown.

## PR conventions

- The PR description has a line starting with `Relates to #N` for the issue it serves. The
  `issue-link` check requires it.
- Keep a PR to one change. PRs are squash-merged.
- Don't bump the version in `package.json`. That happens in the release.

## Where the rules live

[AGENTS.md](AGENTS.md) has the build commands, the architecture and the locked-files rule.
Security reports go through [SECURITY.md](SECURITY.md).
