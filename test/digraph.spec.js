/**
 * generateDigraph(): exact DOT text for machines with unusual names and symbols. Each text is
 * also read back through Graphviz and compared with the machine it was generated from.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { assert } from "chai";
import { Graphviz } from "@hpcc-js/wasm-graphviz";

import { createFSA } from "../src/modules";
import { digraphCases } from "./helpers/digraphCases.js";
import { readDot } from "./helpers/readDot.js";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "digraph");

const build = (testCase) => createFSA(...structuredClone(testCase.args));

// The part of a createFSA definition its start state can reach, worked out from the arguments alone
function reachablePart([, , transitions, start, accepts]) {
  const isNfa = transitions.some((t) => t.to.includes(",") || t.input === "");
  const edges = transitions.flatMap((t) => (isNfa ? t.to.split(",") : [t.to]).map((to) => ({ from: t.from, to, input: t.input })));

  const reached = new Set([start]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const edge of edges) {
      if (reached.has(edge.from) && !reached.has(edge.to)) {
        reached.add(edge.to);
        grew = true;
      }
    }
  }
  return {
    states: [...reached],
    start,
    accepts: accepts.filter((name) => reached.has(name)),
    transitions: edges.filter((edge) => reached.has(edge.from)),
  };
}

// Everything the getters expose, by name, in the order the automaton holds it
const snapshot = (fsa) => ({
  states: [...fsa.getStates()].map((state) => state.name),
  alphabet: [...fsa.getAlphabet().sigma],
  transitions: [...fsa.getTFunc()].map((t) => [t.origin.name, t.input, t.dest.name]),
  start: fsa.getStartState().name,
  accepts: [...fsa.getAcceptStates()].map((state) => state.name),
});

// Runs fn and returns what it printed through console
function printedBy(fn) {
  const printed = [];
  const original = { log: console.log, warn: console.warn, error: console.error };
  for (const method of Object.keys(original)) console[method] = (...args) => printed.push([method, ...args]);
  try {
    fn();
  } finally {
    Object.assign(console, original);
  }
  return printed;
}

describe("generateDigraph()", function () {
  let graphviz;

  before(async function () {
    this.timeout(20000);
    graphviz = await Graphviz.load();
  });

  for (const testCase of digraphCases) {
    describe(`${testCase.fixture}: ${testCase.about}`, function () {
      it("returns the pinned text, byte for byte", function () {
        const expected = readFileSync(join(FIXTURES, `${testCase.fixture}.dot`), "utf8");
        assert.equal(build(testCase).generateDigraph(), expected);
      });

      it("is DOT that Graphviz reads back as the reachable part of the machine", function () {
        const read = readDot(graphviz, build(testCase).generateDigraph());
        const expected = reachablePart(testCase.args);

        assert.sameMembers(read.states, expected.states);
        assert.equal(read.states.length, expected.states.length, "a state is drawn twice");
        assert.equal(read.start, expected.start);
        assert.sameMembers(read.accepts, expected.accepts);
        assert.sameDeepMembers(read.transitions, expected.transitions);
        assert.equal(read.transitions.length, expected.transitions.length, "a transition is drawn twice");
      });

      it("leaves the machine as it was, prints nothing, and returns the same text again", function () {
        const fsa = build(testCase);
        const before = snapshot(fsa);

        let first;
        const printed = printedBy(() => {
          first = fsa.generateDigraph();
        });

        assert.deepEqual(snapshot(fsa), before);
        assert.isEmpty(printed);
        assert.equal(fsa.generateDigraph(), first);
      });
    });
  }

  it("draws both edges when two pairs of states share the same joined names", function () {
    const dot = build(digraphCases.find((c) => c.fixture === "colliding-names")).generateDigraph();
    assert.include(dot, 'a -> bc [ label = "x" ];');
    assert.include(dot, 'ab -> c [ label = "x" ];');
    assert.notInclude(dot, "x,x");
  });

  it("keeps unreachable states in the machine and out of the drawing", function () {
    const fsa = build(digraphCases.find((c) => c.fixture === "unreachable-states"));
    const dot = fsa.generateDigraph();

    assert.notInclude(dot, "dead");
    assert.notInclude(dot, "lost");
    assert.sameMembers(
      [...fsa.getStates()].map((state) => state.name),
      ["q1", "q2", "dead", "lost"]
    );
    assert.sameMembers(
      [...fsa.getAcceptStates()].map((state) => state.name),
      ["q2", "dead"]
    );
    assert.equal(fsa.getTFunc().size, 8);
  });

  it("gives the start marker a name no state has", function () {
    const read = readDot(graphviz, build(digraphCases.find((c) => c.fixture === "start-marker")).generateDigraph());
    assert.sameMembers(read.states, ["qi", "qi_", "b"]);
    assert.equal(read.start, "qi");
  });

  it("writes plain names and symbols exactly as before", function () {
    const dot = createFSA(
      ["q1", "q2"],
      "ab",
      [
        { from: "q1", to: "q2", input: "a" },
        { from: "q1", to: "q2", input: "b" },
        { from: "q2", to: "q1", input: "a" },
        { from: "q2", to: "q2", input: "b" },
      ],
      "q1",
      ["q2"]
    ).generateDigraph();

    assert.equal(
      dot,
      [
        "digraph fsa {",
        "          q1",
        "\tq2 [shape = doublecircle];",
        "          rankdir=LR;",
        "          node [shape = point ]; qi;",
        "          node [shape = circle];",
        "          qi -> q1;",
        '          q1 -> q2 [ label = "a,b" ];',
        '\tq2 -> q1 [ label = "a" ];',
        '\tq2 -> q2 [ label = "b" ];',
        "      }",
        "      ",
      ].join("\n")
    );
  });

  it("still draws a machine whose symbols are numbers instead of strings", function () {
    const dot = createFSA(
      ["p"],
      [1, 2],
      [
        { from: "p", to: "p", input: 1 },
        { from: "p", to: "p", input: 2 },
      ],
      "p",
      []
    ).generateDigraph();
    assert.include(dot, 'p -> p [ label = "1,2" ];');
  });

  it("draws a chain of 20,000 states without overflowing the call stack", function () {
    this.timeout(30000);
    const count = 20000;
    const states = Array.from({ length: count }, (_, i) => `s${i}`);
    const transitions = states.map((from, i) => ({ from, to: states[Math.min(i + 1, count - 1)], input: "a" }));
    const dot = createFSA(states, ["a"], transitions, "s0", [states[count - 1]]).generateDigraph();

    assert.include(dot, `s${count - 2} -> s${count - 1} [ label = "a" ];`);
    assert.include(dot, `s${count - 1} [shape = doublecircle];`);
    assert.equal(dot.split("\n").length, 2 * count + 7);
  });
});
