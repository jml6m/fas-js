# Agent guidance

Project-facing guidance for coding agents and reviewers. Contribution flow (issues, target branch,
PR conventions) is in [CONTRIBUTING.md](CONTRIBUTING.md). Keep this file under 9,000 characters
(enforced by [`scripts/check-agent-file-length.mjs`](scripts/check-agent-file-length.mjs)).

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

- Coverage floor: **90%**. Policy in [`coverage-policy.md`](coverage-policy.md).
- Guard scripts under `scripts/check-*.mjs` must have a matching `test/check-*.spec.js`
  (`check:security`).
- Single Mocha file: `cross-env NODE_OPTIONS=--import=tsx npx mocha "test/foo.spec.js"`.
- Don't change `version` in `package.json`.

## Architecture

- Public API: `createFSA`, `simulateFSA`, `stepOnceFSA` from [`src/modules.ts`](src/modules.ts).
- Regular core: `src/automata/`, `src/components/`, `src/engine/`, `src/languages/`, `src/utils/`.
- Demo: [`src/demo-bundle.ts`](src/demo-bundle.ts) + `demo/` (local `npm run serve:demo`).
- **Do not** change the public API surface. That is a major-version decision for the maintainer.

## Locked files

[`.github/PROTECTED_FILES.json`](.github/PROTECTED_FILES.json) lists the critical pieces of the
solution. The `lock-files` check flags edits to them; they need the maintainer's sign-off. New
files are open by default.

## Docs conventions

- In-repo paths in Markdown are clickable links. Link rather than duplicate.
- Markdownlint owns `.md` formatting (Prettier does not). AGENTS/CLAUDE are length-capped, not
  format-linted.
