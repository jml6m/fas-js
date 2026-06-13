# Session Validation (Mandatory)

Before ending any implementation task in this repo, run validation and report results explicitly. Do not claim success without executing these checks.

## Required closeout checklist

Run in order. Stop and fix failures before handing work back.

| Step | Command | When required |
|------|---------|---------------|
| 1. Encoding | `npm run lint:encoding` | **Always** — no BOM / CRLF / non-UTF-8 / control chars. |
| 2. Audit | `npm run audit:ci` | **Always** — zero critical/high in production deps (dev-only reported, not gated). |
| 3. Tests | `npm test` | **Always** — typecheck + lint + build + mocha + c8 coverage passes. |

`npm run lint` covers ESLint + encoding only (steps 1 and 3 partially). `npm run audit:ci` is a **separate** gate — it is not part of `lint`; also run by `npm:reinstall` and the audit workflow.

## Reporting policy

In the final response, include a short **Validation** section listing each command and pass/fail, e.g.:

```
Validation: lint:encoding ✓ | audit:ci ✓ | test ✓
```

If a step was skipped, say why and call out residual risk.

## Commit / push protocol

Per `AGENTS.md`, agents propose; humans (or explicit instruction) push. After validation passes:
- Stage by explicit path (never `git add -A` or `git add .`)
- Commit with a descriptive message
- Push only when explicitly asked
