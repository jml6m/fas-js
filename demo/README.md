# fas-js Demo

A static site published from `demo/` to GitHub Pages: <https://jml6m.github.io/fas-js/>.

## Pages

| Path | Page |
|------|------|
| [`/`](./index.html) | The simulator: prebuilt DFA and NFA examples, an optional custom machine as JSON, a full run or a step-through with the graph. |
| [`/v1/`](./v1/index.html) | The original simulator from 2019, ported from its notebook into a plain page. You type the states, the alphabet and the transitions, then run or step through an input. |

The simulator runs the browser bundle that is published to npm (`lib/bundle.js`, global `fasJs`), so it can only use the public API. The page shows the library version it was built from.

The original simulator runs fas-js 1.3.1, the release it was written for, and says so on the page. It asks no other site for anything. That release's browser bundle is tracked beside the page as [`v1/fas-js-1.3.1.bundle.js`](./v1/fas-js-1.3.1.bundle.js), byte for byte as published to npm, and a test checks its hash. The Graphviz build that draws the graph is a development dependency, copied in when the site is built. Its rules live in [`v1/logic.js`](./v1/logic.js), apart from the page code in [`v1/app.js`](./v1/app.js), so they can be tested on their own.

Regular-language operations (∪, concat, star, NFA→DFA) are tested in Node (`test/languages.spec.js`), not in the browser demo.

## Vendor files

Nothing under a `vendor/` folder is tracked. [`scripts/build-demo.mjs`](../scripts/build-demo.mjs) writes those files at the end of `npm run build`:

| File | Source |
|------|--------|
| `vendor/fas-js.bundle.js` | `lib/bundle.js`, the published bundle |
| `vendor/build-info.js` | the `version` in `package.json` |
| `v1/vendor/build-info.js` | the version the original simulator runs, 1.3.1 |
| `v1/vendor/graphviz.js` | `@hpcc-js/wasm-graphviz`, pinned to one exact version |
| `v1/vendor/graphviz.LICENSE.txt`, `v1/vendor/NOTICE.txt` | the licence of that build, and a note of what the folder holds |

## Local development

```bash
npm ci
npm run build
npm run serve:demo
```

Open <http://127.0.0.1:3200/> (override the port with `DEMO_PORT=8080`). The original simulator is at <http://127.0.0.1:3200/v1/>.

Use `npm run serve:demo` — not `npx serve`.

## Automated demo tests

`npm test` includes the demo specs on every branch:

| File | What it checks |
|------|----------------|
| `test/demo.spec.js` | Vendor files, HTTP smoke, jsdom UI workflows |
| `test/demo-layout.spec.js` | HTML/CSS layout contracts (no browser) |
| `test/demo-highlight.spec.js` | DOT highlight targets nodes only |
| `test/demo-presets-golden.spec.js` | Golden accept/reject table for the prebuilt examples |
| `test/demo-v1.spec.js` | The original simulator: vendor files, no outside requests, and the same verdicts as fas-js 1.3.1 called directly |
| `test/build-demo.spec.js` | What the demo build script writes |

Run the main demo spec only:

```bash
npm run test:demo
```

## Deployment

[`.github/workflows/pages.yml`](../.github/workflows/pages.yml) builds the library and publishes this folder on pushes to the default branch when `demo/**`, `src/**`, or `package.json` change.
