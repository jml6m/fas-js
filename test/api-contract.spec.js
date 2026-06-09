/**
 * Public API contract tests — must pass on every v1.1 prep PR.
 * Locks behavior of createFSA, simulateFSA, and stepOnceFSA.
 */
import { createFSA, simulateFSA, stepOnceFSA } from "../src/modules";

import { assert, expect } from "chai";

describe("API contract: createFSA", function() {
  const states = ["q1", "q2"];
  const alphabet = "01";
  const dfaTransitions = [
    { from: "q1", to: "q2", input: "1" },
    { from: "q2", to: "q1", input: "0" },
    { from: "q2", to: "q2", input: "1" },
    { from: "q1", to: "q1", input: "0" }
  ];
  const start = "q1";
  const accepts = ["q2"];

  it("creates a DFA with getType() === 'DFA'", function() {
    const fsa = createFSA(states, alphabet, dfaTransitions, start, accepts);
    assert.equal(fsa.getType(), "DFA");
  });

  it("creates an NFA when transitions include epsilon or multi-dest", function() {
    const nfaTransitions = [
      { from: "q1", to: "q1", input: "0" },
      { from: "q1", to: "q1,q2", input: "1" },
      { from: "q2", to: "q2", input: "0" },
      { from: "q2", to: "q2", input: "1" }
    ];
    const fsa = createFSA(states, alphabet, nfaTransitions, start, accepts);
    assert.equal(fsa.getType(), "NFA");
  });

  it("generateDigraph() returns non-empty DOT for DFA", function() {
    const fsa = createFSA(states, alphabet, dfaTransitions, start, accepts);
    const dot = fsa.generateDigraph();
    assert.isString(dot);
    assert.include(dot, "digraph");
    assert.include(dot, "q1");
  });

  it("rejects invalid states input", function() {
    expect(() => createFSA(null, alphabet, dfaTransitions, start, accepts)).to.throw(TypeError);
  });
});

describe("API contract: simulateFSA", function() {
  let dfa;

  before(function() {
    dfa = createFSA(
      ["q1", "q2"],
      "01",
      [
        { from: "q1", to: "q2", input: "1" },
        { from: "q2", to: "q1", input: "0" },
        { from: "q2", to: "q2", input: "1" },
        { from: "q1", to: "q1", input: "0" }
      ],
      "q1",
      ["q2"]
    );
  });

  it("returns boolean acceptance by default", function() {
    assert.isTrue(simulateFSA("1", dfa));
    assert.isFalse(simulateFSA("0", dfa));
  });

  it("returns end state when returnEndState is true", function() {
    assert.equal(simulateFSA("1", dfa, false, true), "q2");
    assert.equal(simulateFSA("0", dfa, false, true), "q1");
  });

  it("accepts empty string when start is accept state", function() {
    const selfLoop = createFSA(
      ["q1"],
      "0",
      [{ from: "q1", to: "q1", input: "0" }],
      "q1",
      ["q1"]
    );
    assert.isTrue(simulateFSA("", selfLoop));
  });
});

describe("API contract: stepOnceFSA", function() {
  let dfa;

  before(function() {
    dfa = createFSA(
      ["q1", "q2"],
      "01",
      [
        { from: "q1", to: "q2", input: "1" },
        { from: "q2", to: "q1", input: "0" },
        { from: "q2", to: "q2", input: "1" },
        { from: "q1", to: "q1", input: "0" }
      ],
      "q1",
      ["q2"]
    );
  });

  it("returns destination state for DFA single step", function() {
    assert.equal(stepOnceFSA("1", "q1", dfa), "q2");
    assert.equal(stepOnceFSA("0", "q2", dfa), "q1");
  });

  it("returns array of states for NFA single step", function() {
    const nfa = createFSA(
      ["q1", "q2"],
      "01",
      [
        { from: "q1", to: "q1,q2", input: "1" },
        { from: "q1", to: "q1", input: "0" },
        { from: "q2", to: "q2", input: "0" },
        { from: "q2", to: "q2", input: "1" }
      ],
      "q1",
      ["q2"]
    );
    const result = stepOnceFSA("1", "q1", nfa);
    assert.isArray(result);
    assert.sameMembers(result, ["q1", "q2"]);
  });
});