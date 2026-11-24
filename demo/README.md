# fas-js Demo

A static site published from `demo/` to GitHub Pages: <https://jml6m.github.io/fas-js/>.

## Pages

| Path | Page |
|------|------|
| [`/`](./index.html) | The simulator: ready-made DFAs and NFAs, or your own machine, with a full run or a step-through and the graph. |
| [`/v1/`](./v1/index.html) | The original simulator from 2019, ported from its notebook into a plain page. You type the states, the alphabet and the transitions, then run or step through an input. |

Neither page asks any other site for anything.

## The simulator

It runs the browser bundle that is published to npm (`lib/bundle.js`, global `fasJs`), so it can only use the public API: `createFSA`, `simulateFSA`, `stepOnceFSA`, and `getType()` and `generateDigraph()` on the machine. The page shows the library version it was built from.

- **The library is the judge.** Every verdict on screen comes from `simulateFSA` and every set of states from `stepOnceFSA`. The page never works one out itself.
- **Machines** come from the ready-made list or from text you paste: a JSON definition in the shape `createFSA` takes, or the DOT text `generateDigraph()` returns. Pasted DOT is always drawn. It is also run when the machine can be rebuilt from the drawing; otherwise a sentence says why not.
- **Input** is read the way the library reads it: one symbol per character, or symbols separated by spaces when any symbol of the alphabet is longer than one character.
- **Stepping** starts from the start state (for an NFA, from every state it reaches without reading anything) and marks the states the machine is in and the edges it has just taken. "Show all steps" lists the whole run.
- **Messages** are plain sentences. No error code is shown.

| File | What it holds |
|------|---------------|
| [`sim/machine.js`](./sim/machine.js) | Reading a definition, building it with the library, and a sentence for each way that can fail |
| [`sim/run.js`](./sim/run.js) | Reading typed input and tracing a run step by step |
| [`sim/dot.js`](./sim/dot.js) | Rebuilding a machine from the DOT text `generateDigraph()` returns |
| [`drawing.js`](./drawing.js) | Putting Graphviz's drawing on the page and marking states and edges in it |
| [`presets.js`](./presets.js) | The ready-made machines |
| [`app.js`](./app.js), [`main.js`](./main.js) | The page: its controls wired to the files above |

The files under `sim/` use no browser features, so they are tested directly in Node.

## The original simulator

It runs fas-js 1.3.1, the release it was written for, and says so on the page. That release's browser bundle is tracked beside the page as [`v1/fas-js-1.3.1.bundle.js`](./v1/fas-js-1.3.1.bundle.js), byte for byte as published to npm, and a test checks its hash. Its rules live in [`v1/logic.js`](./v1/logic.js), apart from the page code in [`v1/app.js`](./v1/app.js), so they can be tested on their own.

Regular-language operations (∪, concat, star, NFA→DFA) are tested in Node (`test/languages.spec.js`), not in the browser demo.

## Vendor files

Nothing under a `vendor/` folder is tracked. [`scripts/build-demo.mjs`](../scripts/build-demo.mjs) writes those files at the end of `npm run build`:

| File | Source |
|------|--------|
| `vendor/fas-js.bundle.js` | `lib/bundle.js`, the published bundle |
| `vendor/build-info.js` | the `version` in `package.json` |
| `v1/vendor/build-info.js` | the version the original simulator runs, 1.3.1 |
| `vendor/graphviz.js`, `v1/vendor/graphviz.js` | `@hpcc-js/wasm-graphviz`, a development dependency pinned to one exact version; it draws the graph on both pages |
| `vendor/graphviz.LICENSE.txt`, `vendor/NOTICE.txt` and the same two under `v1/vendor/` | the licence of that build, and a note of what the folder holds |

## Local development

```bash
npm ci
npm run build
npm run serve:demo
```

Open <http://127.0.0.1:3200/> (override the port with `DEMO_PORT=8080`). The original simulator is at <http://127.0.0.1:3200/v1/>.

Use `npm run serve:demo` — not `npx serve`. The pages load their scripts as modules, so they have to be served: opening `index.html` as a file does not work.

## Automated demo tests

`npm test` includes the demo specs on every branch:

| File | What it checks |
|------|----------------|
| `test/demo.spec.js` | The simulator page: vendor files, no outside requests, HTTP smoke, and the page in jsdom compared with the library |
| `test/demo-sim.spec.js` | The simulator's rules: definitions, input, runs against `simulateFSA` on generated machines, and DOT text read back |
| `test/demo-presets-golden.spec.js` | What each ready-made machine accepts, and that stepping agrees with `simulateFSA` on every short input |
| `test/demo-highlight.spec.js` | The drawing: states and edges found by name and marked while stepping |
| `test/demo-layout.spec.js` | Layout rules read from the markup and the style sheet: one screen, no scrollbars, both themes |
| `test/demo-v1.spec.js` | The original simulator: vendor files, no outside requests, and the same verdicts as fas-js 1.3.1 called directly |
| `test/build-demo.spec.js` | What the demo build script writes |

Run the main demo spec only:

```bash
npm run test:demo
```

## Deployment

[`.github/workflows/pages.yml`](../.github/workflows/pages.yml) builds the library and publishes this folder on pushes to the default branch when `demo/**`, `src/**`, or `package.json` change.
