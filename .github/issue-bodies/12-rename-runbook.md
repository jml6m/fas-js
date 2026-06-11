Document the steps for v1.1 release:

1. Final PR `main-v1-1-prep` → `master`
2. Rename default branch `master` → `main` on GitHub
3. Update CI badge URLs, Codecov default branch, README links
4. Human version bump + `v*.*.*` tag
5. `publish.yml` OIDC publish (upgrade workflow if needed)

**Deliverables:**
- Checklist with owner (human vs agent) per step
- List of all URLs/refs that mention `master`