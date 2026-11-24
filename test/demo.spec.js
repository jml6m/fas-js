/**
 * The simulator at the site root: what the build puts beside it, that it is served and asks no
 * other site for anything, and the page itself in jsdom, compared with the library throughout.
 * Runs with npm test (the build fills the demo's vendor folder first).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Graphviz } from "@hpcc-js/wasm-graphviz";
import { assert } from "chai";
import { JSDOM } from "jsdom";

import { startDemoStaticServer } from "../scripts/demo-static-server.mjs";
import { PRESETS } from "../demo/presets.js";
import { definitionFromGraph } from "../demo/sim/dot.js";
import { digraphCases } from "./helpers/digraphCases.js";
import { assertPublicApiSurface } from "./helpers/publicApiContract.js";
import { buildInfo, demoRoot, openSimulator, publishedLibrary, readDemo, root } from "./helpers/simulatorPage.js";

const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

// The page's own files: its markup, its style sheet and every script it loads or imports
const PAGE_SCRIPTS = ["main.js", "app.js", "drawing.js", "presets.js", "sim/machine.js", "sim/run.js", "sim/dot.js"];
const PAGE_FILES = ["index.html", "styles.css", ...PAGE_SCRIPTS];
const VENDOR_FILES = ["vendor/fas-js.bundle.js", "vendor/build-info.js", "vendor/graphviz.js", "vendor/graphviz.LICENSE.txt", "vendor/NOTICE.txt"];

const NO_ERROR_CODE = /E-\d{3}/;

describe("simulator page", function () {
  let graphviz;

  before(async function () {
    this.timeout(20000);
    graphviz = await Graphviz.load();
  });

  const open = (options = {}) => openSimulator({ loadGraphviz: async () => graphviz, ...options });

  describe("build output", function () {
    it("has the page and every vendor file", function () {
      for (const file of [...PAGE_FILES, ...VENDOR_FILES]) {
        assert.isTrue(existsSync(resolve(demoRoot, file)), file);
      }
    });

    it("runs the bundle that is published to npm", function () {
      const published = readFileSync(resolve(root, "lib/bundle.js"));
      assert.isAbove(published.length, 1000);
      assert.isTrue(published.equals(readFileSync(resolve(demoRoot, "vendor/fas-js.bundle.js"))), "demo/vendor copy differs from lib/bundle.js");
    });

    it("gets only the public API from that bundle", function () {
      const api = publishedLibrary();
      assertPublicApiSurface(api, "demo vendor fasJs");
    });

    it("is told the version in package.json", function () {
      assert.equal(buildInfo().version, packageJson.version);
    });

    it("draws with the pinned Graphviz build, with its licence beside it", function () {
      assert.equal(packageJson.devDependencies["@hpcc-js/wasm-graphviz"], "1.30.0");
      const copy = readDemo("vendor/graphviz.js");
      assert.isAbove(copy.length, 100000);
      assert.notInclude(copy, "sourceMappingURL");
      assert.include(readDemo("vendor/NOTICE.txt"), "@hpcc-js/wasm-graphviz 1.30.0");
      assert.include(readDemo("vendor/NOTICE.txt"), `fas-js ${packageJson.version}`);
      assert.include(readDemo("vendor/graphviz.LICENSE.txt"), "Apache License");
    });

    it("has no versioned demo folders and no hand-written version", function () {
      for (const folder of ["v1.1", "v1.5"]) {
        assert.isFalse(existsSync(resolve(demoRoot, folder)), folder);
      }
      for (const file of [...PAGE_FILES, "README.md"]) {
        assert.notMatch(readDemo(file), /\bv1\.(?:1|5|6)\b/, file);
      }
    });
  });

  describe("requests", function () {
    it("loads every script, style and image from its own folder", function () {
      const { document } = new JSDOM(readDemo("index.html")).window;
      const sources = [
        ...[...document.querySelectorAll("script")].map((script) => script.getAttribute("src")),
        ...[...document.querySelectorAll("link")].map((link) => link.getAttribute("href")),
        ...[...document.querySelectorAll("img, source, iframe, object, embed, video, audio")].map((element) => element.getAttribute("src") ?? element.getAttribute("data")),
      ];
      assert.isAbove(sources.length, 3);
      for (const source of sources) {
        assert.isString(source, "an inline script or a link without a target");
        assert.match(source, /^(?:\.\/)?[\w./-]+$|^data:,$/, source);
      }
      assert.lengthOf(document.querySelectorAll("script:not([src])"), 0, "inline scripts");
      assert.lengthOf(document.querySelectorAll("style, [style]"), 0, "inline styles");
    });

    it("names no other site in its scripts or its style sheet", function () {
      for (const file of ["styles.css", ...PAGE_SCRIPTS]) {
        const text = readDemo(file);
        assert.notMatch(text, /https?:\/\/|(?:^|[^:\w])\/\/[\w-]+\.[a-z]{2,}/i, file);
        assert.notMatch(text, /@import|url\s*\(/i, file);
        assert.notMatch(text, /\balert\s*\(/, file);
      }
    });

    it("imports only its own files", function () {
      for (const file of PAGE_SCRIPTS) {
        const imports = [...readDemo(file).matchAll(/\bimport\s*(?:[^"'()]*?\bfrom\s*)?\(?\s*["']([^"']+)["']/g)].map((match) => match[1]);
        for (const target of imports) assert.match(target, /^\.\.?\/[\w./-]+\.js$/, `${file} imports ${target}`);
      }
    });

    it("links the reader to the original simulator, the project and the notices", function () {
      const { document } = new JSDOM(readDemo("index.html")).window;
      const links = [...document.querySelectorAll("a")].map((a) => a.getAttribute("href"));
      assert.includeMembers(links, ["v1/", "https://github.com/jml6m/fas-js", "vendor/NOTICE.txt"]);
    });
  });

  describe("served over HTTP", function () {
    let server;

    before(async function () {
      server = await startDemoStaticServer(demoRoot);
    });

    after(async function () {
      if (server) await server.close();
    });

    it("serves the page at the site root", async function () {
      for (const pathname of ["/", "/index.html"]) {
        const response = await fetch(`${server.baseUrl}${pathname}`);
        assert.equal(response.status, 200, pathname);
        assert.include(await response.text(), "Finite Automaton Simulator");
      }
    });

    it("serves every script as JavaScript, which a module script needs", async function () {
      for (const file of [...PAGE_SCRIPTS, "vendor/fas-js.bundle.js", "vendor/build-info.js", "vendor/graphviz.js"]) {
        const response = await fetch(`${server.baseUrl}/${file}`);
        assert.equal(response.status, 200, file);
        assert.include(response.headers.get("content-type"), "text/javascript", file);
        await response.arrayBuffer();
      }
    });

    it("serves the style sheet and the notices", async function () {
      for (const file of ["styles.css", "vendor/NOTICE.txt", "vendor/graphviz.LICENSE.txt"]) {
        const response = await fetch(`${server.baseUrl}/${file}`);
        assert.equal(response.status, 200, file);
        await response.arrayBuffer();
      }
    });

    it("returns 404 for the former versioned paths and for missing ones", async function () {
      for (const pathname of ["/v1.1/", "/v1.5/", "/v1.5/index.html", "/v9.9/index.html"]) {
        const response = await fetch(`${server.baseUrl}${pathname}`);
        assert.equal(response.status, 404, pathname);
      }
    });
  });

  describe("in use (jsdom, the published bundle, Graphviz)", function () {
    it("starts with the first preset loaded, drawn and ready", async function () {
      const page = await open();

      assert.equal(page.byId("preset").value, PRESETS[0].id);
      assert.lengthOf(page.byId("preset").options, PRESETS.length + 1);
      assert.equal(page.text("lib-version"), `fas-js ${packageJson.version}`);
      assert.equal(page.text("summary"), "A DFA with 2 states. Alphabet: 0, 1.");
      assert.equal(page.byId("input").value, PRESETS[0].input);
      assert.equal(page.text("input-rule"), "(one character per symbol)");
      assert.equal(page.text("step-message"), "Start: in state q1.");
      assert.equal(page.text("result"), "");
      assert.lengthOf(page.document.querySelectorAll("#graph svg"), 1);
      assert.deepEqual(page.marked(), { states: ["q1"], edges: [] });
      assert.isTrue(page.byId("reset").disabled);
      assert.isFalse(page.byId("step").disabled);
    });

    it("shows the definition of a preset as text that loads back as the same machine", async function () {
      const page = await open();
      const fas = publishedLibrary();
      for (const preset of PRESETS) {
        await page.choose(preset.id);
        assert.deepEqual(JSON.parse(page.byId("definition").value), preset.definition, preset.id);
        assert.equal(page.text("about"), preset.about);
        assert.equal(page.text("load-error"), "", preset.id);

        const { states, alphabet, transitions, start, accepts } = preset.definition;
        const type = fas.createFSA(states, alphabet, transitions, start, accepts).getType();
        assert.match(page.text("summary"), type === "NFA" ? /^An NFA with/ : /^A DFA with/, preset.id);
      }
    });

    it("simulates to the library's verdict and says it in a sentence for a screen reader", async function () {
      const page = await open();

      page.click("simulate");
      assert.equal(page.text("result"), "Accepted ✓");
      assert.equal(page.byId("result").dataset.verdict, "accepted");
      assert.equal(page.text("result-words"), "Accepted: the machine ends in an accept state for this input.");
      assert.equal(page.text("step-message"), "Read “1”, symbol 3 of 3: now in state q2.");

      page.type("input", "10");
      assert.equal(page.text("result"), "", "a new input starts over");
      page.press("input", "Enter");
      assert.equal(page.text("result"), "Rejected ✗");
      assert.equal(page.byId("result").dataset.verdict, "rejected");

      page.type("input", "");
      page.click("simulate");
      assert.equal(page.text("result-words"), "Rejected: the machine does not end in an accept state for the empty input.");
    });

    it("steps one symbol at a time, marking the state it is in and the edge it took", async function () {
      const page = await open();
      await page.choose("dfa-same-ends");
      page.type("input", "aba");

      assert.deepEqual(page.marked(), { states: ["s"], edges: [] });
      page.click("step");
      assert.equal(page.text("step-message"), "Read “a”, symbol 1 of 3: now in state q1.");
      assert.deepEqual(page.marked(), { states: ["q1"], edges: ["s->q1"] });
      assert.equal(page.text("result"), "");
      assert.isFalse(page.byId("reset").disabled);

      page.click("step");
      assert.deepEqual(page.marked(), { states: ["q2"], edges: ["q1->q2"] });
      page.click("step");
      assert.deepEqual(page.marked(), { states: ["q1"], edges: ["q2->q1"] });
      assert.equal(page.text("result"), "Accepted ✓");
      assert.isTrue(page.byId("step").disabled);

      const tape = [...page.document.querySelectorAll("#tape li")];
      assert.deepEqual(tape.map((item) => item.textContent), ["a", "b", "a"]);
      assert.equal(tape[2].getAttribute("aria-current"), "step");

      page.click("reset");
      assert.equal(page.text("step-message"), "Start: in state s.");
      assert.equal(page.text("result"), "");
      assert.deepEqual(page.marked(), { states: ["s"], edges: [] });
      assert.isTrue(page.byId("reset").disabled);
    });

    it("lists every step when asked: the symbol read and the states before and after", async function () {
      const page = await open();
      await page.choose("nfa-one-near-end");
      page.type("input", "010");
      assert.isTrue(page.byId("steps").hidden);

      page.click("show-steps");
      assert.isFalse(page.byId("steps").hidden);
      const rows = () => [...page.document.querySelectorAll("#steps li")].map((row) => row.textContent);
      assert.deepEqual(rows(), ["Start: q1", "Read “0”: q1 → q1", "Read “1”: q1 → q1, q2, q3", "Read “0”: q1, q2, q3 → q1, q3, q4"]);
      assert.equal(page.document.querySelector('#steps [aria-current="step"]').textContent, "Start: q1");

      page.click("step");
      page.click("step");
      assert.equal(page.document.querySelector('#steps [aria-current="step"]').textContent, "Read “1”: q1 → q1, q2, q3");

      page.click("show-steps");
      assert.isTrue(page.byId("steps").hidden);
    });

    it("stops at a symbol outside the alphabet with a sentence, and gives no verdict", async function () {
      const page = await open();
      page.type("input", "10x1");
      page.click("show-steps");
      page.click("simulate");

      assert.equal(page.text("input-error"), "“x” is not in this machine's alphabet (“0”, “1”).");
      assert.isFalse(page.byId("input-error").hidden);
      assert.equal(page.text("result"), "");
      assert.equal(page.document.querySelector("#tape .is-unknown").textContent, "x");
      assert.equal(page.document.querySelector("#steps .steps__problem").textContent, page.text("input-error"));
      assert.equal(page.text("step-message"), "Read “0”, symbol 2 of 4: now in state q1.");
    });

    it("loads a pasted JSON definition", async function () {
      const page = await open();
      await page.load(
        JSON.stringify({
          states: ["x", "y"],
          alphabet: "pq",
          transitions: [
            { from: "x", to: "x,y", input: "p" },
            { from: "y", to: "x", input: "" },
          ],
          start: "x",
          accepts: ["y"],
        })
      );

      assert.equal(page.byId("preset").value, "own");
      assert.equal(page.text("summary"), "An NFA with 2 states. Alphabet: p, q.");
      assert.equal(page.byId("input").value, "");
      assert.lengthOf(page.document.querySelectorAll("#graph svg"), 1);
      page.type("input", "pp");
      page.click("simulate");
      assert.equal(page.text("result"), "Accepted ✓");
    });

    for (const fixture of ["colliding-names", "quoted-names", "symbols", "unreachable-states", "no-edges"]) {
      it(`draws and runs pasted generateDigraph() text: ${fixture}`, async function () {
        const fas = publishedLibrary();
        const testCase = digraphCases.find((candidate) => candidate.fixture === fixture);
        const original = fas.createFSA(...structuredClone(testCase.args));
        const page = await open();

        await page.load(original.generateDigraph());

        assert.equal(page.text("load-error"), "");
        assert.lengthOf(page.document.querySelectorAll("#graph svg"), 1);
        assert.isFalse(page.byId("simulate").disabled);
        if (fixture === "symbols") {
          // One of these symbols is a comma, so each is quoted to keep the list readable
          assert.equal(page.text("summary"), 'An NFA with 3 states. Alphabet: “"”, “,”, “0”, “\\”, “a,b”, “up”, “ε”.');
        }

        // The drawing shows only the symbols on its edges, so those are the rebuilt machine's alphabet
        const alphabet = definitionFromGraph(JSON.parse(graphviz.dot(original.generateDigraph(), "json"))).alphabet;
        const single = alphabet.every((symbol) => [...symbol].length === 1);
        const typeable = alphabet.filter((symbol) => !/\s/.test(symbol));
        for (const word of [[], typeable.slice(0, 1), typeable.slice(0, 2), [...typeable.slice(-1), ...typeable.slice(0, 2)]]) {
          page.type("input", word.join(single ? "" : " "));
          page.click("simulate");
          assert.equal(page.text("result"), fas.simulateFSA(word, original) ? "Accepted ✓" : "Rejected ✗", JSON.stringify(word));
        }
      });
    }

    it("shows a pasted drawing it cannot rebuild, and says in a sentence why it cannot be run", async function () {
      const page = await open();
      await page.load('digraph { a -> b [label="x"]; b -> a [label="y"]; }');

      assert.lengthOf(page.document.querySelectorAll("#graph svg"), 1);
      assert.match(page.text("load-error"), /^The drawing is shown, but it cannot be run\. This drawing has no single start marker/);
      assert.isTrue(page.byId("simulate").disabled);
      assert.isTrue(page.byId("step").disabled);
      assert.isTrue(page.byId("input").disabled);
    });

    it("explains text it cannot load in a sentence, never with an error code", async function () {
      const page = await open();
      const fromLibrary = [];
      const original = console.error;
      console.error = (...args) => fromLibrary.push(args);
      try {
        const cases = [
          ['{ "states": ["q1"], "alphabet": "01", ', /not valid JSON/],
          ["[]", /one JSON object/],
          ['{ "states": ["q1"] }', /has no "alphabet"/],
          [JSON.stringify({ states: ["q1", "q2"], alphabet: "ab", transitions: [{ from: "q1", to: "q2", input: "a" }], start: "q1", accepts: ["q2"] }), /State “q1” has none for “b”/],
          [JSON.stringify({ states: ["q1"], alphabet: "a", transitions: [{ from: "q1", to: "q9", input: "a" }], start: "q1", accepts: [] }), /goes to “q9”/],
          ["digraph { a -> ", /Graphviz could not read this text/],
        ];
        for (const [text, expected] of cases) {
          await page.load(text);
          assert.match(page.text("load-error"), expected);
          assert.notMatch(page.text("load-error"), NO_ERROR_CODE);
          assert.isFalse(page.byId("load-error").hidden);
          assert.isTrue(page.byId("simulate").disabled, text);
          assert.notMatch(page.document.body.textContent, NO_ERROR_CODE);
        }
      } finally {
        console.error = original;
      }

      await page.choose(PRESETS[0].id);
      assert.equal(page.text("load-error"), "");
      assert.isFalse(page.byId("simulate").disabled);
    });

    it("copies the DOT text of the graph on screen", async function () {
      const page = await open();
      let copied = null;
      Object.defineProperty(page.window.navigator, "clipboard", { value: { writeText: async (text) => void (copied = text) }, configurable: true });

      page.click("copy-dot");
      await new Promise((done) => setTimeout(done, 0));

      const { states, alphabet, transitions, start, accepts } = PRESETS[0].definition;
      assert.equal(copied, publishedLibrary().createFSA(states, alphabet, transitions, start, accepts).generateDigraph());
      assert.match(page.text("load-status"), /^The DOT text of this graph is copied/);
    });

    it("says how the input is split into symbols for the machine that is loaded", async function () {
      const page = await open();
      await page.choose("dfa-words");
      assert.equal(page.text("input-rule"), "(symbols separated by spaces)");
      assert.match(page.text("input-hint"), /^Separate the symbols with spaces, for example up down\./);

      page.type("input", "up up down");
      page.click("step");
      page.click("step");
      assert.deepEqual([...page.document.querySelectorAll("#tape li")].map((item) => item.textContent), ["up", "up", "down"]);
      assert.equal(page.text("step-message"), "Read “up”, symbol 2 of 3: now in state upper.");

      await page.choose("dfa-emoji");
      assert.equal(page.text("input-rule"), "(one character per symbol)");
      page.type("input", "🙁🙂");
      page.click("step");
      assert.equal(page.text("step-message"), "Read “🙁”, symbol 1 of 2: now in state odd.");
    });

    it("accepts the empty input when ε leads from the start state to an accept state, simulating or stepping", async function () {
      const page = await open();
      await page.choose("nfa-epsilon-start");
      assert.equal(page.byId("input").value, "");
      assert.equal(page.text("step-message"), "Start: in states start, as and bs, reached without reading anything.");
      assert.sameMembers(page.marked().states, ["start", "as", "bs"]);
      assert.sameMembers(page.marked().edges, ["start->as", "start->bs"]);

      page.click("simulate");
      assert.equal(page.text("result"), "Accepted ✓");
      page.click("reset");
      page.click("step");
      assert.equal(page.text("result"), "Accepted ✓");
      assert.equal(page.document.querySelector("#tape li").textContent, "empty input");
    });

    it("switches between the two panels on a small screen", async function () {
      const page = await open();
      assert.equal(page.byId("app").dataset.view, "run");
      page.click("view-machine");
      assert.equal(page.byId("app").dataset.view, "machine");
      assert.equal(page.byId("view-machine").getAttribute("aria-pressed"), "true");
      assert.equal(page.byId("view-run").getAttribute("aria-pressed"), "false");
      page.click("view-run");
      assert.equal(page.byId("app").dataset.view, "run");
    });

    it("shows the definition when Your own machine is chosen, and the run once it loads", async function () {
      const page = await open();
      await page.choose("own");
      assert.equal(page.byId("app").dataset.view, "machine");
      assert.equal(page.text("summary"), "A DFA with 2 states. Alphabet: 0, 1.", "the machine on screen stays until another is loaded");

      await page.load('{ "states": ["q1"] ');
      assert.equal(page.byId("app").dataset.view, "machine", "a problem is shown where the text is");

      await page.load(JSON.stringify(PRESETS[1].definition));
      assert.equal(page.byId("app").dataset.view, "run");
      assert.equal(page.text("summary"), "A DFA with 5 states. Alphabet: a, b.");
    });

    it("says so when the library did not load", async function () {
      const page = await open({ fas: null });
      assert.match(page.text("graph"), /The library did not load/);
      assert.isTrue(page.byId("simulate").disabled);
    });
  });

  describe("a graph that cannot be drawn", function () {
    it("shows a message when the drawing tool does not load, and the machine still runs", async function () {
      const page = await openSimulator({ loadGraphviz: async () => Promise.reject(new Error("offline")) });

      assert.lengthOf(page.document.querySelectorAll("#graph svg"), 0);
      assert.equal(page.text("graph"), "The drawing tool did not load, so there is no graph. Running the machine still works.");
      page.click("simulate");
      assert.equal(page.text("result"), "Accepted ✓");
      page.click("reset");
      page.click("step");
      assert.equal(page.text("step-message"), "Read “1”, symbol 1 of 3: now in state q2.");
    });

    it("shows a message when Graphviz fails on the machine, and the machine still runs", async function () {
      const broken = { dot: () => { throw new Error("syntax error in line 1"); } };
      const page = await openSimulator({ loadGraphviz: async () => broken });

      assert.equal(page.text("graph"), "This machine could not be drawn. Running it still works.");
      page.click("simulate");
      assert.equal(page.text("result"), "Accepted ✓");
    });

    it("says a pasted drawing cannot be read when the drawing tool did not load", async function () {
      const page = await openSimulator({ loadGraphviz: async () => Promise.reject(new Error("offline")) });
      await page.load("digraph fsa { a -> b; }");

      assert.match(page.text("load-error"), /^The drawing tool did not load, so a pasted drawing cannot be read\. A JSON definition still works\.$/);
      assert.isTrue(page.byId("simulate").disabled);
    });
  });
});
