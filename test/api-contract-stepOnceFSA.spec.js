/**
 * Public API contract — stepOnceFSA (sealed v1 behavior).
 */
import { createFSA, stepOnceFSA } from "../src/modules";

import { assert } from "chai";

describe("API contract: stepOnceFSA", function () {
  let dfa;

  before(function () {
    dfa = createFSA(
      ["q1", "q2"],
      "01",
      [
        { from: "q1", to: "q2", input: "1" },
        { from: "q2", to: "q1", input: "0" },
        { from: "q2", to: "q2", input: "1" },
        { from: "q1", to: "q1", input: "0" },
      ],
      "q1",
      ["q2"]
    );
  });

  it("returns destination state for DFA single step", function () {
    assert.equal(stepOnceFSA("1", "q1", dfa), "q2");
    assert.equal(stepOnceFSA("0", "q2", dfa), "q1");
  });

  it("returns array of states for NFA single step", function () {
    const nfa = createFSA(
      ["q1", "q2"],
      "01",
      [
        { from: "q1", to: "q1,q2", input: "1" },
        { from: "q1", to: "q1", input: "0" },
        { from: "q2", to: "q2", input: "0" },
        { from: "q2", to: "q2", input: "1" },
      ],
      "q1",
      ["q2"]
    );
    const result = stepOnceFSA("1", "q1", nfa);
    assert.isArray(result);
    assert.sameMembers(result, ["q1", "q2"]);
  });
});
