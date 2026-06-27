# Releasing fas-js

The authoritative, override-free runbook for shipping a release. The goal: a
release needs **no temporary ruleset relaxation and no manual self-approve**.
See [`AGENTS.md`](./AGENTS.md) §4 for the branch policy this enforces.

## Branch model

```
topic/<name> branch ──PR──▶ version integration branch (chore/vX.Y-*) ──release PR──▶ master ──tag vX.Y.Z──▶ npm
```

- **One active integration branch per release**, branched from `master`, named `chore/vX.Y-*`. Per [`AGENTS.md`](./AGENTS.md) §4, minor lines ship UX, tests, docs, and internal tooling; public API features are reserved for v2.
- The `chore/vX.Y-*` / `vX.Y-*` / `vX-*` patterns are **reserved for that integration branch only** — topic work uses the `topic/<name>` prefix and never a reserved pattern (enforced by the `next-version-prep-branch` GitHub ruleset). See [`AGENTS.md`](./AGENTS.md) §4 → "Reserved branch names".
- **Topic work never targets `master` directly** — it PRs into the current integration branch. Enforced by [`release-base-guard`](./.github/workflows/release-base-guard.yml).
- PRs into the integration branch require passing `test (18/20/22)` + `lock-files` but **no approval** (the `next-version-prep-branch` ruleset), so day-to-day work merges without friction.

## 1. Accumulate work on the integration branch

Open topic-branch PRs into `chore/vX.Y-*`. Keep `master`-level coverage (90%) and the public-API contract intact.

## 2. Bump the version (human-initiated)

Agents never bump the version. On a small topic branch into the integration branch:

```bash
npm version X.Y.Z --no-git-tag-version   # updates package.json + package-lock.json
```

`package.json` is not in the protected-files set, so this does not trip `lock-files`. PR it into the integration branch and merge.

## 3. Open the release PR (integration → master)

Open a PR from `chore/vX.Y-*` into `master`. [`release-base-guard`](./.github/workflows/release-base-guard.yml) confirms the head is an integration/release branch.

## 4. Merge the release PR (owner bypass — no self-approve, no toggle)

The `main` ruleset requires **1 approving review**. Because release PRs are authored under the owner's account, the owner cannot self-approve — so the rule is satisfied another way **without ever relaxing it**:

- The `main` ruleset lists the repository **owner / admin role as a `bypass_actors`** entry, in **"pull requests" bypass mode** (can merge a PR that lacks the required approval; cannot push directly to `master`).
- The owner squash-merges the integration → `master` release PR directly once all **required status checks** (`test (18/20/22)`, `lock-files`) are green.

This keeps the approval requirement fully in force for **every non-owner PR** to `master` (Dependabot, Copilot, contributors — the owner approves those normally, since they aren't self-authored), while letting the sole maintainer ship a release without a self-approve, a second account, a bot App, or a temporary ruleset toggle.

> **One-time ruleset setup:** on the `main` ruleset, add the Repository **admin** role (or `jml6m`) to the **Bypass list** with mode **"Pull requests"**. This is the only standing relaxation and it is scoped to the owner — not a global approval-count change.

## 5. Tag and publish

```bash
git tag vX.Y.Z origin/master && git push origin vX.Y.Z
```

The tag push fires [`publish.yml`](./.github/workflows/publish.yml): OIDC trusted publishing, gated by the `npm` GitHub environment (**requires manual `jml6m` approval** in the Actions UI). Avoid running `workflow_dispatch` for publishing unless `publish.yml` is updated to hard-reject non-tag refs. Verify success in the CI **publish-step log** (`+ fas-js@X.Y.Z`), not local `npm view` (CDN/proxy lag).

Then: `gh release create vX.Y.Z --target master --generate-notes`.

## 6. Tag immutability (no retag)

Published `vX.Y.Z` tags are **permanent and immutable** — never move or delete one (it would break npm provenance, and the `v*` ruleset blocks it). Fix any post-tag mistake with a **new patch tag** (`vX.Y.(Z+1)`), never by retagging.

## Notes & gotchas

- **Bot-authored PRs** (e.g. Copilot) get workflow runs stuck in `action_required` until a maintainer clicks "Approve and run workflows" — an un-run gate is **not** a pass.
- **`publish.yml` must `npm run build` before `check:security`** (it reads `lib/index.d.ts`).
- Remaining release-hardening work is tracked in the release epic (#282).
