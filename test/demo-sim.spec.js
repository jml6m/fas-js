/**
 * The simulator's logic (demo/sim): reading definitions and input, tracing a run, and reading a
 * machine back from generateDigraph() text. The library is the judge throughout: every verdict
 * and state set the simulator shows is compared with simulateFSA and stepOnceFSA.
 */
import { assert } from "chai";
import { Graphviz } from "@hpcc-js/wasm-graphviz";

import * as fas from "../src/modules";
import { Problem, buildMachine, checkDefinition, readDefinition } from "../demo/sim/machine.js";
import { readInput, trace, verdict } from "../demo/sim/run.js";
import { definitionFromGraph, readGraph } from "../demo/sim/dot.js";
import { digraphCases } from "./helpers/digraphCases.js";

const { createFSA, simulateFSA } = fas;

// Small deterministic generator, so every run sees the same machines
function random(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const next = random(441);
const pick = (list) => list[Math.floor(next() * list.length)];

function randomDefinition(nfa) {
  const states = Array.from({ length: 1 + Math.floor(next() * 7) }, (_, i) => `q${i}`);
  const alphabet = pick([["0", "1"], ["a", "b", "c"], ["up", "down"], ["🙂", "x"]]);
  const transitions = [];
  for (const from of states) {
    for (const input of alphabet) {
      if (!nfa) {
        transitions.push({ from, to: pick(states), input });
      } else if (next() < 0.6) {
        transitions.push({ from, to: [...new Set([pick(states), pick(states)])].join(","), input });
      }
    }
    if (nfa && next() < 0.5) transitions.push({ from, to: pick(states), input: "" });
  }
  if (nfa) transitions.push({ from: states[0], to: pick(states), input: "" });
  return { states, alphabet, transitions, start: pick(states), accepts: states.filter(() => next() < 0.4) };
}

// The ε-closure of a set of state names, searched from the definition's edges
function closure(machine, names) {
  const reached = new Set(names);
  for (let grew = true; grew; ) {
    grew = false;
    for (const edge of machine.edges) {
      if (edge.input === "" && reached.has(edge.from) && !reached.has(edge.to)) {
        reached.add(edge.to);
        grew = true;
      }
    }
  }
  return [...reached];
}

const wordsUpTo = (alphabet, length) => {
  let words = [[]];
  const all = [[]];
  for (let i = 0; i < length; i++) {
    words = words.flatMap((word) => alphabet.map((symbol) => [...word, symbol]));
    all.push(...words);
  }
  return all;
};

const problemOf = (fn) => {
  try {
    fn();
  } catch (error) {
    assert.instanceOf(error, Problem);
    assert.notMatch(error.message, /E-\d{3}/, "an error code reached the reader");
    return error.message;
  }
  assert.fail("expected a Problem");
};

describe("Simulator logic", function () {
  describe("reading typed input", function () {
    it("takes one symbol per code point when every symbol is one code point", function () {
      assert.deepEqual(readInput("0110", ["0", "1"]), ["0", "1", "1", "0"]);
      assert.deepEqual(readInput("a🙂b", ["a", "b", "🙂"]), ["a", "🙂", "b"]);
      assert.deepEqual(readInput("", ["0", "1"]), []);
      assert.deepEqual(readInput("0 1", ["0", "1"]), ["0", " ", "1"]);
    });

    it("takes symbols separated by spaces when a symbol is longer than one code point", function () {
      assert.deepEqual(readInput("up down  up", ["up", "down"]), ["up", "down", "up"]);
      assert.deepEqual(readInput("  up\tdown\n", ["up", "down"]), ["up", "down"]);
      assert.deepEqual(readInput("", ["up", "down"]), []);
      assert.deepEqual(readInput("x up", ["x", "up"]), ["x", "up"]);
    });
  });

  describe("reading a definition", function () {
    const good = { states: ["q1", "q2"], alphabet: "01", transitions: [{ from: "q1", to: "q2", input: "0" }], start: "q1", accepts: ["q2"] };

    it("returns the alphabet as symbols and accepts as a list", function () {
      const definition = readDefinition(JSON.stringify({ ...good, alphabet: "0🙂", accepts: "q2" }));
      assert.deepEqual(definition.alphabet, ["0", "🙂"]);
      assert.deepEqual(definition.accepts, ["q2"]);
    });

    it("explains JSON that cannot be read, in a sentence", function () {
      assert.match(problemOf(() => readDefinition("{ states: [")), /not valid JSON/);
      assert.match(problemOf(() => readDefinition("[1, 2]")), /one JSON object/);
      assert.match(problemOf(() => readDefinition("null")), /one JSON object/);
    });

    it("explains a missing or malformed part, in a sentence", function () {
      for (const key of ["states", "alphabet", "transitions", "start", "accepts"]) {
        const broken = { ...good };
        delete broken[key];
        assert.include(problemOf(() => checkDefinition(broken)), `"${key}"`);
      }
      assert.match(problemOf(() => checkDefinition({ ...good, states: [] })), /"states"/);
      assert.match(problemOf(() => checkDefinition({ ...good, states: ["q1", 2] })), /"states"/);
      assert.match(problemOf(() => checkDefinition({ ...good, alphabet: "" })), /"alphabet"/);
      assert.match(problemOf(() => checkDefinition({ ...good, alphabet: ["a", ""] })), /"alphabet"/);
      assert.match(problemOf(() => checkDefinition({ ...good, transitions: [{ from: "q1", to: "q2" }] })), /"from", "to" and "input"/);
      assert.match(problemOf(() => checkDefinition({ ...good, transitions: [null] })), /"from", "to" and "input"/);
      assert.match(problemOf(() => checkDefinition({ ...good, start: 3 })), /"start"/);
      assert.match(problemOf(() => checkDefinition({ ...good, accepts: 3 })), /"accepts"/);
    });
  });

  describe("building a machine", function () {
    const dfa = {
      states: ["q1", "q2"],
      alphabet: ["a", "b"],
      transitions: [
        { from: "q1", to: "q2", input: "a" },
        { from: "q1", to: "q1", input: "b" },
        { from: "q2", to: "q1", input: "a" },
        { from: "q2", to: "q2", input: "b" },
      ],
      start: "q1",
      accepts: ["q2"],
    };
    const build = (changes) => buildMachine(fas, checkDefinition({ ...dfa, ...changes }));

    it("builds what the library builds", function () {
      assert.equal(build({}).type, "DFA");
      assert.equal(build({ transitions: [{ from: "q1", to: "q1,q2", input: "a" }] }).type, "NFA");
    });

    it("lists an NFA's destinations as separate edges", function () {
      const machine = build({ transitions: [{ from: "q1", to: "q1,q2", input: "a" }] });
      assert.deepEqual(machine.edges, [
        { from: "q1", to: "q1", input: "a" },
        { from: "q1", to: "q2", input: "a" },
      ]);
    });

    it("says what is wrong in a sentence that names the culprit, never an error code", function () {
      const cases = [
        [{ alphabet: ["a", "b", "a"] }, /symbol "a" more than once/],
        [{ start: "q9" }, /start state "q9" is not in the list/],
        [{ accepts: ["q2", "q9"] }, /accept state "q9" is not in the list/],
        [{ transitions: [...dfa.transitions.slice(0, 3), { from: "q9", to: "q2", input: "b" }] }, /starts from "q9"/],
        [{ transitions: [...dfa.transitions.slice(0, 3), { from: "q2", to: "q9", input: "b" }] }, /goes to "q9"/],
        [{ transitions: dfa.transitions.slice(0, 3) }, /State "q2" has none for "b"/],
        [{ transitions: [...dfa.transitions.slice(0, 3), { from: "q2", to: "q2", input: "z" }] }, /symbol "z", which is not in the alphabet/],
        [{ transitions: [...dfa.transitions, { from: "q1", to: "q1", input: "a" }] }, /State "q1" has two transitions for the symbol "a"/],
        [{ transitions: [{ from: "q1", to: "q9", input: "" }] }, /goes to "q9"/],
        [{ transitions: [{ from: "q1", to: "q2", input: "z" }, { from: "q1", to: "q2", input: "" }] }, /symbol "z", which is not in the alphabet/],
      ];
      for (const [changes, expected] of cases) {
        assert.match(
          problemOf(() => build(changes)),
          expected
        );
      }
    });
  });

  describe("tracing a run", function () {
    it("starts an NFA in the ε-closure of its start state, so ε alone can accept", function () {
      const machine = buildMachine(fas, checkDefinition({ states: ["s", "acc"], alphabet: "a", transitions: [{ from: "s", to: "acc", input: "" }], start: "s", accepts: ["acc"] }));
      const run = trace(fas, machine, []);

      assert.isTrue(run.accepted);
      assert.deepEqual(run.steps[0].after, ["s", "acc"]);
      assert.deepEqual(run.steps[0].edges, [{ from: "s", to: "acc", input: "" }]);
      assert.match(verdict(run.accepted, []), /^Accepted: .*empty input/);
    });

    it("runs symbols longer than one character", function () {
      const machine = buildMachine(
        fas,
        checkDefinition({
          states: ["low", "high"],
          alphabet: ["up", "down"],
          transitions: [
            { from: "low", to: "high", input: "up" },
            { from: "low", to: "low", input: "down" },
            { from: "high", to: "high", input: "up" },
            { from: "high", to: "low", input: "down" },
          ],
          start: "low",
          accepts: ["high"],
        })
      );
      const run = trace(fas, machine, readInput("up down up", machine.definition.alphabet));

      assert.isTrue(run.accepted);
      assert.deepEqual(
        run.steps.map((step) => step.after),
        [["low"], ["high"], ["low"], ["high"]]
      );
    });

    it("steps over a symbol outside the Basic Multilingual Plane", function () {
      const machine = buildMachine(
        fas,
        checkDefinition({
          states: ["a", "b"],
          alphabet: "🙂x",
          transitions: [
            { from: "a", to: "b", input: "🙂" },
            { from: "a", to: "a", input: "x" },
            { from: "b", to: "b", input: "🙂" },
            { from: "b", to: "a", input: "x" },
          ],
          start: "a",
          accepts: ["b"],
        })
      );
      const run = trace(fas, machine, readInput("x🙂", machine.definition.alphabet));

      assert.isTrue(run.accepted);
      assert.deepEqual(run.steps[2], { symbol: "🙂", before: ["a"], after: ["b"], edges: [{ from: "a", to: "b", input: "🙂" }] });
    });

    it("stops at a symbol that is not in the alphabet and says so in a sentence", function () {
      const single = buildMachine(fas, checkDefinition({ states: ["a"], alphabet: "01", transitions: [{ from: "a", to: "a", input: "0" }, { from: "a", to: "a", input: "1" }], start: "a", accepts: [] }));
      const run = trace(fas, single, ["0", "7", "1"]);
      assert.isNull(run.accepted);
      assert.equal(run.at, 1);
      assert.equal(run.steps.length, 2);
      assert.equal(run.problem, '"7" is not in this machine\'s alphabet ("0", "1").');

      const multi = buildMachine(fas, checkDefinition({ states: ["a"], alphabet: ["up", "down"], transitions: [{ from: "a", to: "a,a", input: "up" }], start: "a", accepts: [] }));
      assert.equal(trace(fas, multi, ["updown"]).problem, '"updown" is not in this machine\'s alphabet ("up", "down"). Separate symbols with spaces.');
    });

    it("gives simulateFSA's verdict, and stepping reaches the same verdict, on 400 generated machines", function () {
      for (let i = 0; i < 400; i++) {
        const machine = buildMachine(fas, checkDefinition(randomDefinition(i % 2 === 1)));
        const { alphabet, accepts } = machine.definition;
        const symbols = Array.from({ length: Math.floor(next() * 8) }, () => pick(alphabet));

        const run = trace(fas, machine, symbols);
        assert.isNull(run.problem);
        assert.strictEqual(run.accepted, simulateFSA(symbols, machine.fsa));
        if (alphabet.every((symbol) => [...symbol].length === 1)) {
          assert.strictEqual(run.accepted, simulateFSA(symbols.join(""), machine.fsa));
        }

        const last = run.steps[run.steps.length - 1].after;
        assert.strictEqual(last.some((name) => accepts.includes(name)), run.accepted, JSON.stringify(machine.definition));
        assert.equal(run.steps.length, symbols.length + 1);
      }
    });

    it("highlights exactly the edges that lead from one set of states to the next", function () {
      for (let i = 0; i < 400; i++) {
        const machine = buildMachine(fas, checkDefinition(randomDefinition(i % 2 === 1)));
        const symbols = Array.from({ length: Math.floor(next() * 8) }, () => pick(machine.definition.alphabet));

        for (const step of trace(fas, machine, symbols).steps) {
          const before = new Set(step.before);
          const after = new Set(step.after);
          for (const edge of step.edges) {
            assert.deepInclude(machine.edges, edge);
            assert.isTrue(after.has(edge.to));
            assert.isTrue(edge.input === "" ? after.has(edge.from) : before.has(edge.from) && edge.input === step.symbol);
          }
          // Following the highlighted symbol edges, then ε, gives the states the library reports
          const moved = step.symbol === null ? step.before : step.edges.filter((edge) => edge.input !== "").map((edge) => edge.to);
          const expected = step.symbol !== null && moved.length === 0 ? [] : closure(machine, moved);
          assert.sameMembers(step.after, machine.type === "NFA" ? expected : moved);
        }
      }
    });
  });

  describe("reading generateDigraph() text back", function () {
    let graphviz;

    before(async function () {
      this.timeout(20000);
      graphviz = await Graphviz.load();
    });

    const graphOf = (dot) => JSON.parse(graphviz.dot(dot, "json"));

    for (const testCase of digraphCases) {
      it(`rebuilds and runs "${testCase.fixture}" to the same verdicts as the machine it was drawn from`, function () {
        const original = createFSA(...structuredClone(testCase.args));
        const rebuilt = buildMachine(fas, definitionFromGraph(graphOf(original.generateDigraph())));

        const alphabet = testCase.args[1].filter((symbol) => symbol !== "");
        for (const word of wordsUpTo(alphabet, 3)) {
          const expected = simulateFSA(word, original);
          // A symbol the drawing never uses is not in the rebuilt machine's alphabet; the original rejects such words too
          const known = word.every((symbol) => rebuilt.definition.alphabet.includes(symbol));
          if (known) assert.strictEqual(trace(fas, rebuilt, word).accepted, expected, JSON.stringify(word));
          else assert.isFalse(expected, JSON.stringify(word));
        }
      });
    }

    it("rebuilds 200 generated machines to the same verdicts", function () {
      for (let i = 0; i < 200; i++) {
        const definition = randomDefinition(i % 2 === 1);
        const original = createFSA(definition.states, definition.alphabet, definition.transitions, definition.start, definition.accepts);
        const rebuilt = buildMachine(fas, definitionFromGraph(graphOf(original.generateDigraph())));

        for (let w = 0; w < 12; w++) {
          const word = Array.from({ length: Math.floor(next() * 7) }, () => pick(definition.alphabet));
          const expected = simulateFSA(word, original);
          const known = word.every((symbol) => rebuilt.definition.alphabet.includes(symbol));
          if (known) assert.strictEqual(trace(fas, rebuilt, word).accepted, expected, JSON.stringify([definition, word]));
          else assert.isFalse(expected, JSON.stringify([definition, word]));
        }
      }
    });

    it("names the drawing's nodes and edges by the ids Graphviz gives them in its SVG", function () {
      for (const testCase of digraphCases) {
        const dot = createFSA(...structuredClone(testCase.args)).generateDigraph();
        const { nodes, edges } = readGraph(graphOf(dot));
        const svg = graphviz.dot(dot, "svg");
        assertIds(nodes, edges, svg);
      }
    });

    function assertIds(nodes, edges, svg) {
      const titleOf = (id) => svg.match(new RegExp(`<g id="${id}" class="(?:node|edge)">\\s*<title>([^<]*)</title>`))?.[1];
      // The way Graphviz writes a name inside an SVG <title>
      const xml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/-/g, "&#45;");
      const inDot = (name) => name.replace(/\\/g, "\\\\");

      for (const node of nodes) assert.equal(titleOf(node.id), xml(inDot(node.name)), node.name);
      for (const edge of edges.filter((e) => e.from !== null)) {
        assert.equal(titleOf(edge.id), `${xml(inDot(edge.from))}&#45;&gt;${xml(inDot(edge.to))}`, `${edge.from} -> ${edge.to}`);
      }
    }

    it("explains a drawing it cannot rebuild, in a sentence", function () {
      assert.match(problemOf(() => definitionFromGraph(graphOf("digraph { a -> b [label=\"x\"]; }"))), /no single start marker/);
      assert.match(
        problemOf(() => definitionFromGraph(graphOf('digraph { node [shape=point]; qi; node [shape=circle]; qi -> a; qi -> b; a -> b [label="x"]; }'))),
        /exactly one arrow/
      );
      assert.match(
        problemOf(() => definitionFromGraph(graphOf("digraph { node [shape=point]; qi; node [shape=circle]; qi -> a; a -> b; }"))),
        /has no label/
      );
      for (const edges of ['a -> "b,c" [label="x"]; a -> a [label="x"];', 'a -> "b,c" [label="x"]; "b,c" -> a [label="x"];']) {
        assert.match(
          problemOf(() => definitionFromGraph(graphOf(`digraph { node [shape=point]; qi; node [shape=circle]; qi -> a; ${edges} }`))),
          /comma in its name/
        );
      }
    });
  });
});
