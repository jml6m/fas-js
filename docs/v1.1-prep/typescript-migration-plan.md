# TypeScript Migration Plan

Closes [#217](https://github.com/jml6m/fas-js/issues/217).

## Target

- `strict: true` in `tsconfig.json`
- Flow annotations removed from all `src/` files
- Published `.d.ts` for public API

## File migration order

| Order | File(s) | Notes |
|-------|---------|-------|
| 1 | `src/globals/errors.js`, `globals.js` | No Flow complexity |
| 2 | `src/components/*.js` | Core types |
| 3 | `src/interfaces/FSA.js` | Interface → `export interface FSA` |
| 4 | `src/automata/*.js` | DFA/NFA classes |
| 5 | `src/utils/*.js` | Includes `createFSA` |
| 6 | `src/engine/Simulators.js` | Public API |
| 7 | `src/modules.js` | Re-export entry |

## Public API types (target)

```typescript
export function createFSA(
  states: string[],
  alphabet: string | string[],
  transitions: TransitionInput[],
  start: string,
  accepts: string[]
): FSA;

export function simulateFSA(
  w: string | string[],
  fsa: FSA,
  logging?: boolean,
  returnEndState?: boolean
): boolean | string | string[];

export function stepOnceFSA(
  w: string,
  qin: string | string[],
  fsa: FSA,
  logging?: boolean
): string | string[];
```

## Interim strategy

No half-Flow/half-TS period. Single PR (or stacked PRs) converts all `src/` at once; tests stay in JS with `@ts-check` optional until test migration.

## Test impact

- `@babel/register` replaced by `tsx` or compiled test run
- Contract tests in `test/api-contract.spec.js` are the merge gate
