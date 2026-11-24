/* global fasJs, fasJsDemoBuild */

/*
 * Starts the simulator with what the page loaded: the library bundle that is published to npm
 * (the global fasJs), the version it was built from, and the Graphviz build in the vendor folder.
 */
import { start } from "./app.js";

start({
  window,
  fas: typeof fasJs === "undefined" ? null : fasJs,
  build: typeof fasJsDemoBuild === "undefined" ? null : fasJsDemoBuild,
  loadGraphviz: () => import("./vendor/graphviz.js").then((module) => module.Graphviz.load()),
});
