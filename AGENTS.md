# 🤖 Agent & AI Protocols

**Project:** fas-js
**Runtime:** Node.js (>=18)
**Testing:** Mocha + c8 (coverage)
**Build:** tsup → `lib/index.js`, `lib/index.cjs`, `lib/bundle.js`
**Types:** TypeScript (strict)

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

### 4. Branch Workflow

| Branch                                             | Purpose                                                                                             |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `master`                                           | Stable / public — protected; what npm and badges reflect                                            |
| `chore/vX.Y-*`, `chore/vX-*`, `vX.Y-*`, `vX-*` (version integration) | **One active integration branch per release** — branched from `master`; release PRs target `master` |
| topic branches on top                              | Short-lived branches → PR into the **current version integration branch**                           |

- While a release (e.g. v1.7) is in flight, stack topic work on that integration branch (e.g. `chore/v1.7-repo-org`).
- At release: merge integration branch → `master`, tag `v*.*.*`, publish via OIDC workflow.
- New public API features remain scheduled for **v2**; release lines ship UX, tests, docs, and internal language tooling.
- See [`CONTRIBUTING.md`](CONTRIBUTING.md) for contributor-facing details.

**Ref & tag hygiene:**

- **Auto-delete on merge** is enabled — merged topic branches are removed automatically. Keep them short-lived; delete abandoned ones.
- **`master` is force-push- and deletion-protected** by the `main` ruleset (linear history + required reviews/checks). Never force-push or delete it.
- **Tags are permanent and immutable.** A published `vX.Y.Z` tag is never moved or deleted (the `v*` ruleset blocks force-update/deletion, and re-pointing would break npm provenance). Fix a post-tag mistake with a **new patch tag**, never by retagging — formalized in the release-hardening epic.
- **Stale-branch sweep** (manual, report-only — never auto-delete beyond the merge cleanup): list with `git for-each-ref --sort=committerdate --format='%(committerdate:short) %(refname:short)' refs/remotes/origin`, cross-reference `gh pr list --state open`, and delete only stale, merged, PR-less branches deliberately (keep the active integration branch).

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
npm run build       # tsup → lib/index.js, lib/index.cjs, lib/bundle.js, lib/index.d.ts
npm run typecheck   # TypeScript type check (no emit)
npm run lint        # ESLint on src/
npm test            # typecheck + lint + build + mocha + c8 coverage
```

- `lib/` is tracked as an empty directory via `lib/.gitkeep` (build output is gitignored).
- TypeScript is checked via `npm run typecheck` and declaration emit during `npm run build`.
- Coverage floor on `master` and version integration branches: **90%** lines/statements/functions/branches (c8 in `npm test`). Tests target workflows and contracts, not line-hit goals. See `docs/v1.1-prep/coverage-policy.md`.

---

## 🏗️ Architecture

- **Source**: `src/` — TypeScript modules
- **Entry**: `src/modules.ts` exports public API (`simulateFSA`, `stepOnceFSA`, `createFSA`)
- **Languages**: `src/languages/` — abstract `Language` base class; `RegularLanguage` extends it for FSA-backed regular languages. Future non-regular types extend `Language` directly, not `RegularLanguage`. Internal to npm; demo bundle (`src/demo-bundle.ts`) exposes only the public FSA API.
- **Build output**: `lib/index.js` (ESM), `lib/index.cjs` (CJS), `lib/bundle.js` (IIFE global `fasJs`), `lib/index.d.ts`
- **Tests**: `test/**/*.spec.js` — Mocha + Chai + tsx loader.
- **Demo QA**: `test/demo.spec.js` (in `npm test`) — artifact + HTTP + jsdom UI checks; `npm run serve:demo` for local browser testing.

Do not change the public API surface without bumping the major version (human decision).

---

## 🧪 Testing

- Tests live in `test/` as `*.spec.js` files.
- Run with `npm test` (builds first, then mocha with c8 coverage).
- On `master` and integration branches: maintain **90%** coverage (lines, statements, functions, branches). See `docs/v1.1-prep/coverage-policy.md`.

### Types vs correctness

TypeScript (`npm run typecheck`) catches **structural** mistakes: wrong argument types, missing fields, passing a DFA where an NFA is required. It does **not** prove that an algorithm preserves language equivalence. Tests and review cover correctness. Do not put bounded word-enumeration or equivalence oracles in `src/`.

---

## 🔄 CI / CD

- **CI** (`.github/workflows/ci.yml`): `test` job runs `npm test` (includes `check:security` — public API surface + npm pack gate) on Node 18/20/22; `security` job runs `npm audit --audit-level=high` (fails on high) + `check:security`; uploads coverage to Codecov on the Node 20 matrix entry via repository secret `CODECOV_TOKEN`.
- **Auto-link** (`.github/workflows/auto-link-issue.yml`): prepends `Closes #N` when branch name starts with `N-`.
- **Publish** (`.github/workflows/publish.yml`): triggers on `v*.*.*` tags (and can also be run via `workflow_dispatch`); uses OIDC trusted publishing (no NPM_TOKEN needed); gated by the `npm` GitHub environment (requires manual approval).
- Actions are SHA-pinned for supply-chain security; Dependabot (monthly, `github-actions` ecosystem) auto-bumps them.
- The `lock-files` gate protects the project's stable foundation (see `CONTRIBUTING.md` → "Protected Files" and "Locked Files in the Development Lifecycle"). Most development adds new code; modifications to locked paths are intentionally rare and heavily gated. **There is no automated bypass** — even owner-authored or agent-authored PRs that touch protected paths must wait for the project owner to manually disable the `lock-files` required status check in the ruleset, merge, and re-enable it.

---

## 📋 Code Review & PR Interaction

- Respond to comments from the primary reviewer or when @-tagged.
- No passive acknowledgements — make the change or explain with technical reasoning.
- Human reviewer comments take priority over bot review threads.
