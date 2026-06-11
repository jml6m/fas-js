---
name: Feature Request
about: Propose new public API capabilities or library behavior
title: "[FEATURE] <short description>"
labels: enhancement
assignees: ''
---

## Summary

What capability should the library gain?

## Motivation

Who needs this and why? Link to use cases, papers, or demos if relevant.

## Proposed API

Describe new functions, parameters, or return types. If extending existing API:

- `createFSA`
- `simulateFSA`
- `stepOnceFSA`

## Breaking change?

- [ ] No — backward compatible addition
- [ ] Yes — requires a major version bump (v2+)

> New public API features are typically scheduled for **v2**, not the v1.1 prep modernization phase. If this is prep-phase work (tooling, types, docs), say so in the summary.

## Acceptance criteria

- [ ]

## Testing checklist

- [ ] Unit tests added or updated
- [ ] Coverage maintained (100% on `main-v1-1-prep`, 90% on `master`)
- [ ] `npm test` passes locally
- [ ] README updated if user-facing