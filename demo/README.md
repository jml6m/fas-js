# fas-js Demo

Static demos published under `demo/` on GitHub Pages.

## Versions

| Path | Description | URL |
|------|-------------|-----|
| `v1/` | Legacy redirect to the [ObservableHQ notebook](https://observablehq.com/@jml6m/state-machine-simulator) | https://jml6m.github.io/fas-js/v1/ |
| `v1.1/` | Redirect to v1.5 (preserves old links) | https://jml6m.github.io/fas-js/v1.1/ |
| `v1.5/` | **Current** — FSA simulator + regular language lab (∪, concat, star, NFA→DFA) | https://jml6m.github.io/fas-js/v1.5/ |

### v1.5 — Self-hosted (current)

Loads `fasJs` from `./vendor/fas-js.bundle.js` (demo bundle built from `src/demo-bundle.ts`, includes `RegularLanguage` for the lab UI only). Graph rendering uses D3 + Graphviz WASM from CDN.

Tabs:

- **FSA** — JSON editor, simulate, step-through, graph
- **∪ / ∘ / \*** — compose languages from presets, render resulting automaton
- **NFA→DFA** — subset construction on NFA presets

## Local development

```bash
npm ci
npm run build   # postbuild → demo/v1.5/vendor/fas-js.bundle.js
npx --yes serve demo/v1.5
```

Open http://localhost:3000 (or the port `serve` prints).

## Deployment

[`.github/workflows/pages.yml`](../.github/workflows/pages.yml) runs on pushes to `master` / `main-v1-1-prep` when `demo/**`, `src/**`, or `package.json` change.

1. `npm ci && npm run build` (demo vendor copy is in `postbuild.mjs`)
2. Publishes the full `demo/` tree to GitHub Pages

Public URL: **https://jml6m.github.io/fas-js/v1.5/**