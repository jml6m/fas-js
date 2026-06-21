# Contributing to fas-js

Thank you for your interest in contributing. This repository is a public npm package with active viewers, so we follow a strict branch workflow per release.

> **Authority**: See [`AGENTS.md`](AGENTS.md) for agent protocols, build commands, and coding standards. This document covers human and contributor workflow.

---

## Branch model

| Branch                               | Purpose                                                                                                                |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `master`                             | **Stable / public** — what npm, jsDelivr CDN, and badges reflect. Protected; no direct pushes.                         |
| Version integration branch           | **One branch off `master` per active release** (e.g. `chore/v1.7-repo-org` for v1.7). Naming must match `chore/vX.Y-*`, `chore/vX-*`, `vX.Y-*`, or `vX-*` (enforced by branch ruleset). Release PRs merge into `master`. |
| `feat/*`, `chore/*`, `fix/*` (topic) | Short-lived branches stacked **on the current version integration branch**.                                            |

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

- **Coverage floor**: **90%** on lines, statements, functions, and branches (c8). Tests target workflows and contracts, not line-hit goals. See [`docs/v1.1-prep/coverage-policy.md`](docs/v1.1-prep/coverage-policy.md).

### Protected Files

Certain paths are locked by the `lock-files` CI check (see [`.github/PROTECTED_FILES.json`](.github/PROTECTED_FILES.json)). Changes to these files require explicit maintainer approval.

| Path                                | Why protected                                                         |
| ----------------------------------- | --------------------------------------------------------------------- |
| `test/helpers/publicApiContract.js` | Public API contract helper — changes affect foundational test fidelity |
| `src/globals/globals.ts`            | Runtime type guards used across the codebase                          |
| `src/modules.ts`                    | Public API entry point — signature changes require major version bump |
| `scripts/check-public-api.mjs`      | Enforces public API contract                                          |
| `scripts/check-package-scripts.mjs` | Locks critical package.json fields used by CI/security gates          |
| `scripts/check-protected-files.mjs` | The CI gate itself — must not be bypassed without owner review        |
| `.github/PROTECTED_FILES.json`      | Defines the protected-path list — changes alter what is locked        |
| `.github/workflows/lock-files.yml`  | The gate workflow — must not be weakened without owner review         |
| `.github/workflows/publish.yml`     | Release / publish workflow — supply-chain security boundary           |

**Override process** (when a protected change is intentional):

Any PR touching a protected path will fail the `lock-files` check. To land such a change:

1. Open a PR with a clear explanation of why the protected file must change.
2. The `lock-files` check will fail — that failure is expected.
3. Request review and tag `@jml6m`.
4. The project owner (`@jml6m`) reviews the change, then temporarily disables the `lock-files` required status check in the branch protection ruleset, merges the PR, and re-enables the check.

There is no automated bypass path — even owner-authored PRs go through this process. The intent is that every change to the protected set is explicitly reviewed and approved by a human before it lands.

### Locked Files in the Development Lifecycle

The `lock-files` gate + `.github/PROTECTED_FILES.json` define the project's **stable foundation** (sometimes called the "trusted core").

As the codebase matures — especially as we move toward v2 — files and folders that become reliable, comprehensively tested, and foundational may be added to the protected list. The philosophy is:

- **Prefer adding new files/folders** rather than modifying existing locked ones.
- Locked code is treated as a stable base that new functionality is built _on top of_.
- When a new component (a language module, a critical utility, an additional gate, etc.) has proven itself and matches the spirit of the "Why protected" table above, it can be proposed for inclusion in the locked set.

**How the locked set evolves**

1. A component demonstrates long-term stability and is exercised by contract-level tests.
2. A PR is opened that adds the path to `.github/PROTECTED_FILES.json` (and usually updates the table in this document).
3. Because the list itself is locked, the PR must follow the override process above (it will be reviewed and merged only by the project owner).
4. Going forward, changes to that new locked path require the same owner-level approval.

This model supports the overall development approach:

- Most day-to-day work (new features, experiments, non-core refactors) can proceed normally on integration branches.
- The locked foundation is protected from accidental or lightly-reviewed changes.
- We minimize the risk of obscure regressions in core contracts, test helpers, public API surface, or the protection mechanisms themselves.

See also the branch model and testing principles in this document and in `AGENTS.md`.

---

## Issues

Use the GitHub issue templates — blank issues are disabled.

| Template            | When to use                                                                |
| ------------------- | -------------------------------------------------------------------------- |
| **Bug report**      | Incorrect FSA behavior, build failures, test regressions                   |
| **Feature request** | New API capabilities (typically deferred to v2)                            |
| **Epic**            | Multi-issue initiatives (toolchain audit, TypeScript migration, demo port) |

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
