# 🤖 Agent & AI Protocols

**Project:** fas-js
**Runtime:** Node.js (>=18)
**Testing:** Mocha + nyc (coverage)
**Build:** Browserify + Babelify + tinyify → `lib/bundle.js`
**Types:** Flow

> **📌 Single Source of Truth**: This document is the authoritative reference for coding standards, architecture rules, and project policies. If there is a conflict between this document and any other file, `AGENTS.md` takes precedence.

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

---

## 🔧 Build & Test

```bash
npm ci              # install
npm run build       # browserify → lib/bundle.js (requires lib/ directory)
npm test            # build + flow check + mocha + nyc coverage
npm audit --audit-level=high  # security check (also runs in CI)
```

- `lib/` is tracked as an empty directory via `lib/.gitkeep` (build output is gitignored).
- Flow types are checked as part of `prepublishOnly` and `npm test` via `@babel/preset-flow`.
- Coverage threshold: 90% lines (enforced by nyc in `npm test`).

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
- Maintain ≥90% line coverage — test new code paths.

---

## 🔄 CI / CD

- **CI** (`.github/workflows/ci.yml`): runs `npm audit --audit-level=high` + `npm test` on Node 18/20/22 for every PR and `master` push; uploads coverage to Codecov via OIDC (tokenless) on the Node 20 matrix entry.
- **Publish** (`.github/workflows/publish.yml`): triggers on `v*.*.*` tags; uses OIDC trusted publishing (no NPM_TOKEN needed); gated by the `npm` GitHub environment (requires manual approval).
- Actions are SHA-pinned for supply-chain security; Dependabot (weekly, `github-actions` ecosystem) auto-bumps them.

---

## 📋 Code Review & PR Interaction

- Respond to comments from the primary reviewer or when @-tagged.
- No passive acknowledgements — make the change or explain with technical reasoning.
- Human reviewer comments take priority over bot review threads.
