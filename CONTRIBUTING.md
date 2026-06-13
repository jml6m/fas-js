# Contributing to fas-js

Thank you for your interest in contributing. This repository is a public npm package; follow the branch workflow below.

> **Authority**: See [`AGENTS.md`](AGENTS.md) for agent protocols, build commands, and coding standards.

---

## Branch model

| Branch | Purpose |
|--------|---------|
| `master` | **Stable / public** — current v1.x on npm and jsDelivr. Protected; no direct pushes. |
| `main-v2-workspace` | **v2 integration line** — regular expressions and related API work. Default target for new PRs. |
| `feat/*`, `chore/*`, `fix/*` | Short-lived topic branches. Open PRs against `main-v2-workspace`. |

### v1.x vs v2

- **v1.5** (on `master`): TypeScript toolchain, ESLint, regular-language layer (internal), v1.5 demo. Public API unchanged: `createFSA`, `simulateFSA`, `stepOnceFSA`.
- **v2** (on `main-v2-workspace`): regular expression support and other API evolution — ships as a **major** npm release when ready.

Stable hotfixes may target `master` directly when explicitly requested.

---

## How to contribute

1. **Check open issues** — avoid duplicating planned work. Reference issues in PR descriptions (`Closes #123`).
2. **Branch from `main-v2-workspace`** for v2 feature work (or from `master` for approved stable hotfixes).
3. **Keep PRs focused** — one logical change per PR.
4. **Run tests locally** before opening a PR:
   ```bash
   npm ci
   npm test
   ```
5. **Open a PR** targeting `main-v2-workspace` using the PR template.
6. **Wait for CI** — all checks must pass (Node 18, 20, 22).

### Coverage

Maintain **90%** on lines, statements, functions, and branches (c8, enforced in `npm test`). Tests should prove workflows and contracts, not chase line hits for their own sake.

---

## Issues

Use the GitHub issue templates — blank issues are disabled.

| Template | When to use |
|----------|-------------|
| **Bug report** | Incorrect FSA behavior, build failures, test regressions |
| **Feature request** | New API capabilities (v2 regex, language features, etc.) |
| **Epic** | Multi-issue initiatives |

### Epic workflow

1. Create child issues first and note their numbers (`#45`, `#46`, …).
2. Create the parent epic and paste those numbers into the task list.
3. Use relationship keywords: `Blocked by #123`, `Depends on #123`, `Relates to #123`.

### Release tracking — use Milestones, not labels

Track which release an issue is scoped for with a GitHub **Milestone** (e.g. `v1.1`), never a label. Do **not** create or apply release-scoping labels such as `v1.1-prep`, `*-prep`, or `*-required` — that label was retired and its issues moved onto the `v1.1` milestone. Milestones intentionally carry **no due date** right now; they exist only to group the work that belongs to a release. Nothing in CI blocks a release-scoping label (enforcing that would mean brittle label-name regex), so this is a convention everyone follows: assign the milestone, don't invent a label.

---

## Versioning and releases

- **Do not bump `version` in `package.json`** in contributor or agent PRs. Version changes are human-initiated only.
- Publishing to npm is triggered by pushing a `v*.*.*` git tag on the stable branch, which runs the OIDC publish workflow. Never run `npm publish` manually.
- Breaking changes to the public API require a **major** version bump (v2+), decided by maintainers.

---

## Code review

- Address all reviewer feedback with code changes or a clear technical explanation.
- Passive acknowledgements ("noted", "will fix") are not sufficient.
- Maintainer comments take priority over automated bot review threads.

---

## Security

Do not open public issues for security vulnerabilities. Use [GitHub private vulnerability reporting](https://github.com/jml6m/fas-js/security/advisories/new). See [`SECURITY.md`](SECURITY.md).