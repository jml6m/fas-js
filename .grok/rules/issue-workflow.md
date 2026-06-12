# Issue Workflow

Work in this repo is tracked on GitHub. Use open issues as the planning source of truth.

## Before non-trivial work

- Scan open issues for related or duplicate effort.
- If your work addresses an issue, reference it in the PR or summary (e.g. `fixes #17`).
- If deferring follow-up work, link an existing issue instead of leaving an untracked TODO.

## While working

- Keep changes scoped to the requested task. Avoid drive-by refactors of unrelated modules.
- Do not change the public API surface (`simulateFSA`, `stepOnceFSA`, `createFSA`) on `master` without a major version decision. On `main-v2-workspace`, API changes are expected for v2.
- Do not invent version bumps or publish steps unless explicitly asked; releases go through `release:*` + the publish workflow.

## When blocked

- After three failed attempts at the same error, stop retrying the same approach.
- Revert to the last known good state, document what was tried, and use `FIXME:` only when a temporary marker is truly needed.
- Prefer reporting the blocker with environment facts over guessing.
