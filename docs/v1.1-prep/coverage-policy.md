# Coverage Policy — 100% with Documented Exceptions

Closes [#219](https://github.com/jml6m/fas-js/issues/219).

## Targets

| Branch | Line coverage gate |
|--------|-------------------|
| `master` | 90% (current nyc config) |
| `main-v1-1-prep` | **100%** after Phase 3 test-stack PR |

## Current inventory (pre-Phase 3, nyc 17)

| Metric | Coverage |
|--------|----------|
| Lines | 99.69% (330/331) |
| Statements | 99.74% (397/398) |
| Branches | 98.38% (243/247) |
| Functions | 100% (60/60) |

**Gap:** 1 uncovered line + 4 uncovered branches in `src/`. Identify and cover during Phase 3, or document exception.

## Exception process

1. Must be a genuinely complex edge case (e.g. unreachable defensive branch).
2. Inline comment: `// coverage:ignore-next-line — reason, see #NNN`
3. Linked GitHub issue explaining why 100% is impractical.
4. Reviewer approval required.

## Phase 3 config change

```json
"c8": {
  "check-coverage": true,
  "lines": 100,
  "include": ["src/**/*.ts"]
}
```