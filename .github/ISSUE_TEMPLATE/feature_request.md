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

> New public API features are typically scheduled for **v2**. If this is release-line work (tooling, tests, docs, demo UX), say so in the summary.

## Acceptance criteria

- [ ]

## Testing checklist

- [ ] Unit tests added or updated
- [ ] Coverage maintained (90% floor on lines, statements, functions, branches)
- [ ] `npm test` passes locally
- [ ] README updated if user-facing