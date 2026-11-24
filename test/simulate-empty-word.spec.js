/**
 * The empty word is the same word whether it is passed as "" or as []. For an NFA it starts from
 * the ε-closure of the start state either way.
 */
import { assert } from "chai";

import { createFSA, simulateFSA, stepOnceFSA } from "../src/modules";

describe("simulateFSA with no input", function () {
  const machines = {
    "an NFA whose start state reaches an accept state by ε": createFSA(
      ["s", "acc"],
      ["a"],
      [{ from: "s", to: "acc", input: "" }],
      "s",
      ["acc"]
    ),
    "an NFA whose start state reaches an accept state by two ε": createFSA(
      ["s", "m", "acc"],
      ["a"],
      [
        { from: "s", to: "m", input: "" },
        { from: "m", to: "acc", input: "" },
      ],
      "s",
      ["acc"]
    ),
    "an NFA whose start state is its accept state": createFSA(["s", "t"], ["a"], [{ from: "s", to: "s,t", input: "a" }], "s", ["s"]),
    "an NFA that needs a symbol to accept": createFSA(["s", "t"], ["a"], [{ from: "s", to: "s,t", input: "a" }], "s", ["t"]),
    "an NFA with ε out of the start state that still rejects": createFSA(
      ["s", "m", "acc"],
      ["a"],
      [
        { from: "s", to: "m", input: "" },
        { from: "m", to: "acc", input: "a" },
      ],
      "s",
      ["acc"]
    ),
    "a DFA whose start state accepts": createFSA(["s"], ["a"], [{ from: "s", to: "s", input: "a" }], "s", ["s"]),
    "a DFA whose start state rejects": createFSA(["s"], ["a"], [{ from: "s", to: "s", input: "a" }], "s", []),
  };

  for (const [name, fsa] of Object.entries(machines)) {
    it(`gives the same answer for "" and [] on ${name}`, function () {
      assert.strictEqual(simulateFSA([], fsa), simulateFSA("", fsa));
      assert.deepEqual(simulateFSA([], fsa, false, true), simulateFSA("", fsa, false, true));
    });
  }

  it("accepts the empty array when ε leads from the start state to an accept state", function () {
    const nfa = machines["an NFA whose start state reaches an accept state by ε"];
    assert.isTrue(simulateFSA([], nfa));
    assert.deepEqual(simulateFSA([], nfa, false, true), ["acc"]);
  });

  it("accepts exactly when the ε-closure of the start state holds an accept state", function () {
    for (const fsa of Object.values(machines).filter((machine) => machine.getType() === "NFA")) {
      const accepts = [...fsa.getAcceptStates()].map((state) => state.name);
      const closure = stepOnceFSA("", fsa.getStartState().name, fsa);
      assert.strictEqual(
        simulateFSA([], fsa),
        closure.some((name) => accepts.includes(name))
      );
    }
  });

  it("still reads a one-symbol array and a one-symbol string alike", function () {
    const nfa = machines["an NFA with ε out of the start state that still rejects"];
    assert.isTrue(simulateFSA(["a"], nfa));
    assert.isTrue(simulateFSA("a", nfa));
  });
});
