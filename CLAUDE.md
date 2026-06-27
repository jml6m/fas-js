# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

## Start here

The authoritative agent guidelines for this repo live in **[AGENTS.md](./AGENTS.md)** — read it first and follow it. It is the source of truth for the critical protocols (loop prevention, versioning/release policy, command-execution safety), the branch workflow, build/test, architecture, and CI/CD. The [`.github/copilot-instructions.md`](./.github/copilot-instructions.md) mirror also defers to `AGENTS.md`. This file does not duplicate it.

## Repo quick facts

- `fas-js` — a strict-TypeScript Finite Automaton Simulator published to npm. Public API (`simulateFSA`, `stepOnceFSA`, `createFSA`) is exported from [`src/modules.ts`](./src/modules.ts); build via tsup to `lib/` (ESM + CJS + IIFE bundle + types).
- `npm test` runs the full gate (typecheck → lint → build → check:security → c8 mocha). Coverage floor on `master`/integration branches is **90%**.
- **Do not** bump `package.json` version, run `npm publish`, or `git push` as part of routine agent work — publishing is tag-triggered OIDC only, and version bumps are human-initiated (see AGENTS.md §2–§3).
- **Protected files** (see [`.github/PROTECTED_FILES.json`](./.github/PROTECTED_FILES.json)) are guarded by the `lock-files` gate with **no automated bypass** — touching them requires the owner to manually relax the ruleset. The release process and these gates are being hardened under the release epic.
- `master` is the default branch; releases flow topic → version integration branch (`chore/vX.Y-*`) → `master` → `v*.*.*` tag.
