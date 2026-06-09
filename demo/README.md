# fas-js Demo

This folder contains two versions of the finite state automaton simulator UI.

## Versions

| Path | Description | URL |
|------|-------------|-----|
| `v1/` | Legacy redirect page pointing to the original [ObservableHQ notebook](https://observablehq.com/@jml6m/state-machine-simulator) | Local file only |
| `v1.1/` | Self-hosted, vanilla JS demo using the `fas-js` browser bundle | https://jml6m.github.io/fas-js/v1.1/ |

### v1 — Observable (legacy)

The first public demo was published as an Observable notebook. The `v1/index.html` page explains that history and redirects visitors to the notebook.

### v1.1 — Self-hosted (current)

The v1.1 demo is a static site with no npm build step of its own. It loads:

- `fasJs` from `./vendor/fas-js.bundle.js` (copied from `lib/bundle.js` during CI deploy)
- [D3](https://d3js.org/), [@hpcc-js/wasm](https://github.com/hpcc-systems/hpcc-js-wasm), and [d3-graphviz](https://github.com/magjac/d3-graphviz) from CDN for graph rendering

Features:

- Pre-loaded binary DFA from the README example (accepts strings ending in `1`)
- Full simulation via `simulateFSA()`
- Step-through mode via `stepOnceFSA()`
- Graph visualization via `fsa.generateDigraph()`

## Local development

The demo does not commit `vendor/fas-js.bundle.js`. Build the library and copy the bundle before opening the page locally:

```bash
npm ci
npm run build
mkdir -p demo/v1.1/vendor
cp lib/bundle.js demo/v1.1/vendor/fas-js.bundle.js
```

Then serve `demo/v1.1/` with any static file server, for example:

```bash
npx --yes serve demo/v1.1
```

## Deployment

GitHub Pages deployment is handled by [`.github/workflows/pages.yml`](../.github/workflows/pages.yml) on pushes to `main-v1-1-prep` when `demo/**`, `src/**`, or `package.json` change.

The workflow:

1. Runs `npm ci && npm run build`
2. Copies `lib/bundle.js` to `demo/v1.1/vendor/fas-js.bundle.js`
3. Publishes the `demo/` directory to GitHub Pages

Public URLs:

- v1.1 demo: **https://jml6m.github.io/fas-js/v1.1/**
- v1 legacy redirect: **https://jml6m.github.io/fas-js/v1/**