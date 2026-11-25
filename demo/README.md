# fas-js Demo

A static site published from `demo/` to GitHub Pages: <https://jml6m.github.io/fas-js/>.

## Pages

| Path | Page |
|------|------|
| [`/`](./index.html) | The simulator: prebuilt DFA and NFA examples, an optional custom machine as JSON, a full run or a step-through with the graph. |

The simulator runs the browser bundle that is published to npm (`lib/bundle.js`, global `fasJs`), so it can only use the public API. The page shows the library version it was built from.

Regular-language operations (∪, concat, star, NFA→DFA) are tested in Node (`test/languages.spec.js`), not in the browser demo.

## Vendor files

Nothing under a `vendor/` folder is tracked. [`scripts/build-demo.mjs`](../scripts/build-demo.mjs) writes those files at the end of `npm run build`:

| File | Source |
|------|--------|
| `vendor/fas-js.bundle.js` | `lib/bundle.js`, the published bundle |
| `vendor/build-info.js` | the `version` in `package.json` |

## Local development

```bash
npm ci
npm run build
npm run serve:demo
```

Open <http://127.0.0.1:3200/> (override the port with `DEMO_PORT=8080`).

Use `npm run serve:demo` — not `npx serve`.

## Automated demo tests

`npm test` includes the demo specs on every branch:

| File | What it checks |
|------|----------------|
| `test/demo.spec.js` | Vendor files, HTTP smoke, jsdom UI workflows |
| `test/demo-layout.spec.js` | HTML/CSS layout contracts (no browser) |
| `test/demo-highlight.spec.js` | DOT highlight targets nodes only |
| `test/demo-presets-golden.spec.js` | Golden accept/reject table for the prebuilt examples |
| `test/build-demo.spec.js` | What the demo build script writes |

Run the main demo spec only:

```bash
npm run test:demo
```

## Deployment

[`.github/workflows/pages.yml`](../.github/workflows/pages.yml) builds the library and publishes this folder on pushes to `master` when `demo/**`, `src/**`, or `package.json` change.
