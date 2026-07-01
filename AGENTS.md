# 🤖 Agent & AI Protocols

**Project:** fas-js
**Runtime:** Node.js (>=18.13)
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

- `npm publish` (publishing is tag-triggered OIDC only)
- Pushing to, merging into, force-pushing, or deleting `master`
- Creating or moving any `v*` tag
- Bumping `version` in `package.json`
- Disabling/toggling any required status check on the `main` ruleset (the release `lock-files` toggle is the **admin's** step)

**Permitted for agents (delegated execution):**

- Push `topic/<name>` branches and open PRs into the current version integration branch (`chore/vX.Y-*`)
- Merge those topic PRs into the integration branch once CI is green — the integration branch is a **permissive staging area** (0-approval; protected-file changes are allowed here and only face the gate at the `master` release)
- Request review (assign/@mention Copilot, `gh pr edit --add-reviewer`)
- Accumulate an entire milestone on the integration branch, then **stop and leave the admin a single final step**: review the integration branch, then merge → `master`, tag, publish. Surface any blocker or design decision instead of guessing.

### 4. Branch Workflow

| Branch                                             | Purpose                                                                                             |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `master`                                           | Stable / public — protected; what npm and badges reflect                                            |
| `chore/vX.Y-*`, `chore/vX-*`, `vX.Y-*`, `vX-*` (version integration) | Branched from `master`; release PRs target `master`. **These name patterns are RESERVED** for this single branch (see "Reserved branch names" below). |
| `topic/<name>` (topic work)                        | Short-lived branches → PR into the **current version integration branch**. Must **not** use a reserved version-integration pattern. |

- While a release is in flight, stack topic work on `topic/<name>` branches off the version integration branch and PR them back into it.
- At release: merge integration branch → `master`, tag `v*.*.*`, publish via OIDC workflow.
- New public API features remain scheduled for **v2**; release lines ship UX, tests, docs, and internal language tooling.
- **Delegated milestone execution:** an agent may implement an entire milestone across `topic/<name>` PRs merged into the current version integration branch, then **hand off a single ready integration branch** for the admin to review and release (merge → `master`, tag, publish). The admin's manual step — and the `lock-files` toggle if the release touches protected files — is the only human gate. See §3.

**Branch policy (enforced):**

- **Topic work never targets `master` directly.** Every change lands on a short-lived topic branch that PRs into the **current version integration branch** (`chore/vX.Y-*`). `master` only ever receives the single **integration → `master`** release PR (plus Dependabot GitHub Actions bumps). Enforced by [`release-base-guard`](.github/workflows/release-base-guard.yml): a PR into `master` whose head is not `chore/v*`, `v*`, or `dependabot/github_actions/*` fails.
- The integration → `master` release PR is merged by the **repository owner via a scoped `bypass_actors` entry** on the `main` ruleset (bypass mode: pull requests) — so the owner's own release PR doesn't need an approving review it cannot self-grant. **Every non-owner PR to `master` still requires 1 approving review** (the owner approves those normally — they aren't self-authored), and **required status checks still gate every merge**. No App, no self-approve, no temporary ruleset toggle. See [`RELEASING.md`](RELEASING.md).

**Reserved branch names — the rule:** the patterns **`vX.Y-*`, `vX-*`, `chore/vX.Y-*`, `chore/vX-*`** are the targeting conditions of the [`next-version-prep-branch`](https://github.com/jml6m/fas-js/rules) ruleset and are **reserved for the single per-release version-integration branch**:

- A branch carrying a reserved pattern *is* the integration branch — only one should exist per release line.
- **Every other branch** (topic, fix, chore, experiment) must use a **non-reserved** name; the convention is **`topic/<name>`**. A version reference is fine as long as it does not reproduce a reserved pattern inside a single path segment — `topic/v1.8-foo` and `chore/v1.8/foo` are safe; `chore/v1.8-foo` is **not**.

Naming a topic branch with a reserved pattern silently subjects it to the integration-branch ruleset (PR-required, linear history, `test`/`lock-files` gates) and breaks normal push/merge flow — which is exactly what the ruleset's creation rule prevents.

**Ruleset enforcement (no committed code):** branch naming is managed entirely through two repository rulesets.

| Ruleset | Targets | Naming effect |
| --- | --- | --- |
| `main` | `~DEFAULT_BRANCH` (`master`) | `master` is creation/deletion/non-fast-forward protected; PRs + required checks gate every change. |
| `next-version-prep-branch` | `chore/v*.*-*`, `v*.*-*`, `v*-*`, `chore/v*-*` | Its **Restrict creations** rule blocks anyone *without bypass* from creating a reserved-named branch, so only the admin-created integration branch can hold a reserved name. Also applies the no-approval `test`+`lock-files` gate to PRs into it. |

Bypass is scoped to the **Repository admin** role (`next-version-prep-branch`: mode **Always**; `main`: mode **Pull requests**). The admin — and agents acting under the admin account — therefore *can* create a reserved-named branch: that is intentional (the admin creates the integration branch) and is why the **admin push gate** below exists as the self-discipline layer.

> Rulesets gate **ref names, not a branch's git ancestor.** "Branch off `master` only for the integration branch / off the integration branch for topic work" is a convention; the enforceable guarantee is the name reservation above.

Inspect / verify the live rulesets:

```bash
gh api repos/jml6m/fas-js/rulesets --jq '.[].name'
gh api repos/jml6m/fas-js/rulesets \
  --jq '.[] | select(.name=="next-version-prep-branch")
        | {name, targets:.conditions.ref_name.include, rules:[.rules[].type],
           bypass:[.bypass_actors[]|{actor_id,actor_type,bypass_mode}]}'
```

To set/adjust them: **Settings → Rules → Rulesets** (or `gh api --method PUT repos/jml6m/fas-js/rulesets/<id>` with the full ruleset JSON). The two settings that make the reservation work are **Restrict creations = on** on `next-version-prep-branch`, with the **Repository admin** role on its **Bypass list** (mode *Always*).

**Admin push gate (project owner's machine only):** local pushes from the admin's dev box run a personal `pre-push` hook so a hand-made local commit cannot push code that fails the same static gates CI runs. It is **never committed to the repo** — install it via Git's global template dir:

```bash
# one-time, on the admin's machine
mkdir -p ~/.git_templates/hooks
cat > ~/.git_templates/hooks/pre-push << 'EOF'
#!/usr/bin/env sh
# Blocks the push if any static gate fails. Bypass intentionally with `git push --no-verify`.
set -e
echo "pre-push: typecheck → lint → docs:lint"
npm run --silent typecheck                 # fails on any type error
npm run --silent lint -- --max-warnings=0  # fails on any ESLint error OR warning
npm run --silent docs:lint                 # fails on any markdownlint violation
echo "pre-push: passed."
EOF
chmod +x ~/.git_templates/hooks/pre-push
git config --global init.templateDir ~/.git_templates
# the template only applies to NEW clones; for an existing clone copy it in once:
#   cp ~/.git_templates/hooks/pre-push .git/hooks/pre-push && chmod +x .git/hooks/pre-push
```

**When it fails:** the push is blocked **iff a step exits non-zero** — a TypeScript type error, an ESLint error *or* warning (we pass `--max-warnings=0` so warnings aren't silently allowed), or any markdownlint violation. A step that succeeds with only informational output does not block. Bypass an exceptional push with `git push --no-verify`.

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
npm run health:dead # knip — unused files/exports/deps (files are fatal; see below)
npm test            # typecheck + lint + build + mocha + c8 coverage
```

- **Dead-code / unused-file detection** is run by [`knip`](https://knip.dev) via `npm run health:dead` (config in [`knip.json`](knip.json)). It is **escalating-severity by design**: an unused *file* is fatal (`rules.files: "error"`), while unused exports/types/deps surface as warnings on PRs. On PRs into the integration branch the CI step is **non-blocking** (a visible warning); at publish it is a **hard gate** — `npm run health:dead:strict` (`knip --production --strict`, scoped to the shipped `src/modules.ts` entry) runs in [`publish.yml`](.github/workflows/publish.yml) and **`--strict` escalates warnings to failures**, so any unused export or dependency also blocks publish. Entry points are `src/modules.ts`/`src/demo-bundle.ts` (auto-detected from `package.json`/[`tsup.config.ts`](tsup.config.ts)) plus `scripts/` and `test/`.

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

- **CI** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)): two jobs so no environment-independent gate runs more than once per PR. The **`static-gates`** job (single Node 20) runs the env-independent gates exactly once — `check-package-scripts`, `typecheck`, `lint`, `npm audit --audit-level=high`, `build`, then the security guards (`check-guard-tests`, `check-public-api`, `check-npm-pack`) and the non-blocking dead-code scan (`health:dead`). The **`test`** matrix job runs only the env-dependent runtime tests (build + mocha + c8 coverage) across Node 18/20/22, emitting the required `test (18)` / `test (20)` / `test (22)` check contexts and uploading coverage to Codecov on Node 20 via repository secret `CODECOV_TOKEN`. `npm test` remains the local full-gate convention; the CI split does not change it. (Docs are linted by the separate, path-filtered `docs-lint.yml`, which already runs once.)
- **Auto-link** (`.github/workflows/auto-link-issue.yml`): prepends `Closes #N` when branch name starts with `N-`.
- **Guard-test completeness**: `check:security` (in `npm test` and CI) runs [`scripts/check-guard-tests.mjs`](scripts/check-guard-tests.mjs), which fails closed if any guard script (`scripts/check-*.mjs`) lacks a matching unit-test spec (`test/check-*.spec.js`). This is a **structural** guarantee independent of line coverage — see [`docs/coverage-policy.md`](docs/coverage-policy.md). Coverage scope stays `src/**` only (`scripts/` is intentionally out of c8 scope; the completeness gate is the guarantee).
- **Dead-code check**: the `static-gates` job runs `npm run health:dead` (knip) **non-blocking** — an unused file/export is surfaced as a warning on PRs. The **hard** dead-code failure lives in [`publish.yml`](.github/workflows/publish.yml) (`npm run health:dead:strict`), so dead code cannot ship even though it does not block day-to-day integration merges. See [`knip.json`](knip.json).
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
- Locked code is a stable base that new functionality is built *on top of*.
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
