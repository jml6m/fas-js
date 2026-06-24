# fas-js Demo

Static demos published under `demo/` on GitHub Pages.

## Versions

| Path | Description | URL |
|------|-------------|-----|
| [`v1/`](./v1/) | Legacy redirect to the [ObservableHQ notebook](https://observablehq.com/@jml6m/state-machine-simulator) | <https://jml6m.github.io/fas-js/v1/> |
| [`v1.1/`](./v1.1/) | Redirect to v1.5 (preserves old links) | <https://jml6m.github.io/fas-js/v1.1/> |
| [`v1.5/`](./v1.5/) | **Current** — DFA/NFA simulator with prebuilt examples + optional custom JSON | <https://jml6m.github.io/fas-js/v1.5/> |

### v1.5+ — Self-hosted (current)

Loads `fasJs` from `./vendor/fas-js.bundle.js` (public FSA API only). Graph rendering uses D3 + Graphviz WASM from CDN.

- **Prebuilt examples** — four DFA/NFA machines; auto-build on select
- **Simulation** — full run or step-through with graph highlight
- **Custom machine** — select from the dropdown to edit JSON in the same panel as the graph

Regular-language operations (∪, concat, star, NFA→DFA) are tested in Node (`test/languages.spec.js`), not in the browser demo.

## Local development

```bash
npm ci
npm run build   # postbuild → demo/v1.5/vendor/fas-js.bundle.js
npm run serve:demo
```

Open <http://127.0.0.1:3200/v1.5/> (override port with `DEMO_PORT=8080`).

Use `npm run serve:demo` — not `npx serve`.

## Automated demo tests

`npm test` includes demo specs on every branch:

| File | What it checks |
|------|----------------|
| `test/demo.spec.js` | Vendor bundle, HTTP smoke, jsdom UI workflows |
| `test/demo-layout.spec.js` | HTML/CSS layout contracts (no browser) |
| `test/demo-highlight.spec.js` | DOT highlight targets nodes only |
| `test/demo-presets-golden.spec.js` | Golden accept/reject table for all four UI presets |

Run demo tests only:

```bash
npm run test:demo
```

## Deployment

[`.github/workflows/pages.yml`](../.github/workflows/pages.yml) runs on pushes to `master` when `demo/**`, `src/**`, or `package.json` change.

Public URL: **<https://jml6m.github.io/fas-js/v1.5/>**
