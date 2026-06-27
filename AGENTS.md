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
| `chore/vX.Y-*`, `chore/vX-*`, `vX.Y-*`, `vX-*` (version integration) | **One active integration branch per release** — branched from `master`; release PRs target `master`. **These name patterns are RESERVED** for this single branch (see "Reserved branch names" below). |
| `topic/<name>` (topic work)                        | Short-lived branches → PR into the **current version integration branch**. Must **not** use a reserved version-integration pattern. |

- While a release is in flight, stack topic work on `topic/<name>` branches off the version integration branch and PR them back into it.
- At release: merge integration branch → `master`, tag `v*.*.*`, publish via OIDC workflow.
- New public API features remain scheduled for **v2**; release lines ship UX, tests, docs, and internal language tooling.

**Branch policy (enforced):**

- **Topic work never targets `master` directly.** Every change lands on a short-lived topic branch that PRs into the **current version integration branch** (`chore/vX.Y-*`). `master` only ever receives the single **integration → `master`** release PR (plus Dependabot GitHub Actions bumps). Enforced by [`release-base-guard`](.github/workflows/release-base-guard.yml): a PR into `master` whose head is not `chore/v*`, `v*`, or `dependabot/github_actions/*` fails.
- The integration → `master` release PR is merged by the **repository owner via a scoped `bypass_actors` entry** on the `main` ruleset (bypass mode: pull requests) — so the owner's own release PR doesn't need an approving review it cannot self-grant. **Every non-owner PR to `master` still requires 1 approving review** (the owner approves those normally — they aren't self-authored), and **required status checks still gate every merge**. No App, no self-approve, no temporary ruleset toggle. See [`RELEASING.md`](RELEASING.md).

**Reserved branch names:** the patterns **`vX.Y-*`, `vX-*`, `chore/vX.Y-*`, `chore/vX-*`** are the targeting criteria of the [`next-version-prep-branch`](https://github.com/jml6m/fas-js/rules) ruleset and are **reserved for the single version-integration branch only**. Naming any other branch with one of them silently subjects it to that ruleset (PR-required, linear history, strict checks) and breaks normal flow. All non-integration work uses the **`topic/<name>`** prefix (a version reference that doesn't reproduce a reserved pattern in one segment is fine — `topic/v1.8-foo` and `chore/v1.8/foo` are safe; `chore/v1.8-foo` is **not**). A committed `pre-push` hook (auto-installed via `core.hooksPath .githooks`) blocks reserved-name pushes from non-integration branches (the designated integration branch is auto-detected from the remote — no config file required) and runs the fast static gate; bypass with `git push --no-verify`.

**Ruleset enforcement (branch naming):** the `next-version-prep-branch` GitHub ruleset is the primary enforcement mechanism for reserved names — any branch that accidentally matches the pattern gets strict integration-branch rules applied (PR required, linear history, `test`/`lock-files` gates), which breaks normal topic-branch flow and surfaces the mistake. Verify the active rulesets with:

```bash
gh api repos/jml6m/fas-js/rulesets --jq '.[].name'
```

To inspect a specific ruleset (e.g. `next-version-prep-branch`) and confirm its branch targeting patterns:

```bash
gh api repos/jml6m/fas-js/rulesets \
  --jq '.[] | select(.name=="next-version-prep-branch") | {name,conditions}'
```

**Admin push gate (project owner only):** for local pushes from the project admin's dev machine, a personal `pre-push` hook running `typecheck → lint → docs:lint` is recommended. Use Git's global template directory so the hook applies without being committed to the repository:

```bash
# One-time setup on the admin's machine:
mkdir -p ~/.git_templates/hooks
cat > ~/.git_templates/hooks/pre-push << 'EOF'
#!/usr/bin/env sh
set -e
echo "pre-push: running fast static gate (typecheck -> lint -> docs:lint)…"
npm run --silent typecheck
npm run --silent lint
npm run --silent docs:lint
echo "pre-push: checks passed."
EOF
chmod +x ~/.git_templates/hooks/pre-push
git config --global init.templateDir ~/.git_templates
# For existing clones, copy the hook manually:
# cp ~/.git_templates/hooks/pre-push .git/hooks/pre-push
```

Bypass an exceptional push with `git push --no-verify`.

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
npm run docs:lint   # markdownlint on **/*.md — matches the docs-lint CI gate
npm test            # typecheck + lint + build + mocha + c8 coverage
```

- **Code** formatting is Prettier, run **on save in-editor** ([`.vscode/settings.json`](.vscode/settings.json) + [`.prettierrc.json`](.prettierrc.json)) — there is no CLI `format` script by design.
- **Markdown** is owned by **markdownlint** ([`.markdownlint-cli2.yaml`](.markdownlint-cli2.yaml)), not Prettier (which is barred from `.md` via [`.prettierignore`](.prettierignore) and the editor config). Run `npm run docs:lint:fix` before pushing docs. The lychee link/anchor check runs in CI only (it's a Rust binary, not an npm dep).

- `lib/` is tracked as an empty directory via `lib/.gitkeep` (build output is gitignored).
- TypeScript is checked via `npm run typecheck` and declaration emit during `npm run build`.
- Coverage floor on `master` and version integration branches: **90%** lines/statements/functions/branches (c8 in `npm test`). Tests target workflows and contracts, not line-hit goals. See [`docs/coverage-policy.md`](docs/coverage-policy.md).

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
- On `master` and integration branches: maintain **90%** coverage (lines, statements, functions, branches). See [`docs/coverage-policy.md`](docs/coverage-policy.md).

### Types vs correctness

TypeScript (`npm run typecheck`) catches **structural** mistakes: wrong argument types, missing fields, passing a DFA where an NFA is required. It does **not** prove that an algorithm preserves language equivalence. Tests and review cover correctness. Do not put bounded word-enumeration or equivalence oracles in `src/`.

---

## 🔄 CI / CD

- **CI** (`.github/workflows/ci.yml`): `test` job runs `npm test` (includes `check:security` — public API surface + npm pack gate) on Node 18/20/22; `security` job runs `npm audit --audit-level=high` (fails on high) + `check:security`; uploads coverage to Codecov on the Node 20 matrix entry via repository secret `CODECOV_TOKEN`.
- **Auto-link** (`.github/workflows/auto-link-issue.yml`): prepends `Closes #N` when branch name starts with `N-`.
- **Publish** (`.github/workflows/publish.yml`): triggers on `v*.*.*` tags (and can also be run via `workflow_dispatch`); uses OIDC trusted publishing (no NPM_TOKEN needed); gated by the `npm` GitHub environment (requires manual approval).
- Actions are SHA-pinned for supply-chain security; Dependabot (monthly, `github-actions` ecosystem) auto-bumps them.
- The `lock-files` gate protects the project's stable foundation (see the **Protected Files** section below). Most development adds new code; modifications to locked paths are intentionally rare and heavily gated. **There is no automated bypass** — even owner-authored or agent-authored PRs that touch protected paths must wait for the project owner to manually disable the `lock-files` required status check in the ruleset, merge, and re-enable it.

---

## 🔒 Protected Files

Certain paths are locked by the `lock-files` CI check (see [`.github/PROTECTED_FILES.json`](.github/PROTECTED_FILES.json)). Changing them requires explicit owner approval via the override process below.

| Path | Why protected |
| ---- | ------------- |
| [`test/helpers/publicApiContract.js`](test/helpers/publicApiContract.js) | Public API contract helper — changes affect foundational test fidelity |
| [`src/globals/globals.ts`](src/globals/globals.ts) | Runtime type guards used across the codebase |
| [`src/modules.ts`](src/modules.ts) | Public API entry point — signature changes require major version bump |
| [`scripts/check-public-api.mjs`](scripts/check-public-api.mjs) | Enforces public API contract |
| [`scripts/check-package-scripts.mjs`](scripts/check-package-scripts.mjs) | Locks critical package.json fields used by CI/security gates |
| [`scripts/check-protected-files.mjs`](scripts/check-protected-files.mjs) | The CI gate itself — must not be bypassed without owner review |
| [`scripts/check-npm-pack.mjs`](scripts/check-npm-pack.mjs) | Locks the published npm surface (exact tarball manifest) |
| [`scripts/postbuild.mjs`](scripts/postbuild.mjs) | Controls which build artifacts land in `lib/` (and thus the tarball) |
| [`tsup.config.ts`](tsup.config.ts) | Build config — governs emitted artifacts (entries, sourcemaps) |
| [`.github/PROTECTED_FILES.json`](.github/PROTECTED_FILES.json) | Defines the protected-path list — changes alter what is locked |
| [`.github/workflows/lock-files.yml`](.github/workflows/lock-files.yml) | The gate workflow — must not be weakened without owner review |
| [`.github/workflows/publish.yml`](.github/workflows/publish.yml) | Release / publish workflow — supply-chain security boundary |

**Override process** (when a protected change is intentional):

1. Open a PR with a clear explanation of why the protected file must change.
2. The `lock-files` check will fail — that failure is expected.
3. Request review and tag `@jml6m`.
4. The owner (`@jml6m`) reviews, then temporarily disables the `lock-files` required status check in the ruleset, merges, and re-enables it.

There is no automated bypass — even owner- or agent-authored PRs go through this process, so every change to the protected set is explicitly human-reviewed before it lands.

### Published package surface

The npm tarball is kept to the minimal distributable surface and is locked the same way source is:

- [`package.json`](package.json) `"files"` is an explicit allowlist (no `lib/` wildcard): runtime `index.js`/`index.cjs`, the `index.d.ts`/`index.d.cts` types, and the `./bundle` IIFE. No sourcemaps, no demo bundle, no [`lib/.gitkeep`](lib/.gitkeep).
- [`scripts/check-npm-pack.mjs`](scripts/check-npm-pack.mjs) (run in `check:security` and again in [`publish.yml`](.github/workflows/publish.yml) before `npm publish`) asserts the tarball matches that set **exactly** — an extra or missing file fails the build and blocks publish.
- The files that decide what ships — [`scripts/check-npm-pack.mjs`](scripts/check-npm-pack.mjs), [`scripts/postbuild.mjs`](scripts/postbuild.mjs), [`tsup.config.ts`](tsup.config.ts) — are protected, so widening the surface follows the override process above. `package.json` itself is intentionally **not** protected, so version bumps and dependency changes flow freely; the manifest is guarded by the locked checker, not by locking `package.json`.

To change what ships: update [`package.json`](package.json) `"files"`, the `EXPECTED_LIB_FILES` set in [`check-npm-pack.mjs`](scripts/check-npm-pack.mjs), and the `files` expectation in [`check-package-scripts.mjs`](scripts/check-package-scripts.mjs) together, then land it via the override process.

### Locked files in the development lifecycle

The `lock-files` gate + [`.github/PROTECTED_FILES.json`](.github/PROTECTED_FILES.json) define the project's **stable foundation** (the "trusted core").

As the codebase matures — especially toward v2 — files that become reliable, comprehensively tested, and foundational may be added to the locked set. The philosophy:

- **Prefer adding new files/folders** rather than modifying locked ones.
- Locked code is a stable base that new functionality is built _on top of_.
- A new component (a language module, a critical utility, an additional gate) can be proposed for inclusion once it has proven itself and matches the spirit of the "Why protected" table above.

**How the locked set evolves:** a component demonstrates long-term stability under contract-level tests → a PR adds its path to [`.github/PROTECTED_FILES.json`](.github/PROTECTED_FILES.json) and the table above → because the list itself is locked, that PR follows the override process → thereafter the new path requires the same owner-level approval.

This keeps most day-to-day work (features, experiments, non-core refactors) flowing on integration branches while shielding core contracts, test helpers, the public API surface, and the protection mechanisms themselves from accidental or lightly-reviewed change.

---

## 📋 Code Review & PR Interaction

- Respond to comments from the primary reviewer or when @-tagged.
- No passive acknowledgements — make the change or explain with technical reasoning.
- Human reviewer comments take priority over bot review threads.

## Documentation conventions

- **Linkable paths must be clickable links.** Any in-repo path mentioned in a Markdown file must be written as a clickable link to the target (e.g. [`src/modules.ts`](src/modules.ts)), not as bare inline code. Command examples and illustrative / non-existent paths are exempt.
- Docs are gated by [`docs-lint.yml`](.github/workflows/docs-lint.yml): [lychee](https://lychee.cli.rs/) validates that links and `#anchors` resolve, and [markdownlint-cli2](https://github.com/DavidAnson/markdownlint-cli2) enforces formatting per [`.markdownlint-cli2.yaml`](.markdownlint-cli2.yaml). Only the GitHub form templates — [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/) and [`.github/pull_request_template.md`](.github/pull_request_template.md) — are excluded (their template syntax isn't plain prose). The [`.github/copilot-instructions.md`](.github/copilot-instructions.md) mirror **is** linted, so it stays formatted and in sync with this file. Run `npm run docs:lint:fix` before pushing. Prettier does **not** format Markdown (see [`.prettierignore`](.prettierignore)) — markdownlint is the sole Markdown authority.
- **Docs are an as-is snapshot of the current version, not an archive.** We do not keep per-release documentation history in the repo — backward compatibility is handled in code on a best-effort basis, but old-release specs, runbooks, and `docs/<version>-prep/` working files are not maintained here. Promote durable decisions into this file or [`RELEASING.md`](RELEASING.md) and delete the scratch; the canonical release runbook is [`RELEASING.md`](RELEASING.md).
