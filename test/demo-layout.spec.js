/**
 * Demo layout contracts — structure and CSS geometry rules (no browser).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assert } from "chai";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEMO = join(__dirname, "..", "demo", "v1.5");
const html = readFileSync(join(DEMO, "index.html"), "utf8");
const css = readFileSync(join(DEMO, "styles.css"), "utf8");
const appJs = readFileSync(join(DEMO, "app.js"), "utf8");

describe("demo layout contracts", function () {
  it("uses example-first flow with collapsible advanced JSON", function () {
    assert.include(html, 'id="example-select"');
    assert.include(html, 'id="advanced-panel"');
    assert.include(html, "<details");
    assert.include(html, 'id="fsa-definition"');
    assert.notInclude(html, "language-tab");
    assert.notInclude(html, "Regular Language");
    assert.notInclude(html, "tab-union");
  });

  it("places simulation and graph in a dedicated workspace", function () {
    assert.include(html, "workspace");
    assert.include(html, "graph-panel");
    assert.include(html, "sim-panel");
    assert.include(html, 'id="simulate-btn"');
    assert.include(html, 'id="step-btn"');
    assert.include(html, 'id="graph-viewport"');
  });

  it("bans horizontal overflow in CSS", function () {
    assert.match(css, /overflow-x:\s*clip/);
    assert.match(css, /\.graph-viewport[\s\S]*overflow:\s*hidden/);
    assert.match(css, /\.graph[\s\S]*overflow:\s*hidden/);
  });

  it("uses stable sizing without button press transforms", function () {
    assert.notMatch(css, /\.btn:active\s*\{[^}]*transform/);
    assert.match(css, /minmax\(0,\s*1fr\)/);
    assert.match(css, /--graph-height:\s*clamp\(/);
  });

  it("scopes JSON editor scroll to the advanced panel shell", function () {
    assert.include(html, "definition-shell");
    assert.match(css, /\.definition-shell[\s\S]*overflow:\s*auto/);
  });

  it("configures graphviz for fit without manual viewBox jumping", function () {
    assert.include(appJs, "growEnteringEdges: false");
    assert.include(appJs, ".fit(true)");
    assert.notInclude(appJs, "fitGraphToViewport");
    assert.notInclude(appJs, "scheduleGraphFit");
  });

  it("highlights only node declaration lines in DOT", function () {
    assert.include(appJs, 'line.indexOf("->") !== -1');
  });
});