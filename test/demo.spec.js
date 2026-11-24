/**
 * Demo fidelity — build artifacts, static HTTP smoke, and browser UI workflows.
 * Runs on every branch via npm test (the build fills the demo's vendor folder first).
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

import { JSDOM } from "jsdom";
import { assert } from "chai";

import { startDemoStaticServer } from "../scripts/demo-static-server.mjs";
import { assertPublicApiSurface } from "./helpers/publicApiContract.js";

const __dir = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");
const demoRoot = resolve(root, "demo");
const vendorBundle = resolve(demoRoot, "vendor/fas-js.bundle.js");
const buildInfo = resolve(demoRoot, "vendor/build-info.js");
const packageVersion = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).version;

const REQUIRED_ASSETS = [
  "index.html",
  "app.js",
  "styles.css",
  "vendor/fas-js.bundle.js",
  "vendor/build-info.js",
];

const REQUIRED_DOM_IDS = [
  "example-select",
  "fsa-definition",
  "build-btn",
  "copy-btn",
  "simulate-btn",
  "step-btn",
  "build-status",
  "result",
  "custom-panel",
  "machine-panel",
  "graph-viewport",
  "lib-version",
];

function loadDemoBundleApi() {
  const code = readFileSync(vendorBundle, "utf8");
  const sandbox = { fasJs: undefined, console };
  runInNewContext(code, sandbox, { filename: "demo/vendor/fas-js.bundle.js" });
  assert.isObject(sandbox.fasJs);
  return sandbox.fasJs;
}

function exerciseDemoBundle(api) {
  assertPublicApiSurface(api, "demo vendor fasJs");

  const fsa = api.createFSA(
    ["q1", "q2"],
    "01",
    [
      { from: "q1", to: "q2", input: "1" },
      { from: "q2", to: "q2", input: "1" },
      { from: "q2", to: "q1", input: "0" },
      { from: "q1", to: "q1", input: "0" },
    ],
    "q1",
    ["q2"]
  );

  assert.equal(fsa.getType(), "DFA");
  assert.isTrue(api.simulateFSA("101", fsa));
}

function createGraphvizStub() {
  const chain = {
    zoom() {
      return chain;
    },
    grow() {
      return chain;
    },
    width() {
      return chain;
    },
    height() {
      return chain;
    },
    fit() {
      return chain;
    },
    async renderDot() {
      return chain;
    },
  };

  return {
    select() {
      return {
        graphviz() {
          return chain;
        },
      };
    },
  };
}

function installBrowserStubs(window) {
  window.d3 = createGraphvizStub();
  window["@hpcc-js/wasm"] = {
    Graphviz: {
      load: async () => {},
    },
  };
  window.requestAnimationFrame = callback => {
    callback();
    return 0;
  };
  window.cancelAnimationFrame = () => {};
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    disconnect() {}
  };
  window.navigator.clipboard = {
    writeText: async () => {},
  };
}

function loadDemoAppDom() {
  const html = readFileSync(resolve(demoRoot, "index.html"), "utf8");
  const dom = new JSDOM(html, {
    url: "http://127.0.0.1/",
    runScripts: "outside-only",
  });
  const { window } = dom;

  runInNewContext(readFileSync(vendorBundle, "utf8"), window, { filename: "fas-js.bundle.js" });
  runInNewContext(readFileSync(buildInfo, "utf8"), window, { filename: "build-info.js" });
  installBrowserStubs(window);

  const appCode = readFileSync(resolve(demoRoot, "app.js"), "utf8");
  window.eval(appCode);

  return window;
}

function click(window, id) {
  const element = window.document.getElementById(id);
  assert.isNotNull(element, `missing element #${id}`);
  element.click();
}

describe("demo fidelity", function() {
  describe("build artifacts", function() {
    it("runs the bundle that is published to npm", function() {
      assert.isTrue(existsSync(vendorBundle), "run npm run build first");
      const published = readFileSync(resolve(root, "lib/bundle.js"));
      assert.isAbove(published.length, 1000);
      assert.isTrue(published.equals(readFileSync(vendorBundle)), "demo/vendor copy differs from lib/bundle.js");
    });

    it("demo bundle exposes public FSA API only", function() {
      exerciseDemoBundle(loadDemoBundleApi());
    });

    it("build info carries the version from package.json", function() {
      const sandbox = {};
      runInNewContext(readFileSync(buildInfo, "utf8"), sandbox, { filename: "build-info.js" });
      assert.equal(sandbox.fasJsDemoBuild.version, packageVersion);
    });

    it("ships required static assets", function() {
      for (const asset of REQUIRED_ASSETS) {
        assert.isTrue(existsSync(resolve(demoRoot, asset)), asset);
      }
    });

    it("index.html references assets that exist on disk", function() {
      const html = readFileSync(resolve(demoRoot, "index.html"), "utf8");
      assert.include(html, "vendor/fas-js.bundle.js");
      assert.include(html, "vendor/build-info.js");
      assert.include(html, "app.js");
      assert.include(html, "styles.css");
      assert.include(html, "Finite State Automaton Simulator");
    });

    it("has no versioned demo folders", function() {
      for (const folder of ["v1.1", "v1.5"]) {
        assert.isFalse(existsSync(resolve(demoRoot, folder)), folder);
      }
    });

    it("carries no hand-written demo version", function() {
      for (const file of ["index.html", "app.js", "styles.css", "README.md"]) {
        const text = readFileSync(resolve(demoRoot, file), "utf8");
        assert.notMatch(text, /\bv1\.(?:1|5|6)\b/, file);
      }
    });
  });

  describe("static HTTP smoke", function() {
    let server;

    before(async function() {
      server = await startDemoStaticServer(demoRoot);
    });

    after(async function() {
      if (server) await server.close();
    });

    async function expectOk(pathname, contentMatch) {
      const response = await fetch(`${server.baseUrl}${pathname}`);
      assert.equal(response.status, 200, pathname);
      const body = await response.text();
      if (contentMatch) {
        assert.include(body, contentMatch);
      }
      return body;
    }

    it("serves the simulator at the site root", async function() {
      await expectOk("/", "Finite State Automaton Simulator");
      await expectOk("/index.html", "Finite State Automaton Simulator");
    });

    it("serves the app, styles, and vendor files", async function() {
      await expectOk("/app.js", "EXAMPLES");
      await expectOk("/styles.css", ".workspace");
      const bundle = await expectOk("/vendor/fas-js.bundle.js");
      assert.include(bundle, "fasJs");
      await expectOk("/vendor/build-info.js", packageVersion);
    });

    it("returns 404 for the former versioned paths", async function() {
      for (const pathname of ["/v1.1/", "/v1.5/", "/v1.5/index.html"]) {
        const response = await fetch(`${server.baseUrl}${pathname}`);
        assert.equal(response.status, 404, pathname);
      }
    });

    it("returns 404 for missing demo paths", async function() {
      const response = await fetch(`${server.baseUrl}/v9.9/index.html`);
      assert.equal(response.status, 404);
    });
  });

  describe("browser UI workflows (jsdom)", function() {
    it("wires required DOM ids referenced by app.js", function() {
      const window = loadDemoAppDom();
      for (const id of REQUIRED_DOM_IDS) {
        assert.isNotNull(window.document.getElementById(id), id);
      }
    });

    it("shows the library version it was built from", function() {
      const window = loadDemoAppDom();
      assert.equal(
        window.document.getElementById("lib-version").textContent,
        `fas-js ${packageVersion}`
      );
    });

    it("auto-builds the default FSA example on load", function() {
      const window = loadDemoAppDom();
      const status = window.document.getElementById("build-status");
      assert.include(status.className, "build-status--ok");
      assert.equal(window.document.getElementById("fsa-type").textContent, "DFA");
    });

    it("simulates acceptance for the default example", function() {
      const window = loadDemoAppDom();
      click(window, "simulate-btn");
      const result = window.document.getElementById("result");
      assert.include(result.className, "result--accept");
      assert.include(result.textContent, "Accepted");
    });

    it("steps through the default example", function() {
      const window = loadDemoAppDom();
      click(window, "step-btn");
      const result = window.document.getElementById("result");
      assert.include(result.textContent, "Processed");
    });

    it("hides custom JSON editor until Custom machine is selected", function() {
      const window = loadDemoAppDom();
      const customPanel = window.document.getElementById("custom-panel");
      assert.isTrue(customPanel.classList.contains("is-hidden"));
      assert.isTrue(customPanel.hidden);
      assert.isTrue(window.document.getElementById("fsa-definition").disabled);
    });

    it("enables custom JSON editor when Custom machine is selected", function() {
      const window = loadDemoAppDom();
      const select = window.document.getElementById("example-select");
      select.value = "custom";
      select.dispatchEvent(new window.Event("change"));

      const customPanel = window.document.getElementById("custom-panel");
      assert.isFalse(customPanel.classList.contains("is-hidden"));
      assert.isFalse(customPanel.hidden);
      assert.isFalse(window.document.getElementById("fsa-definition").disabled);
      assert.isFalse(window.document.getElementById("build-btn").disabled);
    });

    it("surfaces JSON parse errors for invalid definitions", function() {
      const window = loadDemoAppDom();
      const select = window.document.getElementById("example-select");
      select.value = "custom";
      select.dispatchEvent(new window.Event("change"));
      window.document.getElementById("fsa-definition").value = "{not-json";
      click(window, "build-btn");
      assert.include(
        window.document.getElementById("build-status").textContent,
        "Build failed"
      );
    });
  });
});
