/**
 * Demo fidelity — build artifacts, static HTTP smoke, and browser UI workflows.
 * Runs on every branch via npm test (after build copies vendor bundle).
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

import { JSDOM } from "jsdom";
import { assert } from "chai";

import { startDemoStaticServer } from "../scripts/demo-static-server.mjs";

const __dir = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");
const demoRoot = resolve(root, "demo");
const v15Root = resolve(demoRoot, "v1.5");
const vendorBundle = resolve(v15Root, "vendor/fas-js.bundle.js");

const REQUIRED_V15_ASSETS = [
  "index.html",
  "app.js",
  "styles.css",
  "vendor/fas-js.bundle.js",
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
  "advanced-panel",
  "graph-viewport",
];

function loadDemoBundleApi() {
  const code = readFileSync(vendorBundle, "utf8");
  const sandbox = { fasJs: undefined, console };
  runInNewContext(code, sandbox, { filename: "demo/v1.5/vendor/fas-js.bundle.js" });
  assert.isObject(sandbox.fasJs);
  return sandbox.fasJs;
}

function exerciseDemoBundle(api) {
  assert.isFunction(api.createFSA);
  assert.isFunction(api.simulateFSA);
  assert.isFunction(api.stepOnceFSA);
  assert.isUndefined(api.RegularLanguage);

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
  const html = readFileSync(resolve(v15Root, "index.html"), "utf8");
  const dom = new JSDOM(html, {
    url: "http://127.0.0.1/v1.5/",
    runScripts: "outside-only",
  });
  const { window } = dom;

  const bundleCode = readFileSync(vendorBundle, "utf8");
  runInNewContext(bundleCode, window, { filename: "fas-js.bundle.js" });
  installBrowserStubs(window);

  const appCode = readFileSync(resolve(v15Root, "app.js"), "utf8");
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
    it("copies v1.5 vendor bundle after npm run build", function() {
      assert.isTrue(existsSync(vendorBundle), "run npm run build first");
      const stats = readFileSync(vendorBundle);
      assert.isAbove(stats.length, 1000);
    });

    it("demo bundle exposes public FSA API only", function() {
      exerciseDemoBundle(loadDemoBundleApi());
    });

    it("v1.5 ships required static assets", function() {
      for (const asset of REQUIRED_V15_ASSETS) {
        assert.isTrue(existsSync(resolve(v15Root, asset)), asset);
      }
    });

    it("index.html references assets that exist on disk", function() {
      const html = readFileSync(resolve(v15Root, "index.html"), "utf8");
      assert.include(html, "vendor/fas-js.bundle.js");
      assert.include(html, "app.js");
      assert.include(html, "styles.css");
      assert.include(html, "Finite State Automaton Simulator");
    });

    it("v1.1 redirect preserves old URL and points at v1.5", function() {
      const html = readFileSync(resolve(demoRoot, "v1.1/index.html"), "utf8");
      assert.include(html, "../v1.5/");
      assert.include(html, "DFA/NFA simulator");
      assert.notInclude(html, "id=\"build-btn\"");
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

    it("serves v1.5 with or without trailing slash", async function() {
      await expectOk("/v1.5/", "Finite State Automaton Simulator");
      await expectOk("/v1.5", "Finite State Automaton Simulator");
      await expectOk("/v1.5/index.html", "Finite State Automaton Simulator");
    });

    it("serves v1.5 app, styles, and vendor bundle", async function() {
      await expectOk("/v1.5/app.js", "EXAMPLES");
      await expectOk("/v1.5/styles.css", ".workspace");
      const bundle = await expectOk("/v1.5/vendor/fas-js.bundle.js");
      assert.include(bundle, "fasJs");
    });

    it("serves demo root redirect to v1.5", async function() {
      await expectOk("/", "v1.5/");
    });

    it("serves v1.1 redirect page", async function() {
      await expectOk("/v1.1/", "../v1.5/");
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

    it("surfaces JSON parse errors for invalid definitions", function() {
      const window = loadDemoAppDom();
      window.document.getElementById("fsa-definition").value = "{not-json";
      click(window, "build-btn");
      assert.include(
        window.document.getElementById("build-status").textContent,
        "Build failed"
      );
    });
  });
});