# Phase 2 Audit — Issue Drafts

Use these with `gh issue create` after Phase 1 governance lands on `main-v1-1-prep`.
Create **children first**, then the parent epic with real issue numbers.

---

## Parent epic

**Title:** `[Epic]: v1.1 Prep — Package & Toolchain Audit`

**Labels:** `epic`

**Body:**

### Epic description

Audit and plan the v1.1 prep modernization of fas-js: dependencies, build outputs, TypeScript migration, test stack, coverage policy, security remediation, demo port, and release runbook. No implementation in this epic — only scoped child issues that Phase 3 executes.

### Task list

- [x] Dependency audit (#214)
- [x] Dependabot strategy (#215)
- [x] Build target spec (#216)
- [x] TypeScript migration plan (#217)
- [x] Test runner decision (#218)
- [x] Coverage policy — 100% (#219)
- [x] Windows dev support (#220)
- [x] API contract tests (#221)
- [x] Security remediation (#222)
- [x] Demo migration (#223)
- [x] README modernization (#224)
- [x] master → main rename runbook (#225)

**Parent epic:** #226

---

## Child issues (create these first)

### 1. Dependency audit

**Title:** `[AUDIT] Dependency audit — prod vs dev, bundle footprint`

**Labels:** `epic`, `v1.1-prep`

**Body:**

Audit every entry in `package.json` and classify as production runtime, build-only, or test-only.

**Deliverables:**
- Table of current deps with version, purpose, and keep/remove/replace recommendation
- Decision on whether `chalk`, `core-js`, `@babel/runtime`, `regenerator-runtime` belong in the published bundle
- List of deps safe to remove after TypeScript + modern bundler migration

**Acceptance criteria:**
- [ ] Written audit attached to this issue or linked doc
- [ ] No code changes required in this issue

---

### 2. Dependabot strategy

**Title:** `[AUDIT] Dependabot ignore rules — replacement strategy`

**Labels:** `v1.1-prep`, `dependencies`

**Body:**

`dependabot.yml` currently ignores most meaningful upgrades, freezing a 2019-era stack. Design a replacement strategy for `main-v1-1-prep`.

**Deliverables:**
- Which ignores to remove and in what order (grouped PRs)
- Grouping rules for Babel, Mocha, Browserify successors
- Policy for security-only bumps vs full toolchain upgrades

---

### 3. Build target spec

**Title:** `[AUDIT] Build output spec — ESM, CJS, UMD`

**Labels:** `v1.1-prep`, `architecture`

**Body:**

Define the target `package.json` `main` / `module` / `exports` fields and build artifacts for v1.1.

**Constraints:**
- `lib/bundle.js` UMD must continue working for jsDelivr CDN users (`fasJs` global)
- npm consumers may get ESM + CJS dual package

**Deliverables:**
- Proposed `package.json` exports map
- Bundler choice (`tsup`, `rollup`, or other) with rationale
- Migration steps from Browserify + Babelify + tinyify

---

### 4. TypeScript migration plan

**Title:** `[AUDIT] TypeScript migration plan — Flow removal`

**Labels:** `v1.1-prep`, `architecture`

**Body:**

Plan migration of `src/**/*.js` (Flow) to TypeScript.

**Deliverables:**
- File-by-file migration order
- `tsconfig.json` strictness level
- Interim period strategy (if any)
- Public API type definitions for `createFSA`, `simulateFSA`, `stepOnceFSA`

---

### 5. Test runner decision

**Title:** `[AUDIT] Test runner — Mocha upgrade vs node --test`

**Labels:** `v1.1-prep`, `testing`

**Body:**

Evaluate test runner options for v1.1 prep.

**Options:**
- Upgrade Mocha + Chai + nyc in place
- Migrate to Node built-in `node --test` (used in newer workspace repos)

**Deliverables:**
- Recommendation with pros/cons
- Migration plan for existing `test/**/*.spec.js` files
- Coverage tool choice (nyc, c8, or built-in)

---

### 6. Coverage policy — 100%

**Title:** `[AUDIT] Coverage policy — 100% with documented exceptions`

**Labels:** `v1.1-prep`, `testing`

**Body:**

Define the coverage gate for `main-v1-1-prep`: **100% line coverage** with exceptions only for genuinely complex edge cases.

**Deliverables:**
- nyc/c8 threshold config change plan (90 → 100)
- Exception process: inline comment + linked issue required
- Inventory of current uncovered lines in `src/`

---

### 7. Windows dev support

**Title:** `[BUG] npm test fails on Windows — nyc/mocha path issue`

**Labels:** `bug`, `v1.1-prep`, `windows`

**Body:**

On Windows (Node 22), `npm test` fails after build:

```
Error: Cannot find module '...\node'
```

Reproduction: `npm ci && npm test` on Windows 10/11.

**Deliverables:**
- Root cause identified (cross-env, nyc, mocha arg parsing)
- Fix verified on Windows and Linux CI

---

### 8. API contract tests

**Title:** `[AUDIT] API contract tests — lock public surface`

**Labels:** `v1.1-prep`, `testing`

**Body:**

Add golden/contract tests for the public API before any modernization PRs land:

- `createFSA(Q, Σ, δ, q0, F)` — DFA and NFA creation, validation errors
- `simulateFSA(w, fsa, ...)` — acceptance, rejection, `returnEndState`
- `stepOnceFSA(w, qin, fsa, ...)` — single-step transitions

**Deliverables:**
- Contract test file(s) that must pass on every Phase 3 PR
- Documented breaking-change process (major version only)

---

### 9. Security remediation

**Title:** `[AUDIT] Security remediation — 45 npm audit findings`

**Labels:** `v1.1-prep`, `security`

**Body:**

`npm audit` reports 45 vulnerabilities (11 critical) on current lockfile. Inventory and plan remediation without uncontrolled breaking changes.

**Deliverables:**
- Categorized findings: fix now / fix with toolchain upgrade / accepted risk
- Ordered remediation PR plan
- Whether `npm audit --audit-level=high` in CI should fail (currently `continue-on-error`)

---

### 10. Demo migration

**Title:** `[Epic]: Demo port — ObservableHQ to self-hosted v1.1 demo`

**Labels:** `epic`, `v1.1-prep`, `demo`

**Body:**

The interactive FSA demo lives on [ObservableHQ](https://beta.observablehq.com/@jml6m/state-machine-simulator). Plan porting to a better host and building a v1.1 demo.

**Requirements:**
- Keep v1 demo accessible for legacy users
- v1.1 demo uses modernized library build
- Document hosting choice (GitHub Pages, separate repo, or in-repo `demo/`)

**Sub-tasks (create as separate issues):**
- [ ] Evaluate hosting options
- [ ] Port UI (preact + d3 + d3-graphviz)
- [ ] Wire to v1.1 bundle
- [ ] Update README demo links

---

### 11. README modernization

**Title:** `[AUDIT] README update plan for v1.1`

**Labels:** `v1.1-prep`, `documentation`

**Body:**

Plan README changes for v1.1 release:

- ESM / CJS import examples alongside UMD CDN snippet
- Branch policy pointer to CONTRIBUTING.md
- Updated badges after `master` → `main` rename
- Demo links (v1 legacy + v1.1)
- Fix known typo (`nfa_tfunc = =`)

---

### 12. master → main rename runbook

**Title:** `[AUDIT] Release runbook — master to main rename at v1.1`

**Labels:** `v1.1-prep`, `release`

**Body:**

Document the steps for v1.1 release:

1. Final PR `main-v1-1-prep` → `master`
2. Rename default branch `master` → `main` on GitHub
3. Update CI badge URLs, Codecov default branch, README links
4. Human version bump + `v*.*.*` tag
5. `publish.yml` OIDC publish (upgrade workflow if needed)

**Deliverables:**
- Checklist with owner (human vs agent) per step
- List of all URLs/refs that mention `master`