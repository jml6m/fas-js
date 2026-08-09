# 🤖 Agent & AI Protocols

> **Single source of truth** for agent policy in this repo. Keep this file **under 9,000 characters** (enforced by [`scripts/check-agent-file-length.mjs`](scripts/check-agent-file-length.mjs)). Prefer links over restating detail.

---

## Critical protocols

### Credentials

### Branch model

```
topic/<name> ──PR──▶ chore/vX.Y-* (integration) ──release PR──▶ master ──tag vX.Y.Z──▶ npm
```

- **One** reserved-name integration branch per release (`chore/vX.Y-*` / `vX.Y-*` / `chore/vX-*` / `vX-*`). Everything else is **`topic/<name>`** (not a reserved pattern).
- Topic work **never** targets `master` (except Dependabot `github_actions/*`). Enforced by [`release-base-guard`](.github/workflows/release-base-guard.yml).
- Integration = temporary default for the cycle (0 approvals + required checks). `master` requires **1 approving review** + checks; no agent self-merge to `master`.
- Full runbook, tag immutability, publish: [`RELEASING.md`](RELEASING.md). Live rulesets in Settings → Rules (names: `main`, `main-lock-files`, `next-version-prep-branch`, `next-version-prep-branch-lock-files`, `v*`).

### Issues & PRs

Check open issues first. Agents put `Closes #N` / `Relates to #N` in the PR body to link PRs to Issues. Keep labels updated as well. Epics: children first, parent last, real numbers in the task list. Use [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/).

Open agent PRs as **`jml6m-bot`**. Respond to human review with a change or technical disagreement — no empty acks.

---

## Build & test

```bash
npm ci
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint src/
npm run docs:lint    # markdownlint
npm run docs:agent-length  # AGENTS/CLAUDE char cap
npm run build        # tsup → lib/
npm test             # typecheck + lint + build + check:security + c8 mocha
npm run health:dead  # knip (unused files fatal; unused exports warn)
```

- Coverage floor on `master` / integration: **90%** — policy in [`coverage-policy.md`](coverage-policy.md).
- Guard scripts under `scripts/check-*.mjs` must have matching `test/check-*.spec.js` (`check:security`).
- Single Mocha file: `cross-env NODE_OPTIONS=--import=tsx npx mocha "test/foo.spec.js"`.

---

## Architecture

- Public API: `createFSA`, `simulateFSA`, `stepOnceFSA` from [`src/modules.ts`](src/modules.ts).
- Regular core: `src/automata/`, `src/components/`, `src/engine/`, `src/languages/`, `src/utils/`.
- Demo: [`src/demo-bundle.ts`](src/demo-bundle.ts) + `demo/` (local `npm run serve:demo`).
- **Do not** change the public API surface without a human major-version decision. Let [`.github/PROTECTED_FILES.json`](.github/PROTECTED_FILES.json) inform you on critical pieces of the solution.

---

## Protected files (`lock-files`)

Canonical list: [`.github/PROTECTED_FILES.json`](.github/PROTECTED_FILES.json) (exact paths + a few globs). New files are Open by default.

- **Integration:** red `lock-files` on intentional Locked edits is expected → merge with admin/bot bypass.
- **`master`:** red `lock-files` is a hard gate; only the admin may temporarily drop the required check on the release PR, merge, and re-enable.
- Agent-instruction tripwires include `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `GEMINI.md`, `.geminiignore`, `.grok/**`, `.cursor/**`, `.gemini/**` (block silent reintroduction).

---

## CI / publish (summary)

- **CI** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)): `static-gates` once + Node matrix `test`.
- **docs-lint**: lychee + markdownlint + agent file length.
- **Publish**: `v*.*.*` tag → OIDC → `npm` environment (manual approval). Prefer tags that point at `master`. Details: [`RELEASING.md`](RELEASING.md).

---

## Docs conventions

- In-repo paths in Markdown → clickable links. Prefer linking to [`RELEASING.md`](RELEASING.md) / this file over duplication.
- Markdownlint owns `.md` formatting (Prettier does not). AGENTS/CLAUDE are length-capped, not format-linted.
