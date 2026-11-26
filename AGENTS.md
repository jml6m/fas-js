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

- Public API: `createFSA`, `simulateFSA`, `stepOnceFSA` from [`src/modules.ts`](src/modules.ts),
  plus the type `TransitionInput`.
- Regular core: `src/automata/`, `src/components/`, `src/engine/` (`Simulators.ts` indexes
  `DFASimulators` and `NFASimulators`), `src/languages/`, `src/utils/`.
- Demo: [`src/demo-bundle.ts`](src/demo-bundle.ts) + `demo/` (local `npm run serve:demo`).
- **Do not** change the public API surface. That is a major-version decision for the maintainer.

## Locked files

[`.github/PROTECTED_FILES.json`](.github/PROTECTED_FILES.json) lists the critical pieces of the
solution. They are locked on the default branch: the `lock-files` check fails every pull request
into it that touches one, and no label or approval turns it green. Pull requests into other
branches are not checked, so a protected file changed on the integration branch surfaces at the
release pull request. Locking is path-only: it doesn't lock a file's importers. New files are open
by default.

The one way through is the exception process, run by the maintainer: accept the change, add the
`locked-files-changed` label, turn the lock off, merge that pull request and nothing else, and turn
the lock back on. The Release workflow fails while the lock is off. The label is only for a pull
request into the default branch that changes a protected file: the `pr-hygiene` check fails any
other pull request that carries it. `LICENSE` is on the list and is never expected to change.

## Docs conventions

- In-repo paths in Markdown are clickable links. Link rather than duplicate.
- Markdownlint owns `.md` formatting (Prettier does not). AGENTS/CLAUDE are length-capped, not
  format-linted.
- Every `.md` file must be listed in [`.github/docs-policy.yml`](.github/docs-policy.yml); the
  `docs-policy` check fails a PR that adds an unlisted one. Put one-off notes in the PR or issue.
