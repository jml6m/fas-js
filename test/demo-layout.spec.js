/**
 * The simulator page's layout rules, read from its markup and style sheet (no browser): one
 * screen without scrollbars, both themes, less motion on request, and what assistive technology
 * needs.
 */
import { assert } from "chai";
import { JSDOM } from "jsdom";

import { readDemo } from "./helpers/simulatorPage.js";

const html = readDemo("index.html");
const css = readDemo("styles.css");
const { document } = new JSDOM(html).window;

// Every rule of the style sheet, media queries opened up: its selectors and its declarations
const RULES = [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selectors, declarations]) => ({
  selectors: selectors.split(",").map((selector) => selector.trim()),
  declarations,
}));

// All declarations the style sheet gives this exact selector, wherever they are
function rule(selector) {
  const found = RULES.filter((candidate) => candidate.selectors.includes(selector));
  assert.isNotEmpty(found, `no rule for ${selector}`);
  return found.map((candidate) => candidate.declarations).join("\n");
}

describe("simulator page layout", function () {
  it("has the two panels, the controls and the places messages go", function () {
    for (const id of [
      "app",
      "lib-version",
      "view-machine",
      "view-run",
      "preset",
      "about",
      "definition",
      "load",
      "copy-dot",
      "load-status",
      "load-error",
      "graph",
      "summary",
      "status",
      "step-message",
      "result",
      "result-words",
      "input",
      "input-rule",
      "input-hint",
      "input-error",
      "tape",
      "simulate",
      "step",
      "reset",
      "show-steps",
      "steps",
    ]) {
      assert.isNotNull(document.getElementById(id), `#${id}`);
    }
    assert.lengthOf(document.querySelectorAll("main .panel"), 2);
  });

  it("offers no timed auto-play and no form-based machine builder", function () {
    const buttons = [...document.querySelectorAll("button")].map((button) => button.textContent.trim());
    assert.sameMembers(buttons, ["Machine", "Run", "Load", "Copy as DOT", "Simulate", "Step", "Reset"]);
    for (const script of ["app.js", "main.js", "drawing.js"]) {
      assert.notMatch(readDemo(script), /setInterval|setTimeout/, script);
    }
    assert.lengthOf(document.querySelectorAll("input[type='radio'], form"), 0);
  });

  it("never scrolls the page: it is one screen tall and hides what overflows", function () {
    assert.match(rule("html"), /overflow:\s*hidden/);
    assert.match(rule("html"), /height:\s*100%/);
    assert.match(rule(".app"), /height:\s*100dvh/);
    assert.match(rule(".app"), /overflow:\s*hidden/);
    assert.match(rule(".app"), /grid-template-rows:\s*auto minmax\(0, 1fr\) auto/);
    assert.match(rule(".panel"), /overflow:\s*hidden/);
    assert.match(rule(".graph"), /overflow:\s*hidden/);
    assert.notMatch(css, /overflow(?:-[xy])?:\s*scroll/);
  });

  it("lets a growing list scroll inside itself, with no scrollbar showing", function () {
    for (const selector of [".machine", "textarea", ".tape", ".steps"]) {
      const declarations = rule(selector);
      assert.match(declarations, /overflow(?:-[xy])?:\s*auto/, selector);
      assert.match(declarations, /scrollbar-width:\s*none/, selector);
    }
    const hidden = css.match(/([^{}]*)\{\s*display:\s*none;\s*\}/g).find((block) => block.includes("::-webkit-scrollbar"));
    for (const selector of ["textarea", ".machine", ".run", ".tape", ".steps"]) {
      assert.include(hidden, `${selector}::-webkit-scrollbar`, selector);
    }
    // every element that may scroll hides its scrollbar
    for (const block of css.match(/[^{}]+\{[^{}]*overflow(?:-[xy])?:\s*auto[^{}]*\}/g)) {
      assert.match(block, /scrollbar-width:\s*none/, block.trim().split("{")[0]);
    }
  });

  it("follows the system's light or dark theme, for the graph as well", function () {
    assert.equal(document.querySelector('meta[name="color-scheme"]').getAttribute("content"), "light dark");
    assert.match(css, /@media \(prefers-color-scheme: dark\)\s*\{\s*:root\s*\{[^}]*--bg:/);
    assert.match(rule(".graph svg text"), /fill:\s*var\(--ink\)/);
    assert.match(rule(".graph svg text"), /font-family:\s*var\(--font\)/);
    assert.match(rule(".graph svg > g > polygon:first-of-type"), /fill:\s*none/);
    assert.notMatch(css.replace(/:root\s*\{[^}]*\}/g, ""), /#[0-9a-f]{3,8}\b/i, "a colour outside the two theme blocks");
  });

  it("moves less when the system asks for it", function () {
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\{[^}]*transition:\s*none !important/);
  });

  it("shows where the keyboard focus is", function () {
    assert.match(rule(":focus-visible"), /outline:\s*2px solid var\(--accent\)/);
    assert.notMatch(css, /outline:\s*(?:none|0)\b/);
  });

  it("tells assistive technology about results and problems", function () {
    assert.equal(document.getElementById("status").getAttribute("role"), "status");
    assert.equal(document.getElementById("load-status").getAttribute("role"), "status");
    assert.equal(document.getElementById("load-error").getAttribute("role"), "alert");
    assert.equal(document.getElementById("input-error").getAttribute("role"), "alert");
    assert.isTrue(document.getElementById("status").contains(document.getElementById("result-words")));
    assert.equal(document.documentElement.getAttribute("lang"), "en");
  });

  it("labels every field and names every group", function () {
    for (const field of document.querySelectorAll("input, select, textarea")) {
      const labelled = field.id && document.querySelector(`label[for="${field.id}"]`);
      assert.isTrue(Boolean(labelled) || field.closest("label") !== null, `#${field.id} has no label`);
    }
    for (const id of ["tape", "steps", "graph"]) {
      assert.isString(document.getElementById(id).getAttribute("aria-label"), `#${id}`);
    }
    for (const section of document.querySelectorAll("section")) {
      assert.isNotNull(document.getElementById(section.getAttribute("aria-labelledby")));
    }
    assert.equal(document.getElementById("steps").getAttribute("tabindex"), "0", "a list that scrolls can be reached by keyboard");
  });

  it("shows one panel at a time on a narrow or short screen, with a switch", function () {
    assert.match(css, /@media \(max-width: 760px\), \(max-height: 520px\)\s*\{[\s\S]*?\.views\s*\{\s*display:\s*flex/);
    assert.match(css, /\.app\[data-view="machine"\] \.panel--run,\s*\.app\[data-view="run"\] \.panel--machine\s*\{\s*display:\s*none/);
    assert.equal(document.getElementById("view-run").getAttribute("aria-pressed"), "true");
    assert.equal(document.getElementById("app").dataset.view, "run");
  });
});
