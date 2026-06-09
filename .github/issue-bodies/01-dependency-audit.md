Audit every entry in `package.json` and classify as production runtime, build-only, or test-only.

**Deliverables:**
- Table of current deps with version, purpose, and keep/remove/replace recommendation
- Decision on whether `chalk`, `core-js`, `@babel/runtime`, `regenerator-runtime` belong in the published bundle
- List of deps safe to remove after TypeScript + modern bundler migration

**Acceptance criteria:**
- [ ] Written audit attached to this issue or linked doc
- [ ] No code changes required in this issue

Relates to v1.1 prep on branch `main-v1-1-prep`.