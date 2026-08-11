/**
 * Public API contract — simulateFSA (sealed v1 behavior).
 */
import { createFSA, simulateFSA } from "../src/modules";

import { assert } from "chai";

describe("API contract: simulateFSA", function () {
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

  it("returns boolean acceptance by default", function () {
    assert.isTrue(simulateFSA("1", dfa));
    assert.isFalse(simulateFSA("0", dfa));
  });

  it("returns end state when returnEndState is true", function () {
    assert.equal(simulateFSA("1", dfa, false, true), "q2");
    assert.equal(simulateFSA("0", dfa, false, true), "q1");
  });

  it("accepts empty string when start is accept state", function () {
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
