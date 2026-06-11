/**
 * Stable error catalog — every E-00x code must keep its exact message string.
 * Closes #237.
 */
import { DFA } from "../src/automata";
import { State, Alphabet, Transition } from "../src/components";
import { ErrorCode } from "../src/globals/errors";
import { createFSA, simulateFSA, stepOnceFSA } from "../src/modules";
import { FSAUtils } from "../src/utils";

import { assert, expect } from "chai";

function expectCode(fn, code) {
  expect(fn).to.throw(Error, code);
  try {
    fn();
  } catch (error) {
    assert.equal(error.message, code);
  }
}

describe("Error catalog (#237)", function() {
  it("defines thirteen stable codes E-001 through E-013", function() {
    const values = Object.values(ErrorCode);
    assert.lengthOf(values, 13);
    assert.sameMembers(values, [
      "E-001",
      "E-002",
      "E-003",
      "E-004",
      "E-005",
      "E-006",
      "E-007",
      "E-008",
      "E-009",
      "E-010",
      "E-011",
      "E-012",
      "E-013",
    ]);
  });

  describe("E-001 DUPLICATE_ALPHABET_VALS", function() {
    it("throws the catalog message", function() {
      expectCode(() => new Alphabet("abb"), ErrorCode.DUPLICATE_ALPHABET_VALS);
    });
  });

  describe("E-002 DUPLICATE_STATE_NAMES", function() {
    it("throws the catalog message", function() {
      const q1 = new State("q1");
      const alphabet = new Alphabet("a");
      const transitions = new Set([new Transition(q1, q1, "a")]);
      expectCode(
        () => new DFA(new Set([q1, new State("q1")]), alphabet, transitions, q1, new Set()),
        ErrorCode.DUPLICATE_STATE_NAMES
      );
    });
  });

  describe("E-003 INVALID_STATE_NAME", function() {
    it("throws the catalog message", function() {
      expectCode(() => new State(""), ErrorCode.INVALID_STATE_NAME);

      const dfa = createFSA(
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
      expectCode(() => stepOnceFSA("0", "missing", dfa), ErrorCode.INVALID_STATE_NAME);
    });
  });

  describe("E-004 START_STATE_NOT_FOUND", function() {
    it("throws the catalog message", function() {
      const q1 = new State("q1");
      const q2 = new State("q2");
      const alphabet = new Alphabet("a");
      const transitions = new Set([new Transition(q1, q1, "a"), new Transition(q2, q2, "a")]);
      expectCode(
        () => new DFA(new Set([q1, q2]), alphabet, transitions, new State("q9"), new Set([q2])),
        ErrorCode.START_STATE_NOT_FOUND
      );
    });
  });

  describe("E-005 ACCEPTS_NOT_SUBSET", function() {
    it("throws the catalog message", function() {
      const q1 = new State("q1");
      const q2 = new State("q2");
      const alphabet = new Alphabet("a");
      const transitions = new Set([new Transition(q1, q1, "a"), new Transition(q2, q2, "a")]);
      expectCode(
        () => new DFA(new Set([q1]), alphabet, transitions, q1, new Set([q1, q2])),
        ErrorCode.ACCEPTS_NOT_SUBSET
      );
    });
  });

  describe("E-006 ORIGIN_STATE_NOT_FOUND", function() {
    it("throws the catalog message", function() {
      const q1 = new State("q1");
      const q2 = new State("q2");
      const alphabet = new Alphabet("a");
      const transitions = new Set([new Transition(new State("q9"), q1, "a")]);
      expectCode(
        () => new DFA(new Set([q1, q2]), alphabet, transitions, q1, new Set([q2])),
        ErrorCode.ORIGIN_STATE_NOT_FOUND
      );
    });
  });

  describe("E-007 DEST_STATE_NOT_FOUND", function() {
    it("throws the catalog message", function() {
      const q1 = new State("q1");
      const q2 = new State("q2");
      const alphabet = new Alphabet("a");
      const transitions = new Set([new Transition(q1, new State("q9"), "a")]);
      expectCode(
        () => new DFA(new Set([q1, q2]), alphabet, transitions, q1, new Set([q2])),
        ErrorCode.DEST_STATE_NOT_FOUND
      );
    });
  });

  describe("E-008 MISSING_REQUIRED_TRANSITION", function() {
    it("throws the catalog message", function() {
      const q1 = new State("q1");
      const q2 = new State("q2");
      const alphabet = new Alphabet("ab");
      const transitions = new Set([
        new Transition(q1, q1, "a"),
        new Transition(q1, q2, "b"),
        new Transition(q2, q2, "a"),
      ]);
      expectCode(
        () => new DFA(new Set([q1, q2]), alphabet, transitions, q1, new Set([q2])),
        ErrorCode.MISSING_REQUIRED_TRANSITION
      );
    });
  });

  describe("E-009 INVALID_INPUT_CHAR", function() {
    it("throws the catalog message", function() {
      const dfa = createFSA(
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
      expectCode(() => simulateFSA("x", dfa), ErrorCode.INVALID_INPUT_CHAR);
    });
  });

  describe("E-010 INPUT_STATE_NOT_FOUND", function() {
    it("throws the catalog message", function() {
      const q1 = new State("q1");
      const q2 = new State("q2");
      const q3 = new State("q3");
      const alphabet = new Alphabet("a");
      const transitions = new Set([new Transition(q1, q2, "a"), new Transition(q2, q2, "a")]);
      const dfa = new DFA(new Set([q1, q2]), alphabet, transitions, q1, new Set([q2]));
      const utils = new FSAUtils(DFA);

      expectCode(() => utils.receiveInput(dfa, "a", q3), ErrorCode.INPUT_STATE_NOT_FOUND);
    });
  });

  describe("E-011 INVALID_TRANSITION_OBJECT", function() {
    it("throws the catalog message", function() {
      expectCode(
        () => createFSA(["q1"], "0", [{ from: "q1", to: "q1" }], "q1", ["q1"]),
        ErrorCode.INVALID_TRANSITION_OBJECT
      );
    });
  });

  describe("E-012 DUPLICATE_TRANSITION_OBJECT", function() {
    it("throws the catalog message", function() {
      const q1 = new State("q1");
      const q2 = new State("q2");
      const alphabet = new Alphabet("ab");
      const transitions = new Set([
        new Transition(q1, q1, "a"),
        new Transition(q1, q2, "b"),
        new Transition(q2, q1, "a"),
        new Transition(q2, q2, "b"),
        new Transition(q1, q2, "a"),
      ]);
      expectCode(
        () => new DFA(new Set([q1, q2]), alphabet, transitions, q1, new Set([q2])),
        ErrorCode.DUPLICATE_TRANSITION_OBJECT
      );
    });
  });

  describe("E-013 INVALID_STATE_ARRAY", function() {
    it("throws the catalog message", function() {
      const q1 = new State("q1");
      const q2 = new State("q2");
      const alphabet = new Alphabet("a");
      const transitions = new Set([new Transition(q1, q2, "a"), new Transition(q2, q2, "a")]);
      const dfa = new DFA(new Set([q1, q2]), alphabet, transitions, q1, new Set([q2]));
      const utils = new FSAUtils(DFA);

      expectCode(() => utils.receiveInput(dfa, "a", [q1, q2]), ErrorCode.INVALID_STATE_ARRAY);
    });
  });
});