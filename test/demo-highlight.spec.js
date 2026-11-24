/**
 * The simulator's drawing (demo/drawing.js): what it puts on the page from Graphviz's output,
 * and how stepping marks states and edges in it without drawing the graph again.
 */
import { Graphviz } from "@hpcc-js/wasm-graphviz";
import { assert } from "chai";
import { JSDOM } from "jsdom";

import * as fas from "../src/modules";
import { draw, mark, withFont } from "../demo/drawing.js";
import { buildMachine, checkDefinition } from "../demo/sim/machine.js";
import { trace } from "../demo/sim/run.js";
import { digraphCases } from "./helpers/digraphCases.js";

const README_DFA = {
  states: ["s", "q1", "q2", "r1", "r2"],
  alphabet: "ab",
  transitions: [
    { from: "s", to: "q1", input: "a" },
    { from: "s", to: "r1", input: "b" },
    { from: "q1", to: "q1", input: "a" },
    { from: "q1", to: "q2", input: "b" },
    { from: "q2", to: "q1", input: "a" },
    { from: "q2", to: "q2", input: "b" },
    { from: "r1", to: "r2", input: "a" },
    { from: "r1", to: "r1", input: "b" },
    { from: "r2", to: "r2", input: "a" },
    { from: "r2", to: "r1", input: "b" },
  ],
  start: "s",
  accepts: ["q1", "r1"],
};

describe("simulator drawing", function () {
  let graphviz;
  let window;

  before(async function () {
    this.timeout(20000);
    graphviz = await Graphviz.load();
  });

  beforeEach(function () {
    window = new JSDOM("<!DOCTYPE html><div id='graph'></div>").window;
  });

  const marked = (drawing) => ({
    states: [...drawing.states].filter(([, element]) => element.classList.contains("is-current")).map(([name]) => name),
    edges: drawing.edges.filter((edge) => edge.element.classList.contains("is-taken")).map((edge) => `${edge.from}->${edge.to}`),
  });

  it("adds one font line after the opening brace and changes nothing else", function () {
    const dot = fas.createFSA(...structuredClone(digraphCases[0].args)).generateDigraph();
    const lines = withFont(dot).split("\n");

    assert.equal(lines[0], "digraph fsa {");
    assert.equal(lines[1], 'node [fontname="Helvetica"]; edge [fontname="Helvetica"];');
    assert.equal([lines[0], ...lines.slice(2)].join("\n"), dot);
    assert.equal(withFont("not a graph at all"), "not a graph at all");
  });

  it("finds every drawn state and edge by name, whatever the names are", function () {
    for (const testCase of digraphCases) {
      const fsa = fas.createFSA(...structuredClone(testCase.args));
      const drawing = draw(graphviz, window, fsa.generateDigraph(), "a machine");
      const [states, , transitions] = testCase.args;

      for (const [name, element] of drawing.states) {
        assert.include(states, name, testCase.fixture);
        assert.equal(element.localName, "g");
        assert.isTrue(element.classList.contains("node"));
      }
      for (const edge of drawing.edges) {
        assert.isTrue(
          transitions.some((t) => t.from === edge.from && t.to.split(",").includes(edge.to)) || transitions.some((t) => t.from === edge.from && t.to === edge.to),
          `${testCase.fixture}: ${edge.from} -> ${edge.to}`
        );
        assert.isTrue(edge.element.classList.contains("edge"));
      }
      assert.isAbove(drawing.states.size, 0, testCase.fixture);
      assert.lengthOf(drawing.svg.querySelectorAll(".start-marker"), 1, testCase.fixture);
    }
  });

  it("marks the states the machine is in and the edges it just took, step by step", function () {
    const machine = buildMachine(fas, checkDefinition(README_DFA));
    const drawing = draw(graphviz, window, machine.fsa.generateDigraph(), "the README machine");
    const run = trace(fas, machine, ["a", "b", "b", "a"]);

    const seen = run.steps.map((step) => {
      mark(drawing, step.after, step.edges);
      return marked(drawing);
    });
    assert.deepEqual(seen, [
      { states: ["s"], edges: [] },
      { states: ["q1"], edges: ["s->q1"] },
      { states: ["q2"], edges: ["q1->q2"] },
      { states: ["q2"], edges: ["q2->q2"] },
      { states: ["q1"], edges: ["q2->q1"] },
    ]);

    mark(drawing, [], []);
    assert.deepEqual(marked(drawing), { states: [], edges: [] });
  });

  it("marks every active state of an NFA and the ε edges inside the set", function () {
    const machine = buildMachine(
      fas,
      checkDefinition({
        states: ["start", "as", "bs"],
        alphabet: "ab",
        transitions: [
          { from: "start", to: "as", input: "" },
          { from: "start", to: "bs", input: "" },
          { from: "as", to: "as", input: "a" },
          { from: "bs", to: "bs", input: "b" },
        ],
        start: "start",
        accepts: ["as", "bs"],
      })
    );
    const drawing = draw(graphviz, window, machine.fsa.generateDigraph(), "an NFA");
    const run = trace(fas, machine, ["a"]);

    mark(drawing, run.steps[0].after, run.steps[0].edges);
    assert.sameMembers(marked(drawing).states, ["start", "as", "bs"]);
    assert.sameMembers(marked(drawing).edges, ["start->as", "start->bs"]);

    mark(drawing, run.steps[1].after, run.steps[1].edges);
    assert.deepEqual(marked(drawing), { states: ["as"], edges: ["as->as"] });
  });

  it("ignores an edge the drawing does not show", function () {
    const machine = buildMachine(fas, checkDefinition(README_DFA));
    const drawing = draw(graphviz, window, machine.fsa.generateDigraph(), "the README machine");

    mark(drawing, ["q1", "nowhere"], [{ from: "s", to: "q1", input: "a" }, { from: "q1", to: "nowhere", input: "a" }, { from: "s", to: "s", input: "" }]);
    assert.deepEqual(marked(drawing), { states: ["q1"], edges: ["s->q1"] });
  });

  it("puts a drawing on the page that fits its panel and describes itself", function () {
    const machine = buildMachine(fas, checkDefinition(README_DFA));
    const { svg } = draw(graphviz, window, machine.fsa.generateDigraph(), "State diagram. States: s, q1.");

    assert.equal(svg.ownerDocument, window.document);
    assert.equal(svg.getAttribute("role"), "img");
    assert.equal(svg.getAttribute("aria-label"), "State diagram. States: s, q1.");
    assert.isNull(svg.getAttribute("width"));
    assert.isNull(svg.getAttribute("height"));
    assert.match(svg.getAttribute("viewBox"), /^[\d.\s-]+$/);
    assert.match(svg.style.maxWidth, /^\d+px$/);
  });

  it("keeps only the parts of a state diagram from what Graphviz returns", function () {
    const hostile = {
      dot: (text, format) =>
        format === "json"
          ? JSON.stringify({ objects: [], edges: [] })
          : '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" onload="window.hacked = true"><script>window.hacked = true</script><g id="node1" class="node" onclick="window.hacked = true"><title>a</title><ellipse cx="1" cy="1" rx="1" ry="1" fill="url(#x)"/><a href="https://example.com"><text>a</text></a><foreignObject><p>x</p></foreignObject></g></svg>',
    };
    const { svg } = draw(hostile, window, "digraph { a }", "a machine");
    const names = [...svg.querySelectorAll("*")].map((element) => element.localName);

    assert.sameMembers([...new Set(names)], ["g", "title", "ellipse"]);
    assert.isNull(svg.getAttribute("onload"));
    assert.isNull(svg.querySelector("g").getAttribute("onclick"));
    assert.isNull(svg.querySelector("ellipse").getAttribute("fill"));
    assert.isUndefined(window.hacked);
  });

  it("throws when Graphviz cannot read the text or returns no drawing", function () {
    assert.throws(() => draw(graphviz, window, "digraph { a -> ", "broken"));
    const empty = { dot: (text, format) => (format === "json" ? "{}" : "nothing here") };
    assert.throws(() => draw(empty, window, "digraph { a }", "empty"), /no drawing/);
  });
});
