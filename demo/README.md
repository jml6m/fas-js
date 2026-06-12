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
npm run serve:demo
```

Open http://localhost:3000/v1.5/ (override port with `DEMO_PORT=8080`).

## Automated demo tests

`npm test` includes `test/demo.spec.js`, which runs on every branch in CI:

1. **Artifacts** — vendor bundle exists and exposes `fasJs` + `RegularLanguage`
2. **HTTP smoke** — serves the full `demo/` tree locally and checks 200 responses
3. **UI workflows** — jsdom loads `app.js`, stubs D3/Graphviz, and exercises FSA build, simulate, ∪/∘/\*, NFA→DFA

Run demo tests only:

```bash
npm run test:demo
```

## Deployment

[`.github/workflows/pages.yml`](../.github/workflows/pages.yml) runs on pushes to `master` / `main-v2-workspace` when `demo/**`, `src/**`, or `package.json` change.

1. `npm ci && npm run build` (demo vendor copy is in `postbuild.mjs`)
2. Publishes the full `demo/` tree to GitHub Pages

Public URL: **https://jml6m.github.io/fas-js/v1.5/**