# 🤖 Agent & AI Protocols

**Project:** fas-js
**Runtime:** Node.js (>=18.13)
**Testing:** Mocha + c8 (coverage)
**Build:** tsup → `lib/index.js`, `lib/index.cjs`, `lib/bundle.js`
**Types:** TypeScript (strict)

> **📌 Single Source of Truth**: This document is the authoritative reference for coding standards, architecture rules, and project policies. Copilot and Grok read this file natively; `CLAUDE.md` is a bare pointer to it.

---

## 🛑 Critical Protocols (Read First)

### 0. GitHub credentials — never commit values

Do **not** commit GitHub App IDs, installation IDs, client IDs/secrets, private keys,
PATs, tokens, webhook secrets, or any other Actions secret/variable **values**. Refer
to apps by slug/name (e.g. `jml6m-bot`), never by numeric ID. Workflows may reference
secret *names* (e.g. `${{ secrets.APP_ID }}`) — never hardcode values into source,
docs, comments, or agent instruction files. Local App credentials live only under
`~/workspaces/.tooling/` (outside any git repo); repository secrets live only in
GitHub Settings → Secrets and variables.

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
- Merge those topic PRs into the integration branch once CI is green. A PR that edits a **Locked** path shows `lock-files` **red** — this is expected on the integration branch (a permissive staging area); merge it with admin privileges (`gh pr merge --admin`). The *same* red on a `master` release PR is cleared **only** by the admin's manual `lock-files` toggle, never by an agent.
- Request review by posting an `@copilot` review-request **comment** on the PR (note: `gh pr edit --add-reviewer copilot` does **not** resolve the Copilot bot)
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

- **Dead-code / unused-file detection** is run by [`knip`](https://knip.dev) via `npm run health:dead` (config in [`knip.json`](knip.json)). Knip reports an unused *file* as an error (non-zero exit) while unused exports/types/deps surface as warnings. On PRs into the integration branch the CI step is **non-blocking** (it surfaces a warning only), but at publish it is a **hard gate** — `npm run health:dead:strict` (`knip --production --strict`, scoped to the shipped `src/modules.ts` entry) runs in [`publish.yml`](.github/workflows/publish.yml) and **`--strict` escalates warnings to failures**, so any unused export or dependency also blocks publish. (This check is expected to run on Node 20+; CI/publish execute it on Node 20.) Entry points are `src/modules.ts`/`src/demo-bundle.ts` (auto-detected from `package.json`/[`tsup.config.ts`](tsup.config.ts)) plus `scripts/` and `test/`.

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

The `lock-files` CI check (see [`.github/PROTECTED_FILES.json`](.github/PROTECTED_FILES.json)) locks the project's **proven, pre-v2 foundation**. The list enumerates **exact paths, not globs** — so **new files are Open (free) by default** and only a listed path that changes trips the gate. That is deliberate: v2 adds RegEx/GNFA support as *new files* against this frozen base without fighting the lock. Changing a listed path is intentionally rare and follows the override process below.

### Two categories: Locked / Open

> **Notation:** the brace-expansion shorthand below (e.g. `src/automata/{DFA,NFA}.ts`) is *illustrative shorthand for readability only* — the `lock-files` gate does **no** brace/glob expansion. The **canonical, exact-path list is [`.github/PROTECTED_FILES.json`](.github/PROTECTED_FILES.json)** (a flat array of literal paths); this table summarizes it. Because entries are literal paths, a new file never matches until its exact path is added.

**🔒 Locked** — the trusted core. Grouped (the canonical exact paths live in [`.github/PROTECTED_FILES.json`](.github/PROTECTED_FILES.json)):

| Group | Paths | Why locked |
| ----- | ----- | ---------- |
| Proven core impls | `src/automata/{DFA,NFA}.ts`, `src/components/{Alphabet,NFATransition,State,Transition}.ts`, [`src/engine/Simulators.ts`](src/engine/Simulators.ts), `src/globals/{globals,errors}.ts`, [`src/interfaces/FSA.ts`](src/interfaces/FSA.ts), `src/languages/{Language,LanguageOperations,NFAtoDFA,RegularLanguage,fsaHelpers}.ts`, `src/utils/{DFAUtils,FSAUtils,NFAUtils}.ts` | The regular-language algorithm code, comprehensively tested and stable before v2 |
| Behavioral tests | `test/{components,dfa,nfa,simulators,utils,languages,error-codes,workflows,digraph-cli}.spec.js`, [`test/fixtures/digraph-large-ring.expected.dot`](test/fixtures/digraph-large-ring.expected.dot), `test/helpers/{dfaLanguageEqual,membershipAssertions,subsetWitnessAssertions}.js` | The behavioral contract for the proven core — weakening these silently would erode fidelity |
| Guard group | `scripts/{check-protected-files,check-public-api,check-npm-pack,check-package-scripts,check-guard-tests}.mjs` + their `test/check-*.spec.js` | The gates themselves and their tests — must not be weakened or left untested |
| Machinery | [`.github/PROTECTED_FILES.json`](.github/PROTECTED_FILES.json) | Defines the locked set — locking it makes every change to the set owner-reviewed |
| Workflows (all) | `.github/workflows/{ci,docs-lint,pages,auto-link-issue,lock-files,publish,release-base-guard,verify-release-version}.yml` | CI/CD + supply-chain boundary |
| Build | [`tsup.config.ts`](tsup.config.ts), [`scripts/postbuild.mjs`](scripts/postbuild.mjs) | Govern the emitted artifacts / published surface |
| Legal | [`LICENSE`](LICENSE) | Legal terms |
| Docs (single file) | [`docs/coverage-policy.md`](docs/coverage-policy.md) | Durable policy — note: `docs/**` is **not** locked; new docs are Open |

**🟢 Open** — deliberately *not* locked, so day-to-day work flows without friction:

- **API surface** — governed by the api-contract check, not the file lock: [`src/modules.ts`](src/modules.ts), [`test/helpers/publicApiContract.js`](test/helpers/publicApiContract.js), [`test/api-contract.spec.js`](test/api-contract.spec.js), [`test/api-artifact.spec.js`](test/api-artifact.spec.js). (A breaking API change is a v2 event; the contract check — not `lock-files` — is what forces the deliberate update. See [`RELEASING.md`](RELEASING.md).)
- **Barrels** — removals are caught by `typecheck`: `src/{automata,components,utils}/index.ts` (`src/languages/index.ts` was deleted as dead in #309).
- **Demo:** [`src/demo-bundle.ts`](src/demo-bundle.ts), `test/demo*.spec.js`, `scripts/{serve-demo,demo-static-server}.mjs`.
- **Dev utils:** `scripts/{prebuild,free-port,reinstall}.{mjs,js}`.
- **Dev/build config:** [`tsconfig.json`](tsconfig.json), [`eslint.config.js`](eslint.config.js), [`.prettierrc.json`](.prettierrc.json), [`.prettierignore`](.prettierignore), [`.c8rc.json`](.c8rc.json), [`.editorconfig`](.editorconfig), [`.markdownlint-cli2.yaml`](.markdownlint-cli2.yaml), [`.lychee.toml`](.lychee.toml), [`codecov.yml`](codecov.yml), [`.gitignore`](.gitignore).
- **Manifests:** [`package.json`](package.json), [`package-lock.json`](package-lock.json) — intentionally Open so version/dependency churn flows freely; the manifest is guarded by the locked *checkers* ([`check-package-scripts.mjs`](scripts/check-package-scripts.mjs), [`check-npm-pack.mjs`](scripts/check-npm-pack.mjs)), not by locking `package.json`.
- **Governance/docs:** `.github/{CODEOWNERS,FUNDING.yml,dependabot.yml,ISSUE_TEMPLATE/*,pull_request_template.md}`, [`AGENTS.md`](AGENTS.md), [`CLAUDE.md`](CLAUDE.md), [`README.md`](README.md), [`RELEASING.md`](RELEASING.md), [`SECURITY.md`](SECURITY.md), and any new `docs/*`.

### Bypass model (verified against the live rulesets)

The `lock-files` gate has **no automated bypass**. The single deliberate way a Locked change reaches `master` is the **manual `lock-files` toggle on the release PR** — this **stays by design** as the one intentional `master` gate.

| Scope | Behavior |
| ----- | -------- |
| **Integration branch (`chore/v*`)** | Permissive staging. The `next-version-prep-branch` ruleset gates topic PRs on `test`+`lock-files` with **0 approvals** — so an ordinary topic PR (no protected-file change) merges as soon as those checks are green. The admin additionally has an **`always` bypass**, which is what makes protected changes frictionless here: a topic PR that edits a Locked file shows a red `lock-files` (expected), and the admin merges it via that bypass (`gh pr merge --admin`). So: **green checks are the normal path; the admin bypass is the escape hatch for the intentional protected-file change** — that change still faces the real `lock-files` gate later, on the release PR into `master`. |
| **`master` (`main` ruleset)** | Hard gate. Admin bypass is *pull-requests only*: **cannot** direct-push and **cannot** merge past a failing required check (`test 18/20/22`, `lock-files`, `verify-release-version`). A protected-file change reaches `master` **only** by the owner manually toggling `lock-files` off/on on the release PR — the sole, deliberate bypass. |
| **Tags (`v*`)** | Immutable — never bypassed. |

A protected change that lands on the integration branch therefore **can't reach `master` silently**: it resurfaces as a red `lock-files` on the release PR's cumulative diff, forcing the owner's toggle decision.

**Override process** (when a Locked change is intentional and must reach `master`):

1. Open a PR with a clear explanation of why the Locked file must change.
2. The `lock-files` check will fail — that failure is expected.
3. Request review and tag `@jml6m`.
4. The owner (`@jml6m`) reviews, then temporarily disables the `lock-files` required status check in the ruleset, merges, and re-enables it.

There is no automated bypass — even owner- or agent-authored PRs go through this process, so every change to the Locked set is explicitly human-reviewed before it lands on `master`.

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
- A new component (a language module, a critical utility, an additional gate) can be proposed for the Locked set once it has proven itself and matches the spirit of the Locked groups above.

**How the locked set evolves:** a component demonstrates long-term stability under contract-level tests → a PR adds its **exact path** to [`.github/PROTECTED_FILES.json`](.github/PROTECTED_FILES.json) (and the Locked groups above) → because the list itself is Locked, that PR follows the override process → thereafter the new path requires the same owner-level approval. (Because the list is exact paths, adding v2's new RegEx/GNFA files does *not* touch the lock until they are deliberately proposed for it.)

This keeps most day-to-day work (features, experiments, non-core refactors) flowing on integration branches while shielding core contracts, test helpers, the public API surface, and the protection mechanisms themselves from accidental or lightly-reviewed change.

---

## 📋 Code Review & PR Interaction

- Respond to comments from the primary reviewer or when @-tagged.
- No passive acknowledgements — make the change or explain with technical reasoning.
- Human reviewer comments take priority over bot review threads.

## Documentation conventions

- **Linkable paths must be clickable links.** Any in-repo path mentioned in a Markdown file must be written as a clickable link to the target (e.g. [`src/modules.ts`](src/modules.ts)), not as bare inline code. Command examples and illustrative / non-existent paths are exempt.
- Docs are gated by [`docs-lint.yml`](.github/workflows/docs-lint.yml): [lychee](https://lychee.cli.rs/) validates that links and `#anchors` resolve, and [markdownlint-cli2](https://github.com/DavidAnson/markdownlint-cli2) enforces formatting per [`.markdownlint-cli2.yaml`](.markdownlint-cli2.yaml). Only the GitHub form templates — [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/) and [`.github/pull_request_template.md`](.github/pull_request_template.md) — are excluded (their template syntax isn't plain prose). Run `npm run docs:lint:fix` before pushing. Prettier does **not** format Markdown (see [`.prettierignore`](.prettierignore)) — markdownlint is the sole Markdown authority.
- **Docs are an as-is snapshot of the current version, not an archive.** We do not keep per-release documentation history in the repo — backward compatibility is handled in code on a best-effort basis, but old-release specs, runbooks, and `docs/<version>-prep/` working files are not maintained here. Promote durable decisions into this file or [`RELEASING.md`](RELEASING.md) and delete the scratch; the canonical release runbook is [`RELEASING.md`](RELEASING.md).
