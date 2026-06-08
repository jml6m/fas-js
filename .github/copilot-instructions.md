# ðŸ¤– Agent & AI Protocols

**Project:** fas-js
**Runtime:** Node.js (>=18)
**Testing:** Mocha + nyc (coverage)
**Build:** Browserify + Babelify + tinyify â†’ `lib/bundle.js`
**Types:** Flow

> **ðŸ“Œ Single Source of Truth**: `AGENTS.md` is the authoritative reference for coding standards, architecture rules, and project policies. This file is a generated mirror for Copilot; if there is a conflict, follow `AGENTS.md`.

---

## ðŸ›‘ Critical Protocols (Read First)

### 1. Loop Prevention

For unsupervised runs (e.g. automated fixes):
- If the same error persists after **3 attempts**: **STOP**, revert to last working state, mark with `// FIXME: Agent failed`, and report.

### 2. Versioning & Release Policy

- **Do not bump the version** in agent PRs. Version changes are human-initiated only.
- Publishing to npm is triggered by pushing a `v*.*.*` git tag (e.g. `git tag v1.x.y && git push origin v1.x.y`), which fires the OIDC publish workflow â€” no manual `npm publish`.
- â›” Never run `npm publish` directly.

### 3. Command Execution Safety

**STRICTLY PROHIBITED for agents:**
- `npm publish`
- `git push` (agents propose; CI/humans push)
- Bumping `version` in `package.json`

---

## ðŸ”§ Build & Test

```bash
npm ci              # install
npm run build       # browserify â†’ lib/bundle.js (requires lib/ directory)
npm run flow check  # Flow type check
npm test            # build + mocha + nyc coverage
```

- `lib/` is tracked as an empty directory via `lib/.gitkeep` (build output is gitignored).
- Flow types are checked as part of `prepublishOnly` via `npm run flow check` (Babelâ€™s `@babel/preset-flow` strips types during build; it does not type-check).
- Coverage threshold: 90% lines (enforced by nyc in `npm test`).

---

## ðŸ—ï¸ Architecture

- **Source**: `src/` â€” Flow-typed JavaScript modules
- **Entry**: `src/modules.js` exports public API (`simulateFSA`, `stepOnceFSA`, `createFSA`)
- **Build output**: `lib/bundle.js` (UMD bundle, standalone `fasJs`)
- **Tests**: `test/**/*.spec.js` â€” Mocha + Chai + Babel register

Do not change the public API surface without bumping the major version (human decision).

---

## ðŸ§ª Testing

- Tests live in `test/` as `*.spec.js` files.
- Run with `npm test` (builds first, then mocha with nyc coverage).
- Maintain â‰¥90% line coverage â€” test new code paths.

---

## ðŸ”„ CI / CD

- **CI** (`.github/workflows/ci.yml`): runs `npm audit --audit-level=high` + `npm test` on Node 18/20/22 for every PR and `master` push; uploads coverage to Codecov via OIDC (tokenless) on the Node 20 matrix entry.
- **Publish** (`.github/workflows/publish.yml`): triggers on `v*.*.*` tags (and can also be run via `workflow_dispatch`); uses OIDC trusted publishing (no NPM_TOKEN needed); gated by the `npm` GitHub environment (requires manual approval).
- Actions are SHA-pinned for supply-chain security; Dependabot (weekly, `github-actions` ecosystem) auto-bumps them.

---

## ðŸ“‹ Code Review & PR Interaction

- Respond to comments from the primary reviewer or when @-tagged.
- No passive acknowledgements â€” make the change or explain with technical reasoning.
- Human reviewer comments take priority over bot review threads.


# Agent Guidelines for GitHub Issues

When tasked with creating, editing, or managing GitHub Issues, you MUST follow these rules:

1. **USE THE CLI (gh)**: Do NOT use the Draft UI on GitHub.com to draft issues for manual creation. You must use the GitHub CLI (gh issue create, gh issue edit) directly. This immediately provides the true Issue ID/URL back to you in the terminal.
2. **EPIC WORKFLOW**:
   - Create the child/sub-issues FIRST using gh issue create.
   - Capture the newly generated Issue IDs (e.g., #45, #46).
   - Create the Parent Epic AFTER the children, and immediately inject those exact IDs into the Epic's Task List.
   - This entirely eliminates the manual loop of drafting, creating, and editing to fix broken links.
3. **RELATIONSHIPS**: 
   - Always use strict relationship keywords followed by the exact ID or URL: Blocked by #123, Depends on #123, Relates to #123. 
   - Never use plain text descriptions for relationships. Find the correct Issue ID first.
