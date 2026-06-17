# Contributing to fas-js

Thank you for your interest in contributing. This repository is a public npm package with active viewers, so we follow a strict branch workflow per release.

> **Authority**: See [`AGENTS.md`](AGENTS.md) for agent protocols, build commands, and coding standards. This document covers human and contributor workflow.

---

## Branch model

| Branch | Purpose |
|--------|---------|
| `master` | **Stable / public** — what npm, jsDelivr CDN, and badges reflect. Protected; no direct pushes. |
| Version integration branch | **One branch off `master` per active release** (e.g. `chore/v1.7-repo-org` for v1.7). Release PRs merge into `master`. |
| `feat/*`, `chore/*`, `fix/*` (topic) | Short-lived branches stacked **on the current version integration branch**. |

**Active release (v1.7):** integration branch `chore/v1.7-repo-org` — repo organization, template hardening, dead-asset cleanup. Topic PRs target this branch (not `master`).

### Releases

Each version line (e.g. v1.6) uses a single integration branch from `master`. Topic PRs land there first; when the release is ready, the integration branch merges to `master`, is tagged `v*.*.*`, and npm publish runs via CI (OIDC).

New **public API** features are scheduled for **v2**; release branches ship demo UX, tests, docs, and internal language tooling without expanding the three-function npm surface.

---

## How to contribute

1. **Check open issues** — avoid duplicating planned work. Reference issues in PR descriptions (`Closes #123`).
2. **Branch from the current version integration branch** — not from `master`, unless you are explicitly asked to hotfix stable.
3. **Keep PRs focused** — one logical change per PR. Governance, toolchain, and feature work should not be mixed.
4. **Run tests locally** before opening a PR:
   ```bash
   npm ci
   npm test
   ```
5. **Open a PR** targeting the current version integration branch (or `master` for the release merge PR) using the PR template.
6. **Wait for CI** — all checks must pass. CI runs on Node 18, 20, and 22.

### Coverage

- **Coverage floor**: **90%** on lines, statements, functions, and branches (c8). Tests target workflows and contracts, not line-hit goals. See [`docs/v1.1-prep/coverage-policy.md`](docs/v1.1-prep/coverage-policy.md) and [`docs/v1.1-prep/test-architecture.md`](docs/v1.1-prep/test-architecture.md).

---

## Issues

Use the GitHub issue templates — blank issues are disabled.

| Template | When to use |
|----------|-------------|
| **Bug report** | Incorrect FSA behavior, build failures, test regressions |
| **Feature request** | New API capabilities (typically deferred to v2) |
| **Epic** | Multi-issue initiatives (toolchain audit, TypeScript migration, demo port) |

### Epic workflow

When creating epics with child issues:

1. Create child issues first and note their numbers (`#45`, `#46`, …).
2. Create the parent epic and paste those numbers into the task list.
3. Use relationship keywords: `Blocked by #123`, `Depends on #123`, `Relates to #123`.

---

## Versioning and releases

- **Do not bump `version` in `package.json`** in contributor or agent PRs. Version changes are human-initiated only.
- Publishing to npm is triggered by pushing a `v*.*.*` git tag on the stable branch, which runs the OIDC publish workflow. Never run `npm publish` manually.
- Breaking changes to the public API (`createFSA`, `simulateFSA`, `stepOnceFSA`) require a **major** version bump (v2+), decided by maintainers.

---

## Code review

- Address all reviewer feedback with code changes or a clear technical explanation.
- Passive acknowledgements ("noted", "will fix") are not sufficient.
- Maintainer comments take priority over automated bot review threads.

---

## Security

Do not open public issues for security vulnerabilities. Use [GitHub private vulnerability reporting](https://github.com/jml6m/fas-js/security/advisories/new). See [`SECURITY.md`](SECURITY.md).