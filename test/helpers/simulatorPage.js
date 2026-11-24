/**
 * Opens the simulator page (demo/index.html) in jsdom the way the browser starts it: with the
 * library bundle that is published to npm and a Graphviz to draw with.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

import { JSDOM } from "jsdom";

import { start } from "../../demo/app.js";

const here = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
export const root = resolve(here, "..", "..");
export const demoRoot = resolve(root, "demo");

export const readDemo = (relative) => readFileSync(resolve(demoRoot, relative), "utf8");

/** The library as the page gets it: demo/vendor/fas-js.bundle.js evaluated into a global of its own. */
export function publishedLibrary() {
  const sandbox = {};
  runInNewContext(readDemo("vendor/fas-js.bundle.js"), sandbox, { filename: "demo/vendor/fas-js.bundle.js" });
  return sandbox.fasJs;
}

/** The version the build wrote beside the bundle. */
export function buildInfo() {
  const sandbox = {};
  runInNewContext(readDemo("vendor/build-info.js"), sandbox, { filename: "demo/vendor/build-info.js" });
  return sandbox.fasJsDemoBuild;
}

/**
 * @param {{ loadGraphviz: () => Promise<object>, fas?: object }} options
 *   `loadGraphviz` is what the page would import from its vendor folder.
 * @returns the jsdom window, the started page, and a few ways to act on it as a reader would
 */
export async function openSimulator({ loadGraphviz, fas = publishedLibrary() }) {
  const { window } = new JSDOM(readDemo("index.html"), { url: "http://127.0.0.1/" });
  const { document } = window;
  const app = start({ window, fas, build: buildInfo(), loadGraphviz });
  await app.settled();

  const byId = (id) => {
    const element = document.getElementById(id);
    if (!element) throw new Error(`the page has no #${id}`);
    return element;
  };

  return {
    window,
    document,
    byId,
    text: (id) => byId(id).textContent.trim(),
    settled: () => app.settled(),
    click: (id) => byId(id).click(),
    type(id, value) {
      byId(id).value = value;
      byId(id).dispatchEvent(new window.Event("input", { bubbles: true }));
    },
    async choose(presetId) {
      byId("preset").value = presetId;
      byId("preset").dispatchEvent(new window.Event("change", { bubbles: true }));
      await app.settled();
    },
    async load(definitionText) {
      byId("definition").value = definitionText;
      byId("load").click();
      await app.settled();
    },
    press(id, key) {
      byId(id).dispatchEvent(new window.KeyboardEvent("keydown", { key, bubbles: true }));
    },
    marked: () => ({
      states: [...document.querySelectorAll("#graph .node.is-current title")].map((title) => title.textContent),
      edges: [...document.querySelectorAll("#graph .edge.is-taken title")].map((title) => title.textContent),
    }),
  };
}
