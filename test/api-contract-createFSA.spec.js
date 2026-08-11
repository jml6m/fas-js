/**
 * Public API contract — createFSA (sealed v1 behavior).
 */
import { createFSA } from "../src/modules";

import { assert, expect } from "chai";

describe("API contract: createFSA", function () {
  const states = ["q1", "q2"];
  const alphabet = "01";
  const dfaTransitions = [
    { from: "q1", to: "q2", input: "1" },
    { from: "q2", to: "q1", input: "0" },
    { from: "q2", to: "q2", input: "1" },
    { from: "q1", to: "q1", input: "0" },
  ];
  const start = "q1";
  const accepts = ["q2"];

  it("creates a DFA with getType() === 'DFA'", function () {
    const fsa = createFSA(states, alphabet, dfaTransitions, start, accepts);
    assert.equal(fsa.getType(), "DFA");
  });

  it("creates an NFA when transitions include epsilon or multi-dest", function () {
    const nfaTransitions = [
      { from: "q1", to: "q1", input: "0" },
      { from: "q1", to: "q1,q2", input: "1" },
      { from: "q2", to: "q2", input: "0" },
      { from: "q2", to: "q2", input: "1" },
    ];
    const fsa = createFSA(states, alphabet, nfaTransitions, start, accepts);
    assert.equal(fsa.getType(), "NFA");
  });

  it("generateDigraph() returns non-empty DOT for DFA", function () {
    const fsa = createFSA(states, alphabet, dfaTransitions, start, accepts);
    const dot = fsa.generateDigraph();
    assert.isString(dot);
    assert.include(dot, "digraph");
    assert.include(dot, "q1");
  });

  it("rejects invalid states input", function () {
    expect(() => createFSA(null, alphabet, dfaTransitions, start, accepts)).to.throw(TypeError);
  });
});
