# Releasing fas-js

Authoritative runbook for shipping a release. Keep process detail here (not in
public essay form under `docs/`). Agent summary: [`AGENTS.md`](./AGENTS.md).

## Branch model

```
topic/<name> ──PR──▶ chore/vX.Y-* (integration) ──release PR──▶ master ──tag vX.Y.Z──▶ npm
```

| Branch | Role |
| --- | --- |
| `master` | Stable / npm. **1 approving review** + required checks. No review-bypass on the live `main` ruleset. |
| `chore/vX.Y-*` (or reserved `vX.Y-*` / `chore/vX-*` / `vX-*`) | **One** integration branch per release — temporary default for the cycle. **0** required approvals + required checks. |
| `topic/<name>` | All other work. Never use a reserved integration name pattern. |

- Topic work **never** targets `master` (except Dependabot `github_actions/*`). See [`release-base-guard`](./.github/workflows/release-base-guard.yml).
- Wave / mid-cycle review: compare [`master...chore/vX.Y-*`](https://github.com/jml6m/fas-js/compare/master...chore/v1.10-prep) (or since last reviewed SHA). Comment on the wave-plan issue — **do not** open a long-lived integration→`master` PR just for review.
- Live ruleset names: `main`, `main-lock-files`, `next-version-prep-branch`, `next-version-prep-branch-lock-files`, `v*` (tags).

## PR authorship (`jml6m-bot`)

Command-line agents should open PRs as **`jml6m-bot`** when practical:

```bash
GH_TOKEN="$(~/workspaces/.tooling/gh-app-token.sh jml6m/fas-js)" gh pr create ...
```

That keeps the admin free to **Approve** (not stuck on self-authored PRs) and avoids some bot/`GITHUB_TOKEN` workflow gaps. Topic PRs into the integration branch still need **0** human approvals once checks pass.

## 1. Accumulate work on the integration branch

Open `topic/*` PRs into `chore/vX.Y-*`. Keep 90% coverage and the public API contract intact ([`coverage-policy.md`](./coverage-policy.md)).

| Situation | Merge |
| --- | --- |
| Required checks green, no Locked paths | Normal merge / auto-merge OK |
| **`lock-files` red on purpose** (Locked path changed) | **Admin merge only** (`gh pr merge --admin`). **Never** enable auto-merge — it will wait forever. Integration lock-files ruleset allows admin/bot bypass; `master` does not. |

## 2. Bump the version (human-initiated)

Agents never bump `version`. On a topic branch into the integration branch:

```bash
npm version X.Y.Z --no-git-tag-version
```

`package.json` is not Locked. The release PR is gated by [`verify-release-version`](./.github/workflows/verify-release-version.yml) (**fails unless version increases vs `master`**).

## 3. Open the release PR (integration → master)

Open (prefer **bot-authored**) PR: `chore/vX.Y-*` → `master`.

Required on `main` (live): `test (22)`, `docs-lint`, `static-gates`, `verify-release-version`, plus `lock-files` via `main-lock-files`.

## 4. Merge the release PR (real Approve)

1. All required checks green.
2. Admin **Approves** the bot-authored PR (allowed — not self-authored).
3. Squash-merge.

If the cumulative release diff touches **Locked** paths, `lock-files` stays red on `master` with **no bypass**. Only the admin may temporarily remove the `lock-files` required check from `main-lock-files`, merge, and re-enable it. That is the sole deliberate `master` override.

## 5. Tag and publish

Prefer a tag that points at the **`master` tip** (never a stray local tag — `npm version` without `--no-git-tag-version` can create a wrong local tag):

```bash
git fetch origin master
git tag vX.Y.Z origin/master   # fails loudly if the tag name already exists locally
git push origin vX.Y.Z
```

Tag push → [`publish.yml`](./.github/workflows/publish.yml) (OIDC) → `npm` environment (**manual `jml6m` approval**). Workflow asserts: (1) tag push only, (2) tag name == `package.json` version, (3) **tag SHA == `origin/master` tip** (#328). Confirm in the Actions **publish log** (`+ fas-js@X.Y.Z`).

```bash
gh release create vX.Y.Z --target master --generate-notes
```

### Major releases (v2+)

- Update the public-API baseline in Locked [`scripts/check-public-api.mjs`](./scripts/check-public-api.mjs) **on purpose** (red `lock-files` until the release override). See issue #318.
- Publish migration notes in the **GitHub Release body** (and optionally a short root doc if needed). Do not grow a permanent public process archive under `docs/`. See #317.

## 6. Tag immutability (no retag)

Published `vX.Y.Z` tags are **permanent** (`v*` ruleset). Fix mistakes with a **new patch tag**, never by moving a tag.

## Notes

- Un-run checks (`action_required` on first-time bot PRs) are **not** passes — approve workflow runs first.
- `publish.yml` must `npm run build` before `check:security`.
- Required PR checks (rulesets): `static-gates`, `test (22)`, `test (24)`, `docs-lint`; master also `verify-release-version` + `lock-files`. CI is **pull_request-only** (no push dual-run).
- Required `docs-lint` runs on **every** PR (no path filter) so the required check always reports.
