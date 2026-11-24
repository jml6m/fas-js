/**
 * The original 2019 simulator at demo/v1/: what the build puts beside it, that it asks no other
 * site for anything, and that it gives the answers fas-js 1.3.1 gives when called directly.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

import { Graphviz } from "@hpcc-js/wasm-graphviz";
import { assert } from "chai";
import { JSDOM } from "jsdom";

import { folderRedirect, startDemoStaticServer } from "../scripts/demo-static-server.mjs";

const __dir = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");
const demoRoot = resolve(root, "demo");
const pageRoot = resolve(demoRoot, "v1");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

const read = relative => readFileSync(resolve(pageRoot, relative), "utf8");

/**
 * The browser bundle of fas-js 1.3.1 as published to npm (lib/bundle.js in fas-js-1.3.1.tgz,
 * whose registry integrity is sha512-7/ga92oka/0emUI0GR4pBz2cLyc9EbBmCFsRoP0e5csI1G1IxWLCAeSXwVbXfuJt8BJCM/KeLEVbnZmIZ1/wrA==).
 * The copy tracked beside the page must stay that file, byte for byte.
 */
const ORIGINAL_BUNDLE = "fas-js-1.3.1.bundle.js";
const ORIGINAL_BUNDLE_SHA256 = "33f2c7028899dfc91bae4bffc3416ddfa3f861fd3d43d077139aeeedd3b4b46a";
const originalVersion = "1.3.1";

/** fas-js 1.3.1 itself, loaded from that bundle the way a CommonJS loader would. */
const original = (() => {
  const module = { exports: {} };
  new Function("module", "exports", read(ORIGINAL_BUNDLE))(module, module.exports);
  return module.exports;
})();

const PAGE_FILES = ["index.html", "app.js", "logic.js", "styles.css", ORIGINAL_BUNDLE];
const VENDOR_FILES = [
  "vendor/build-info.js",
  "vendor/graphviz.js",
  "vendor/graphviz.LICENSE.txt",
  "vendor/NOTICE.txt",
];

const README_DFA = {
  states: "q1,q2",
  alphabet: "0,1",
  nondeterministic: false,
  transitions: ["q1,1,q2", "q2,0,q1", "q2,1,q2", "q1,0,q1"],
  start: "q1",
  accepts: ["q1"],
};

const README_NFA = {
  states: "q1,q2,q3,q4",
  alphabet: "0,1",
  nondeterministic: true,
  transitions: ["q1,0,q1", "q1,1,[q1|q2]", "q2,0,q3", "q2,,q3", "q3,1,q4", "q4,0,q4", "q4,1,q4"],
  start: "q1",
  accepts: ["q3", "q4"],
};

const EPSILON_FROM_START = {
  states: "a,b",
  alphabet: "0",
  nondeterministic: true,
  transitions: ["a,,b", "b,0,b"],
  start: "a",
  accepts: ["b"],
};

/** The same machine built by calling fas-js 1.3.1 directly, the way its README shows. */
function buildDirectly(definition) {
  const transitions = definition.transitions.map(line => {
    const [from, input, to] = line.split(",");
    return { from, input, to: to.replace(/[[\]]/g, "").replace(/\|/g, ",") };
  });
  return original.createFSA(
    definition.states.split(","),
    definition.alphabet.split(","),
    transitions,
    definition.start,
    definition.accepts
  );
}

describe("original simulator page (demo/v1)", function() {
  let graphviz;

  before(async function() {
    graphviz = await Graphviz.load();
  });

  function loadPage({ drawWith = () => graphviz } = {}) {
    const dom = new JSDOM(read("index.html"), { url: "http://127.0.0.1/v1/", runScripts: "outside-only" });
    const { window } = dom;
    const realSetTimeout = window.setTimeout.bind(window);
    // "Step All" waits between symbols; the tests do not.
    window.setTimeout = callback => realSetTimeout(callback, 0);
    window.fasV1LoadGraphviz = async () => drawWith();
    for (const script of [ORIGINAL_BUNDLE, "vendor/build-info.js", "logic.js", "app.js"]) {
      window.eval(read(script));
    }
    return window;
  }

  const tick = () => new Promise(resolvePromise => setTimeout(resolvePromise, 0));

  async function until(check, label) {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      if (check()) return;
      await tick();
    }
    assert.fail(`timed out waiting for ${label}`);
  }

  const byId = (window, id) => window.document.getElementById(id);
  const click = (window, id) => byId(window, id).click();
  const textOf = (window, id) => byId(window, id).textContent.replace(/\s+/g, " ").trim();

  function setRole(window, name, role) {
    const button = [...byId(window, "roles").children].find(candidate => candidate.dataset.state === name);
    assert.isOk(button, `no role button for ${name}`);
    for (let presses = 0; presses < 4 && button.dataset.role !== role; presses += 1) button.click();
    assert.equal(button.dataset.role, role, `role of ${name}`);
  }

  function define(window, definition) {
    byId(window, "states").value = definition.states;
    byId(window, "alphabet").value = definition.alphabet;
    if (definition.nondeterministic) {
      byId(window, "type-nfa").checked = true;
      byId(window, "type-nfa").dispatchEvent(new window.Event("change"));
    }
    click(window, "apply");
    byId(window, "transitions").value = definition.transitions.join("\n");
    // The start state goes first: the first press on any state makes it the start.
    setRole(window, definition.start, definition.accepts.includes(definition.start) ? "both" : "start");
    for (const name of definition.accepts) {
      if (name !== definition.start) setRole(window, name, "accept");
    }
  }

  async function generate(window, definition) {
    define(window, definition);
    click(window, "generate");
    await until(() => byId(window, "graph").querySelector("svg"), "the drawing");
  }

  function runInput(window, input) {
    byId(window, "input").value = input;
    click(window, "run");
    return textOf(window, "result");
  }

  function stepThrough(window, input) {
    byId(window, "input").value = input;
    click(window, "step-once");
    assert.equal(textOf(window, "result"), "", "the first press only shows where the run starts");
    for (let press = 0; press < Math.max(input.length, 1); press += 1) click(window, "step-once");
    return textOf(window, "result");
  }

  const current = window =>
    [...byId(window, "graph").querySelectorAll("g.node.is-current")]
      .map(group => group.querySelector("title").textContent)
      .sort();
  const taken = window =>
    [...byId(window, "graph").querySelectorAll("g.edge.is-taken")]
      .map(group => group.querySelector("title").textContent)
      .sort();

  describe("build output", function() {
    it("has the page and every vendor file", function() {
      for (const file of [...PAGE_FILES, ...VENDOR_FILES]) {
        assert.isTrue(existsSync(resolve(pageRoot, file)), file);
      }
    });

    it("runs fas-js 1.3.1 exactly as published", function() {
      const tracked = readFileSync(resolve(pageRoot, ORIGINAL_BUNDLE));
      assert.equal(createHash("sha256").update(tracked).digest("hex"), ORIGINAL_BUNDLE_SHA256);
      assert.include(read("index.html"), `<script src="./${ORIGINAL_BUNDLE}"></script>`);
      assert.include(read("vendor/build-info.js"), JSON.stringify(originalVersion));
      assert.hasAllKeys(original, ["createFSA", "simulateFSA", "stepOnceFSA"]);
    });

    it("draws with the pinned Graphviz build", function() {
      assert.equal(pkg.devDependencies["@hpcc-js/wasm-graphviz"], "1.30.0");
      const copy = read("vendor/graphviz.js");
      assert.isAbove(copy.length, 100000);
      assert.notInclude(copy, "sourceMappingURL");
      assert.include(read("vendor/NOTICE.txt"), "@hpcc-js/wasm-graphviz 1.30.0");
      assert.include(read("vendor/graphviz.LICENSE.txt"), "Apache License");
    });
  });

  describe("requests", function() {
    it("loads scripts, styles and images from the site itself only", function() {
      const { document } = new JSDOM(read("index.html")).window;
      const loaded = [
        ...[...document.querySelectorAll("script")].map(node => node.getAttribute("src")),
        ...[...document.querySelectorAll("link")].map(node => node.getAttribute("href")),
        ...[...document.querySelectorAll("img, source, iframe, object, embed, video, audio")].map(
          node => node.getAttribute("src") ?? node.getAttribute("data")
        ),
      ];
      assert.isAbove(loaded.length, 4);
      for (const url of loaded) {
        assert.isString(url, "an inline script or a tag without a source");
        assert.match(url, /^(?:\.\/|data:,$)?[\w./-]*$/, url);
        assert.notMatch(url, /^\/\/|:\/\//, url);
      }
      assert.isEmpty([...document.querySelectorAll("[style*='url(']")]);
    });

    it("names another site only in links the reader follows", function() {
      const html = read("index.html");
      const { document } = new JSDOM(html).window;
      const linked = [...document.querySelectorAll("a[href]")].map(node => node.getAttribute("href"));
      const elsewhere = html.match(/https?:\/\/[^\s"'<>)]+/g) ?? [];
      for (const url of elsewhere) assert.include(linked, url);
      for (const file of ["app.js", "logic.js", "styles.css"]) {
        assert.notMatch(read(file), /https?:\/\/|@import|url\(/, file);
      }
    });

    it("links to the current demo, and the current demo links back", function() {
      const { document } = new JSDOM(read("index.html")).window;
      assert.isOk(document.querySelector('a[href="../"]'));
      const rootDocument = new JSDOM(readFileSync(resolve(demoRoot, "index.html"), "utf8")).window.document;
      assert.isOk(rootDocument.querySelector('a[href="v1/"]'));
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

    it("serves the page with or without a trailing slash", async function() {
      for (const pathname of ["/v1/", "/v1", "/v1/index.html"]) {
        const response = await fetch(`${server.baseUrl}${pathname}`);
        assert.equal(response.status, 200, pathname);
        assert.include(await response.text(), "original 2019 simulator");
      }
    });

    it("redirects the folder without its slash, so the page's own files resolve inside it", async function() {
      const response = await fetch(`${server.baseUrl}/v1`, { redirect: "manual" });
      assert.equal(response.status, 301);
      assert.equal(response.headers.get("location"), "/v1/");

      assert.equal(folderRedirect(demoRoot, "/v1?step=1"), "/v1/");
      assert.equal(folderRedirect(demoRoot, "//v1"), "/v1/", "the redirect never names another host");
      for (const pathname of ["/", "/v1/", "/v1/app.js", "/app.js", "/missing", "/../demo", "/%E0%A4%A"]) {
        assert.isNull(folderRedirect(demoRoot, pathname), pathname);
      }
    });

    it("serves the page's own files and its vendor folder", async function() {
      for (const file of [...PAGE_FILES, ...VENDOR_FILES]) {
        const response = await fetch(`${server.baseUrl}/v1/${file}`);
        assert.equal(response.status, 200, file);
        if (file.endsWith(".js")) assert.include(response.headers.get("content-type"), "text/javascript", file);
        if (file.endsWith(".txt")) assert.include(response.headers.get("content-type"), "text/plain", file);
        await response.arrayBuffer();
      }
    });
  });

  describe("workflows (jsdom, fas-js 1.3.1, Graphviz)", function() {
    it("says which release it runs", function() {
      const window = loadPage();
      assert.equal(textOf(window, "lib-version"), `fas-js ${originalVersion}`);
      assert.include(window.document.querySelector(".top__note").textContent, "original 2019 simulator");
    });

    it("writes one line per state and symbol for a deterministic machine", function() {
      const window = loadPage();
      assert.isTrue(byId(window, "details").hidden);
      byId(window, "states").value = "q1,q2";
      byId(window, "alphabet").value = "0,1";
      click(window, "apply");
      assert.isFalse(byId(window, "details").hidden);
      assert.equal(byId(window, "transitions").value, "q1,0,\nq1,1,\nq2,0,\nq2,1,\n");
      assert.isTrue(byId(window, "states").disabled);
      assert.isTrue(byId(window, "alphabet").disabled);
      assert.deepEqual([...byId(window, "roles").children].map(button => button.dataset.state), ["q1", "q2"]);
    });

    it("leaves the list empty for a non-deterministic machine and explains its format", function() {
      const window = loadPage();
      define(window, { ...README_NFA, transitions: [] });
      assert.equal(byId(window, "transitions").value, "");
      assert.isTrue(byId(window, "hint-dfa").hidden);
      assert.isFalse(byId(window, "hint-nfa").hidden);
      assert.equal(byId(window, "transitions").getAttribute("aria-describedby"), "hint-nfa");
    });

    it("cycles a state through start, start and accept, accept, none", function() {
      const window = loadPage();
      define(window, { ...README_DFA, start: "q1", accepts: [] });
      const [q1, q2] = byId(window, "roles").children;
      assert.equal(q1.dataset.role, "start");
      q2.click();
      assert.equal(q2.dataset.role, "accept", "a second state can't be a start state too");
      q1.click();
      assert.equal(q1.dataset.role, "both");
      assert.include(q1.textContent, "start + accept");
      q1.click();
      assert.equal(q1.dataset.role, "accept");
      q1.click();
      assert.equal(q1.dataset.role, "none");
      q1.click();
      assert.equal(q1.dataset.role, "start", "with no start state left, the next press makes one");
    });

    it("draws the README's DFA and steps an accepted word to Accepted", async function() {
      const window = loadPage();
      await generate(window, README_DFA);

      const titles = [...byId(window, "graph").querySelectorAll("g.node title")].map(node => node.textContent);
      assert.includeMembers(titles, ["q1", "q2"]);
      const svg = byId(window, "graph").querySelector("svg");
      assert.equal(svg.getAttribute("role"), "img");
      assert.equal(svg.getAttribute("aria-label"), "State diagram. States: q1, q2. Start state: q1. Accept states: q1.");
      assert.isFalse(svg.hasAttribute("width"), "the drawing takes its size from the panel");
      assert.equal(textOf(window, "step-message"), "DFA ready. Type an input, then run it or step through it.");
      assert.isFalse(byId(window, "run-controls").hidden);
      assert.isTrue(byId(window, "transitions").disabled);
      assert.isTrue(byId(window, "generate").disabled);

      byId(window, "input").value = "10";
      click(window, "step-once");
      assert.equal(textOf(window, "step-message"), "Started in state q1.");
      assert.deepEqual(current(window), ["q1"]);
      assert.deepEqual(taken(window), []);

      click(window, "step-once");
      assert.equal(textOf(window, "step-message"), "Read symbol 1 of 2 (“1”): now in state q2.");
      assert.deepEqual(current(window), ["q2"]);
      assert.deepEqual(taken(window), ["q1->q2"]);
      assert.equal(textOf(window, "result"), "");

      click(window, "step-once");
      assert.deepEqual(current(window), ["q1"]);
      assert.deepEqual(taken(window), ["q2->q1"]);
      assert.equal(textOf(window, "result"), "Accepted ✓");
      assert.equal(byId(window, "result").dataset.verdict, "accepted");
    });

    it("runs a whole input at once", async function() {
      const window = loadPage();
      await generate(window, README_DFA);
      assert.equal(runInput(window, "1"), "Rejected ✘");
      assert.deepEqual(current(window), ["q2"]);
      assert.equal(textOf(window, "step-message"), "Ended in state q2.");
      assert.equal(runInput(window, "10"), "Accepted ✓");
      assert.equal(runInput(window, ""), "Accepted ✓");
    });

    it("steps through a whole input on its own", async function() {
      const window = loadPage();
      await generate(window, README_DFA);
      byId(window, "input").value = "110";
      click(window, "step-all");
      assert.isTrue(byId(window, "run").disabled, "nothing else starts while it plays");
      assert.isTrue(byId(window, "step-once").disabled);
      await until(() => textOf(window, "result") !== "", "the verdict");
      assert.equal(textOf(window, "result"), "Accepted ✓");
      assert.equal(textOf(window, "step-message"), "Read symbol 3 of 3 (“0”): now in state q1.");
      assert.isFalse(byId(window, "run").disabled);
    });

    it("stops a play-through on Reset and empties the input", async function() {
      const window = loadPage();
      await generate(window, README_DFA);
      byId(window, "input").value = "1111";
      click(window, "step-all");
      click(window, "reset");
      for (let turn = 0; turn < 10; turn += 1) await tick();
      assert.equal(byId(window, "input").value, "");
      assert.equal(textOf(window, "result"), "");
      assert.equal(textOf(window, "step-message"), "");
      assert.deepEqual(current(window), []);
      assert.isTrue(byId(window, "reset").disabled);
    });

    it("handles a non-deterministic machine with ε-moves", async function() {
      const window = loadPage();
      await generate(window, README_NFA);
      assert.equal(runInput(window, "011"), "Accepted ✓");
      assert.equal(runInput(window, "0100"), "Rejected ✘");

      byId(window, "input").value = "1";
      click(window, "step-once");
      click(window, "step-once");
      assert.deepEqual(current(window), ["q1", "q2", "q3"]);
      assert.deepEqual(taken(window), ["q1->q1", "q1->q2", "q2->q3"], "the ε-move out of q2 was followed too");
      assert.equal(textOf(window, "result"), "Accepted ✓");

      stepThrough(window, "011");
      assert.equal(
        textOf(window, "step-message"),
        "Read symbol 3 of 3 (“1”): now in states q1, q2, q3 and q4.",
        "states are named in the order they were defined"
      );
    });

    it("says when a non-deterministic machine has no state left", async function() {
      const window = loadPage();
      const deadEnd = {
        states: "a,b",
        alphabet: "0,1",
        nondeterministic: true,
        transitions: ["a,0,[b|b]"],
        start: "a",
        accepts: ["b"],
      };
      await generate(window, deadEnd);
      assert.equal(runInput(window, "1"), "Rejected ✘");
      assert.equal(textOf(window, "step-message"), "No state is active at the end.");
      assert.deepEqual(current(window), []);
      assert.equal(stepThrough(window, "10"), "Rejected ✘");
      assert.equal(textOf(window, "step-message"), "Read symbol 2 of 2 (“0”): no state is active.");
      assert.isFalse(original.simulateFSA("10", buildDirectly(deadEnd)));
    });

    it("starts a non-deterministic machine in every state reachable without input", async function() {
      const window = loadPage();
      await generate(window, EPSILON_FROM_START);
      byId(window, "input").value = "";
      click(window, "step-once");
      assert.equal(textOf(window, "step-message"), "Started in states a and b.");
      assert.deepEqual(current(window), ["a", "b"]);
      assert.deepEqual(taken(window), ["a->b"]);
      click(window, "step-once");
      assert.equal(textOf(window, "result"), "Accepted ✓");
      assert.equal(runInput(window, ""), "Accepted ✓");
      assert.isTrue(original.simulateFSA("", buildDirectly(EPSILON_FROM_START)));
    });

    it("takes a space as a symbol when the alphabet has one", async function() {
      const window = loadPage();
      const withSpace = {
        states: "p,q",
        alphabet: "a, ",
        nondeterministic: false,
        transitions: ["p,a,p", "p, ,q", "q,a,q", "q, ,p"],
        start: "p",
        accepts: ["q"],
      };
      await generate(window, withSpace);
      byId(window, "input").value = "a ";
      click(window, "step-once");
      click(window, "step-once");
      click(window, "step-once");
      assert.deepEqual(current(window), ["q"]);
      assert.deepEqual(taken(window), ["p->q"]);
      assert.equal(textOf(window, "result"), "Accepted ✓");
      assert.isTrue(original.simulateFSA("a ", buildDirectly(withSpace)));
    });

    it("gives the verdict fas-js 1.3.1 gives, for a run and for a step-through", async function() {
      const cases = [
        [README_DFA, ["", "0", "1", "10", "11", "0110", "10101", "111000"]],
        [README_NFA, ["", "0", "1", "01", "011", "0100", "1011", "0001", "110"]],
        [EPSILON_FROM_START, ["", "0", "000"]],
      ];
      for (const [definition, inputs] of cases) {
        const window = loadPage();
        await generate(window, definition);
        const fsa = buildDirectly(definition);
        for (const input of inputs) {
          const expected = original.simulateFSA(input, fsa) ? "Accepted ✓" : "Rejected ✘";
          assert.equal(runInput(window, input), expected, `run "${input}" on ${definition.states}`);
          assert.equal(stepThrough(window, input), expected, `step "${input}" on ${definition.states}`);
        }
      }
    });

    it("explains every problem in words, never with an error code", async function() {
      const problems = [];
      const note = window => {
        const shown = [...window.document.querySelectorAll(".error:not([hidden])")].map(node => node.textContent);
        assert.isNotEmpty(shown, "an error should be on screen");
        problems.push(...shown);
        assert.notMatch(window.document.body.textContent, /E-\d{3}/);
        return shown.join(" ");
      };

      let window = loadPage();
      click(window, "apply");
      assert.equal(note(window), "Enter at least one state name.");
      byId(window, "states").value = "q1,q2";
      click(window, "apply");
      assert.equal(note(window), "Enter at least one symbol.");
      byId(window, "alphabet").value = "0,10";
      click(window, "apply");
      assert.equal(note(window), "Each symbol must be exactly one character.");
      assert.isTrue(byId(window, "details").hidden, "nothing is applied while a field is wrong");

      // fas-js 1.3.1 also logs the details of a definition it rejects; the tests do not need them.
      const generateQuietly = target => {
        const { error } = console;
        console.error = () => {};
        try {
          click(target, "generate");
        } finally {
          console.error = error;
        }
      };

      window = loadPage();
      define(window, { ...README_DFA, start: "q1", accepts: [] });
      byId(window, "roles").children[0].click();
      byId(window, "roles").children[0].click();
      generateQuietly(window);
      assert.equal(note(window), "Choose a start state first.");

      window = loadPage();
      define(window, { ...README_DFA, transitions: ["q1,1,q2"] });
      generateQuietly(window);
      assert.equal(note(window), "Some transitions are missing. Every state needs one line for each symbol.");

      window = loadPage();
      define(window, { ...README_DFA, transitions: ["q1,1,q9", "q1,0,q1", "q2,0,q1", "q2,1,q2"] });
      generateQuietly(window);
      assert.include(note(window), "names a state that isn't in the list");

      window = loadPage();
      define(window, { ...README_DFA, transitions: ["q1,1"] });
      generateQuietly(window);
      assert.include(note(window), "Line 1 needs three parts");

      window = loadPage();
      await generate(window, README_DFA);
      runInput(window, "012");
      assert.equal(note(window), "“2” is not in the alphabet.");
      assert.equal(textOf(window, "result"), "");

      assert.isAbove(problems.length, 7);
    });

    it("says so when a machine can't be drawn, and still runs it", async function() {
      const window = loadPage();
      define(window, { ...README_DFA, states: "node,q2", transitions: ["node,0,node", "node,1,q2", "q2,0,node", "q2,1,q2"], start: "node", accepts: ["node"] });
      click(window, "generate");
      await until(() => /can't be drawn/.test(byId(window, "graph").textContent), "the message");
      assert.isNull(byId(window, "graph").querySelector("svg"));
      assert.equal(runInput(window, "10"), "Accepted ✓");
    });

    it("keeps only drawing elements from the graph markup", async function() {
      const hostile =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" onload="window.bad = 1">' +
        '<script>window.bad = 1</script><g class="node" onclick="window.bad = 1"><title>q1</title>' +
        '<a href="javascript:window.bad = 1"><text>q1</text></a>' +
        '<ellipse cx="1" cy="1" rx="1" ry="1" stroke="black" fill="url(https://elsewhere.invalid/paint.svg#p)"/></g></svg>';
      const window = loadPage({ drawWith: () => ({ dot: () => hostile }) });
      await generate(window, README_DFA);
      const svg = byId(window, "graph").querySelector("svg");
      assert.isNull(svg.querySelector("script, a"));
      assert.isFalse(svg.hasAttribute("onload"));
      assert.isFalse(svg.querySelector("g").hasAttribute("onclick"));
      const ellipse = svg.querySelector("ellipse");
      assert.equal(ellipse.getAttribute("stroke"), "black");
      assert.isFalse(ellipse.hasAttribute("fill"), "nothing in the drawing may point at another file");
      assert.isUndefined(window.bad);
    });

    it("says so when the drawing tool does not load, and still runs the machine", async function() {
      const window = loadPage({
        drawWith: () => {
          throw new Error("offline");
        },
      });
      define(window, README_DFA);
      click(window, "generate");
      await until(() => /did not load/.test(byId(window, "graph").textContent), "the message");
      assert.equal(runInput(window, "10"), "Accepted ✓");
    });

    it("returns to an empty form on Clear", async function() {
      const window = loadPage();
      await generate(window, README_DFA);
      runInput(window, "10");
      click(window, "clear");
      assert.equal(byId(window, "states").value, "");
      assert.equal(byId(window, "alphabet").value, "");
      assert.isFalse(byId(window, "states").disabled);
      assert.isTrue(byId(window, "details").hidden);
      assert.isTrue(byId(window, "run-controls").hidden);
      assert.isNull(byId(window, "graph").querySelector("svg"));
      assert.equal(byId(window, "roles").children.length, 0);
      assert.equal(byId(window, "app").dataset.view, "define");
    });

    it("switches between the two panels on a narrow screen", async function() {
      const window = loadPage();
      assert.equal(byId(window, "app").dataset.view, "define");
      click(window, "view-run");
      assert.equal(byId(window, "app").dataset.view, "run");
      assert.equal(byId(window, "view-run").getAttribute("aria-pressed"), "true");
      assert.equal(byId(window, "view-define").getAttribute("aria-pressed"), "false");
      click(window, "view-define");
      await generate(window, README_DFA);
      assert.equal(byId(window, "app").dataset.view, "run", "the graph is shown once it is drawn");
    });
  });

  describe("rules (logic.js)", function() {
    let rules;

    before(function() {
      const sandbox = {};
      runInNewContext(read("logic.js"), sandbox, { filename: "demo/v1/logic.js" });
      rules = sandbox.fasV1;
    });

    it("reads comma-separated fields as typed", function() {
      assert.deepEqual(rules.readStates("q1,q2,q1"), { states: ["q1", "q2"], error: "" });
      assert.isNotEmpty(rules.readStates("").error);
      assert.isNotEmpty(rules.readStates("q1,,q2").error);
      assert.deepEqual(rules.readAlphabet("a, ,b", true).alphabet, ["a", " ", "b"], "a space is a symbol");
      assert.equal(rules.readAlphabet("a, ,b", true).error, "");
      assert.isNotEmpty(rules.readAlphabet("", false).error);
      assert.isNotEmpty(rules.readAlphabet("0,,1", true).error);
      assert.equal(rules.readAlphabet("0,,1", false).error, "", "an NFA may list the empty string");
      assert.isNotEmpty(rules.readAlphabet("0,ab", false).error);
    });

    it("reads transition lines for both kinds of machine", function() {
      assert.deepEqual(rules.parseTransitions("q1,0,q2\n\nq2,1,q1\n", true), [
        { from: "q1", to: "q2", input: "0" },
        { from: "q2", to: "q1", input: "1" },
      ]);
      assert.deepEqual(rules.parseTransitions("q1,1,[q1|q2]\nq2,,q3", false), [
        { from: "q1", to: "q1,q2", input: "1" },
        { from: "q2", to: "q3", input: "" },
      ]);
      assert.deepEqual(rules.parseTransitions("q1,1,[q1|q2]", true), [{ from: "q1", to: "[q1|q2]", input: "1" }]);
      assert.throws(() => rules.parseTransitions("q1,0,q2\nq2", true), /^Line 2 needs three parts/);
    });

    it("names the edges just followed", function() {
      const edges = [
        rules.readEdge("qi->a", ""),
        rules.readEdge("a->b", "ε"),
        rules.readEdge("b->b", "0,1"),
        rules.readEdge("b->c", "1"),
        rules.readEdge("c->a", "ε"),
      ];
      const names = step => rules.edgesTaken(edges, step).map(edge => `${edge.from}->${edge.to}`);
      assert.deepEqual(names({ previous: [], current: ["a", "b"], symbol: null, nondeterministic: true }), ["a->b"]);
      assert.deepEqual(names({ previous: ["a", "b"], current: ["b"], symbol: "0", nondeterministic: true }), ["b->b"]);
      assert.deepEqual(
        names({ previous: ["a", "b"], current: ["a", "b", "c"], symbol: "1", nondeterministic: true }),
        ["a->b", "b->b", "b->c", "c->a"]
      );
      assert.deepEqual(names({ previous: ["b"], current: ["b"], symbol: "0", nondeterministic: false }), ["b->b"]);
      assert.isNull(rules.readEdge("no arrow", "x"));
    });

    it("has a sentence for every code fas-js 1.3.1 can report", function() {
      const codes = (read(ORIGINAL_BUNDLE).match(/"E-\d{3}"/g) ?? []).map(code =>
        code.slice(1, -1)
      );
      assert.isAbove(codes.length, 10);
      const definition = { states: ["q1", "q2"], alphabet: ["0", "1", ""], deterministic: true };
      for (const code of codes) {
        const sentence = rules.explainCreateError(new Error(code), definition);
        assert.match(sentence, /^[A-Z].*\.$/, code);
        assert.notMatch(sentence, /E-\d{3}/, code);
        assert.notMatch(rules.explainRunError(new Error(code)), /E-\d{3}/, code);
      }
      assert.include(rules.explainCreateError(new Error("E-009"), definition), "The symbols are: 0, 1.");
      assert.notEqual(
        rules.explainCreateError(new Error("E-008"), definition),
        rules.explainCreateError(new Error("E-008"), { ...definition, deterministic: false })
      );
    });
  });
});
