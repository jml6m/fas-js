# Releasing fas-js

The authoritative, override-free runbook for shipping a release. The goal: a
release needs **no temporary ruleset relaxation and no manual self-approve**.
See [`AGENTS.md`](./AGENTS.md) §4 for the branch policy this enforces.

## Branch model

```
topic branch ──PR──▶ version integration branch (chore/vX.Y-*) ──release PR──▶ master ──tag vX.Y.Z──▶ npm
```

- **One active integration branch per release**, branched from `master`, named `chore/vX.Y-*` (e.g. `chore/v1.8-hygiene`). Per [`AGENTS.md`](./AGENTS.md) §4, minor lines ship UX, tests, docs, and internal tooling; public API features are reserved for v2.
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

## 4. Approve without relaxing the ruleset

The `main` ruleset requires **1 approving review** (no self-approve, no bypass). Instead of disabling the rule:

- A maintainer applies the **`release`** label to the PR.
- [`release-auto-approve`](./.github/workflows/release-auto-approve.yml) submits an approving review via a trusted GitHub App.
- Required status checks (`test (18/20/22)`, `lock-files`) still gate the merge.

> **One-time setup:** create a GitHub App with `Pull requests: write`, install it on the repo, and store `RELEASE_APPROVER_APP_ID` + `RELEASE_APPROVER_APP_KEY` as repo secrets. The App identity must differ from the PR author. Until this exists, the workflow is inert and the label has no effect.

Squash-merge the release PR once green + approved.

## 5. Tag and publish

```bash
git tag vX.Y.Z origin/master && git push origin vX.Y.Z
```

The tag push fires [`publish.yml`](./.github/workflows/publish.yml): OIDC trusted publishing, gated by the `npm` GitHub environment (**requires manual `jml6m` approval** in the Actions UI — branch `workflow_dispatch` is rejected; it must be a tag). Verify success in the CI **publish-step log** (`+ fas-js@X.Y.Z`), not local `npm view` (CDN/proxy lag).

Then: `gh release create vX.Y.Z --target master --generate-notes`.

## 6. Tag immutability (no retag)

Published `vX.Y.Z` tags are **permanent and immutable** — never move or delete one (it would break npm provenance, and the `v*` ruleset blocks it). Fix any post-tag mistake with a **new patch tag** (`vX.Y.(Z+1)`), never by retagging.

## Notes & gotchas

- **Bot-authored PRs** (e.g. Copilot) get workflow runs stuck in `action_required` until a maintainer clicks "Approve and run workflows" — an un-run gate is **not** a pass.
- **`publish.yml` must `npm run build` before `check:security`** (it reads `lib/index.d.ts`).
- This runbook is the override-free counterpart to the v1.7 process; remaining hardening is tracked in the release epic (#282).
