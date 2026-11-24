/**
 * createFSA and its inputs: the caller's alphabet is never changed, and a duplicate symbol is
 * rejected whatever it is called.
 */
import { assert } from "chai";

import { createFSA, simulateFSA } from "../src/modules";
import { ErrorCode } from "../src/globals/errors";

// Names every JavaScript object already has a member for
const OBJECT_MEMBER_NAMES = ["constructor", "toString", "valueOf", "hasOwnProperty", "__proto__"];

describe("createFSA inputs", function () {
  describe("the caller's alphabet", function () {
    const dfaTransitions = [
      { from: "q", to: "q", input: "0" },
      { from: "q", to: "q", input: "1" },
    ];
    const nfaTransitions = [
      { from: "q", to: "q", input: "0" },
      { from: "q", to: "q", input: "" },
    ];

    it("is left as it was after creating an NFA", function () {
      const sigma = ["0", "1"];
      const nfa = createFSA(["q"], sigma, nfaTransitions, "q", []);

      assert.deepEqual(sigma, ["0", "1"]);
      assert.deepEqual(nfa.getAlphabet().sigma, ["0", "1", ""]);
    });

    it("is left as it was after creating a DFA", function () {
      const sigma = ["0", "1"];
      const dfa = createFSA(["q"], sigma, dfaTransitions, "q", []);

      assert.deepEqual(sigma, ["0", "1"]);
      assert.deepEqual(dfa.getAlphabet().sigma, ["0", "1"]);
    });

    it("can be used again for a DFA after it was used for an NFA", function () {
      const sigma = ["0", "1"];
      createFSA(["q"], sigma, nfaTransitions, "q", []);

      const dfa = createFSA(["q"], sigma, dfaTransitions, "q", ["q"]);
      assert.equal(dfa.getType(), "DFA");
      assert.isTrue(simulateFSA("0110", dfa));
    });

    it("is not changed through the automaton's own alphabet", function () {
      const sigma = ["0", "1"];
      const dfa = createFSA(["q"], sigma, dfaTransitions, "q", []);

      assert.notStrictEqual(dfa.getAlphabet().sigma, sigma);
    });

    it("still works as a string", function () {
      const nfa = createFSA(["q"], "01", nfaTransitions, "q", ["q"]);
      assert.deepEqual(nfa.getAlphabet().sigma, ["0", "1", ""]);
    });
  });

  describe("duplicate symbols", function () {
    it("are rejected for an ordinary name", function () {
      assert.throws(() => createFSA(["q"], ["a", "a"], [{ from: "q", to: "q", input: "a" }], "q", []), ErrorCode.DUPLICATE_ALPHABET_VALS);
    });

    it("are rejected when one is a number and the other the same text, as before", function () {
      assert.throws(() => createFSA(["q"], [1, "1"], [{ from: "q", to: "q", input: "1" }], "q", []), ErrorCode.DUPLICATE_ALPHABET_VALS);
    });

    for (const name of OBJECT_MEMBER_NAMES) {
      it(`are rejected for "${name}"`, function () {
        assert.throws(
          () => createFSA(["q"], [name, name], [{ from: "q", to: "q", input: name }], "q", []),
          ErrorCode.DUPLICATE_ALPHABET_VALS
        );
        assert.throws(
          () => createFSA(["q"], ["a", name, "b", name], [{ from: "q", to: "q", input: "a" }], "q", []),
          ErrorCode.DUPLICATE_ALPHABET_VALS
        );
      });

      it(`"${name}" is accepted once, as a symbol and as a state name`, function () {
        const dfa = createFSA([name, "other"], [name], [
          { from: name, to: "other", input: name },
          { from: "other", to: name, input: name },
        ], name, ["other"]);

        assert.deepEqual(dfa.getAlphabet().sigma, [name]);
        assert.isTrue(simulateFSA([name], dfa));
        assert.isFalse(simulateFSA([name, name], dfa));
      });
    }
  });
});
