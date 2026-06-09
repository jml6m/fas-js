# 🤖 Agent & AI Protocols

**Project:** fas-js
**Runtime:** Node.js (>=18)
**Testing:** Mocha + nyc (coverage)
**Build:** Browserify + Babelify + tinyify → `lib/bundle.js`
**Types:** Flow

> **📌 Single Source of Truth**: This document is the authoritative reference for coding standards, architecture rules, and project policies. If there is a conflict with generated copies (for example `.github/copilot-instructions.md`), follow `AGENTS.md`.

---

## 🛑 Critical Protocols (Read First)

### 1. Loop Prevention

For unsupervised runs (e.g. automated fixes):
- If the same error persists after **3 attempts**: **STOP**, revert to last working state, mark with `// FIXME: Agent failed`, and report.

### 2. Versioning & Release Policy

- **Do not bump the version** in agent PRs. Version changes are human-initiated only.
- Publishing to npm is triggered by pushing a `v*.*.*` git tag (e.g. `git tag v1.x.y && git push origin v1.x.y`), which fires the OIDC publish workflow — no manual `npm publish`.
- ⛔ Never run `npm publish` directly.

### 3. Command Execution Safety

**STRICTLY PROHIBITED for agents:**
- `npm publish`
- `git push` (agents propose; CI/humans push)
- Bumping `version` in `package.json`

### 4. Branch Workflow (v1.1 Prep)

| Branch | Purpose |
|--------|---------|
| `master` | Stable / public — protected; PR-only from maintainers |
| `main-v1-1-prep` | Integration line for v1.1 modernization — **default target for all new PRs** |
| `feat/*`, `chore/*`, `fix/*` | Short-lived topic branches → PR into `main-v1-1-prep` |

- v1.1 prep modernizes toolchain, types, tests, and docs — **not** new public API features (v2).
- At v1.1 release: merge `main-v1-1-prep` → `master`, then rename `master` → `main`.
- See [`CONTRIBUTING.md`](CONTRIBUTING.md) for contributor-facing details.

### 5. GitHub Issue Workflow

Before non-trivial work, check open issues for related tasks. Reference issues in PRs (`Closes #123`).

When creating epics with child issues:

1. **Use the CLI (`gh`)** — create issues with `gh issue create`, not the draft UI.
2. **Children first** — create sub-issues, capture their numbers (`#45`, `#46`).
3. **Parent epic last** — create the epic and paste real issue numbers into the task list.
4. **Relationships** — use `Blocked by #123`, `Depends on #123`, `Relates to #123`.

Use the issue templates in `.github/ISSUE_TEMPLATE/`. Blank issues are disabled.

---

## 🔧 Build & Test

```bash
npm ci              # install
npm run build       # browserify → lib/bundle.js (requires lib/ directory)
npm run flow check  # Flow type check
npm test            # build + mocha + nyc coverage
```

- `lib/` is tracked as an empty directory via `lib/.gitkeep` (build output is gitignored).
- Flow types are checked as part of `prepublishOnly` via `npm run flow check` (Babel’s `@babel/preset-flow` strips types during build; it does not type-check).
- Coverage threshold: **90%** lines on `master` (current); **100%** target on `main-v1-1-prep` (enforced by nyc in `npm test` once raised). Documented exceptions only for genuinely complex edge cases.

---

## 🏗️ Architecture

- **Source**: `src/` — Flow-typed JavaScript modules
- **Entry**: `src/modules.js` exports public API (`simulateFSA`, `stepOnceFSA`, `createFSA`)
- **Build output**: `lib/bundle.js` (UMD bundle, standalone `fasJs`)
- **Tests**: `test/**/*.spec.js` — Mocha + Chai + Babel register

Do not change the public API surface without bumping the major version (human decision).

---

## 🧪 Testing

- Tests live in `test/` as `*.spec.js` files.
- Run with `npm test` (builds first, then mocha with nyc coverage).
- On `master`: maintain ≥90% line coverage.
- On `main-v1-1-prep`: maintain **100%** line coverage; exceptions require a linked issue and inline documentation.

---

## 🔄 CI / CD

- **CI** (`.github/workflows/ci.yml`): runs `npm audit --audit-level=high` + `npm test` on Node 18/20/22 for every PR and pushes to `master` / `main-v1-1-prep`; uploads coverage to Codecov via OIDC (tokenless) on the Node 20 matrix entry.
- **Auto-link** (`.github/workflows/auto-link-issue.yml`): prepends `Closes #N` when branch name starts with `N-`.
- **Stale** (`.github/workflows/stale.yml`): marks inactive issues stale after 60 days, closes after 14 more days.
- **Publish** (`.github/workflows/publish.yml`): triggers on `v*.*.*` tags (and can also be run via `workflow_dispatch`); uses OIDC trusted publishing (no NPM_TOKEN needed); gated by the `npm` GitHub environment (requires manual approval).
- Actions are SHA-pinned for supply-chain security; Dependabot (weekly, `github-actions` ecosystem) auto-bumps them.

---

## 📋 Code Review & PR Interaction

- Respond to comments from the primary reviewer or when @-tagged.
- No passive acknowledgements — make the change or explain with technical reasoning.
- Human reviewer comments take priority over bot review threads.
