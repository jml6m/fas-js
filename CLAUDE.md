# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

## Start here

The authoritative agent guidelines for this repo live in **[AGENTS.md](./AGENTS.md)** — read it first and follow it. It is the source of truth for the project's purpose, the public API contract, the branch model, and CI/CD policy. This file does not duplicate it.

Task-specific protocols live in **[.grok/rules/](./.grok/rules/)** and apply to Claude too:

- `issue-workflow.md` — GitHub issues are the planning source of truth.
- `fast-iteration.md` — use short-lived probe scripts to learn fast, then promote or delete.
- `testing.md` — what to test (API contract, artifact fidelity, coverage thresholds).
- `session-validation.md` — the mandatory end-of-task validation gate.

## Repo quick facts

- `fas-js` — ESM TypeScript library (`"type": "module"`), published to npm as `fas-js`.
- Exports: `simulateFSA`, `stepOnceFSA`, `createFSA` from `src/modules.ts`.
- Build output: `lib/index.js` (ESM), `lib/index.cjs` (CJS), `lib/bundle.js` (IIFE), `lib/index.d.ts`.

## Commands

| Command | Purpose |
|---|---|
| `npm test` | Full gate: typecheck → lint → build → mocha + c8 coverage (90% threshold). |
| `npm run lint` | ESLint on `src/` + encoding gate. |
| `npm run lint:encoding` | Fails on non-UTF-8 / BOM / CRLF / control chars in tracked files. |
| `npm run audit:ci` | Hard-fails on critical/high in **production** deps (dev-only + moderate/low reported, not gated). Separate from `lint`; also run by `npm:reinstall` and CI. |
| `npm run build` | tsup → `lib/`. |
| `npm run typecheck` | TypeScript type check (no emit). |
| `npm run npm:reinstall` | Clean reinstall, then the audit gate. |
| `npm run git:pull` | Full `fetch --all --prune` + fast-forward pull. |
| `npm run release:patch\|minor\|major` | Bump version + push tag → triggers the publish workflow. |
| `npm run publish:dry` | Dry-run publish (no actual upload). |

## Conventions

Follow the author's standing coding conventions: comments only where they earn their place (no changelog-style "updated/refactored" comments); targeted edits over full-file rewrites; never use `alert()` in frontend JS; check for existing SCSS variables before hardcoding. For commit/push guidance, defer to AGENTS.md's protocol — do not commit or push unless it directs you to.

## Before handing work back

Run `npm test`, `npm run lint`, and `npm run audit:ci`; report pass/fail explicitly per `.grok/rules/session-validation.md`. Do not claim a check passed unless it actually ran.
