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

## Checking the demo

The demo has no automated test suite. Check it by hand in a browser when it changes and before a release:

- Both pages load from `npm run serve:demo` with no failed request and no request to another site.
- Every ready-made machine runs and steps, and accepts and rejects what its description says.
- A broken definition shows a message instead of a result.
- The page fits one screen without scrollbars, in the light and the dark theme.
- The original simulator at `/v1/` runs its examples.

[`test/build-demo.spec.js`](../test/build-demo.spec.js) still tests the build script that fills the `vendor/` folders, because it runs in every `npm run build`.

## Deployment

[`.github/workflows/pages.yml`](../.github/workflows/pages.yml) builds the library and publishes this folder on pushes to the default branch when `demo/**`, `src/**`, or `package.json` change.
