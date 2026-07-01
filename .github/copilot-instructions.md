# 🤖 Agent & AI Protocols

**Project:** fas-js
**Runtime:** Node.js (>=18.13)
**Testing:** Mocha + c8 (coverage)
**Build:** tsup → `lib/index.js`, `lib/index.cjs`, `lib/bundle.js`
**Types:** TypeScript (strict)

> **📌 Single Source of Truth**: `AGENTS.md` is the authoritative reference for coding standards, architecture rules, and project policies. This file is a mirror for Copilot; if there is a conflict, follow `AGENTS.md`.

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

| Branch | Purpose |
|--------|---------|
| `master` | Stable / public — protected; what npm and badges reflect |
| `chore/vX.Y-*`, `chore/vX-*`, `vX.Y-*`, `vX-*` (version integration) | Branched from `master`; release PRs target `master`. **These name patterns are RESERVED** for this single branch. |
| `topic/<name>` (topic work) | Short-lived branches → PR into the **current version integration branch**. Must **not** use a reserved version-integration pattern. |

- While a release is in flight, stack topic work on `topic/<name>` branches off the version integration branch and PR them back into it.
- At release: merge integration branch → `master`, tag `v*.*.*`, publish via OIDC workflow.
- New public API features remain scheduled for **v2**; release lines ship UX, tests, docs, and internal language tooling.

**Branch policy (enforced):**

- **Topic work never targets `master` directly.** Every change lands on a short-lived topic branch that PRs into the **current version integration branch** (`chore/vX.Y-*`). `master` only ever receives the single **integration → `master`** release PR (plus Dependabot GitHub Actions bumps). Enforced by [`release-base-guard`](./workflows/release-base-guard.yml): a PR into `master` whose head is not `chore/v*`, `v*`, or `dependabot/github_actions/*` fails.
- The integration → `master` release PR is merged by the **repository owner via a scoped `bypass_actors` entry** on the `main` ruleset (bypass mode: pull requests) — so the owner's own release PR doesn't need an approving review it cannot self-grant. **Every non-owner PR to `master` still requires 1 approving review**, and **required status checks still gate every merge**. No App, no self-approve, no temporary ruleset toggle. See [`RELEASING.md`](../RELEASING.md).

**Reserved branch names:** the patterns **`vX.Y-*`, `vX-*`, `chore/vX.Y-*`, `chore/vX-*`** are the targeting conditions of the `next-version-prep-branch` ruleset and are **reserved for the single per-release version-integration branch**. Every other branch (topic, fix, chore, experiment) must use a **non-reserved** name — convention `topic/<name>` (a version reference that doesn't reproduce a reserved pattern in one path segment is fine: `topic/v1.8-foo` and `chore/v1.8/foo` are safe; `chore/v1.8-foo` is not). Enforcement is via GitHub rulesets, no committed code: the `next-version-prep-branch` ruleset's **Restrict creations** rule blocks anyone without bypass from creating a reserved-named branch (bypass is scoped to the repository admin role, so only the admin-created integration branch holds a reserved name). Rulesets gate ref **names**, not git ancestry. The project admin additionally runs a personal `pre-push` hook (git templates, `~/.git_templates/hooks/`, never committed) that fails the push on any `typecheck`/`lint --max-warnings=0`/`docs:lint` non-zero exit; bypass with `git push --no-verify`. See [`AGENTS.md`](../AGENTS.md) §4 for the rule table, the `gh` inspect/set commands, and the full hook.

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
npm run health:dead # knip — unused files/exports/deps (unused files are fatal)
npm test            # typecheck + lint + build + mocha + c8 coverage
```

- **Dead-code detection** (`npm run health:dead`, config [`knip.json`](../knip.json)): on integration PRs only unused *files* are fatal (exports/types/deps are warnings) and the CI step is non-blocking. At publish, `npm run health:dead:strict` (`knip --production --strict`) is a hard gate that fails on *any* dead code — files, exports, types, or deps — reachable from the shipped surface. See [`publish.yml`](workflows/publish.yml).
- `lib/` is tracked as an empty directory via `lib/.gitkeep` (build output is gitignored).
- TypeScript is checked via `npm run typecheck` and declaration emit during `npm run build`.
- Coverage floor on `master` and version integration branches: **90%** lines/statements/functions/branches (c8 in `npm test`). See [`docs/coverage-policy.md`](../docs/coverage-policy.md).

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
- On `master` and integration branches: maintain **90%** coverage (lines, statements, functions, branches). See [`docs/coverage-policy.md`](../docs/coverage-policy.md).

### Types vs correctness

TypeScript (`npm run typecheck`) catches **structural** mistakes: wrong argument types, missing fields, passing a DFA where an NFA is required. It does **not** prove that an algorithm preserves language equivalence. Tests and review cover correctness. Do not put bounded word-enumeration or equivalence oracles in `src/`.

---

## 🔄 CI / CD

- **CI** ([`.github/workflows/ci.yml`](workflows/ci.yml)): a **`static-gates`** job (single Node 20) runs the env-independent gates once — `check-package-scripts`, `typecheck`, `lint`, `npm audit`, `build`, the security guards (`check-guard-tests` + `check-public-api` + `check-npm-pack`), and the non-blocking `health:dead` scan; a **`test`** matrix job runs only build + mocha + c8 coverage across Node 18/20/22 (the required `test (18/20/22)` contexts) and uploads coverage to Codecov on Node 20 via `CODECOV_TOKEN`. `npm test` stays the local full-gate; the split is CI-only.
- **Guard-test completeness**: `check:security` runs [`scripts/check-guard-tests.mjs`](../scripts/check-guard-tests.mjs) — every `scripts/check-*.mjs` must have a matching `test/check-*.spec.js` or CI fails. Structural, independent of coverage (coverage scope stays `src/**`). See [`docs/coverage-policy.md`](../docs/coverage-policy.md).
- **Auto-link** (`.github/workflows/auto-link-issue.yml`): prepends `Closes #N` when branch name starts with `N-`.
- **Dead-code check**: `static-gates` job runs `npm run health:dead` (knip, non-blocking warning); the hard failure is `npm run health:dead:strict` (`knip --production --strict`) in [`publish.yml`](workflows/publish.yml).
- **Publish** (`.github/workflows/publish.yml`): triggers on `v*.*.*` tags (and can also be run via `workflow_dispatch`); uses OIDC trusted publishing (no NPM_TOKEN needed); gated by the `npm` GitHub environment (requires manual approval).
- Actions are SHA-pinned for supply-chain security; Dependabot (monthly, `github-actions` ecosystem) auto-bumps them.

---

## 📋 Code Review & PR Interaction

- Respond to comments from the primary reviewer or when @-tagged.
- No passive acknowledgements — make the change or explain with technical reasoning.
- Human reviewer comments take priority over bot review threads.
