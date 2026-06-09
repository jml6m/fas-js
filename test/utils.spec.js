import { FSAUtils } from "../src/utils/FSAUtils";
import { DFA, NFA } from "../src/automata";
import { State, Alphabet, Transition, NFATransition } from "../src/components";
import { ErrorCode } from "../src/globals/errors";
import {
  isSubsetOf,
  isSupersetOf,
  instanceOf,
  getOrDefault,
  count,
  duplicates,
} from "../src/globals/globals";

import { assert, expect } from "chai";

describe("FSAUtils test", function() {
  let q1, q2, q3;
  let t1, t2, t3, t4;
  let nt1, nt2, nt3, nt4;
  let states, alphabet, accepts, transitions, n_transitions, dfa, nfa;
  let dfa_utils, nfa_utils;

  before(function() {
    q1 = new State("q1");
    q2 = new State("q2");
    q3 = new State("q3");

    states = new Set([q1, q2]);
    alphabet = new Alphabet("ab");
    accepts = new Set([q2]);

    t1 = new Transition(q1, q1, "a");
    t2 = new Transition(q1, q2, "b");
    t3 = new Transition(q2, q1, "a");
    t4 = new Transition(q2, q2, "b");

    nt1 = new NFATransition(q1, [q1], "a");
    nt2 = new NFATransition(q1, [q2, q1], "b");
    nt3 = new NFATransition(q2, [q1], "a");
    nt4 = new NFATransition(q2, [q2], "b");

    transitions = new Set([t1, t2, t3, t4]);
    n_transitions = new Set([nt1, nt2, nt3, nt4]);
    dfa = new DFA(states, alphabet, transitions, q1, accepts);
    nfa = new NFA(states, alphabet, n_transitions, q1, accepts);
    dfa_utils = new FSAUtils(DFA);
    nfa_utils = new FSAUtils(NFA);
  });

  describe("FSAUtils#constructor()", function() {
    it("Should return valid class attributes", function() {
      assert(dfa_utils._type === DFA);
      assert(nfa_utils._type === NFA);
    });
  });

  describe("FSAUtils#receiveInputDFA()", function() {
    it("Should process DFA input", function() {
      const state = dfa_utils.receiveInput(dfa, "b", q1);
      const state2 = dfa_utils.receiveInput(dfa, "b", [q1]);
      assert(state === q2);
      assert(state2 === q2);
    });

    it("Should reject invalid input char", function() {
      expect(() => dfa_utils.receiveInput(dfa, "x", q1)).to.throw(ErrorCode.INVALID_INPUT_CHAR);
    });

    it("Should reject invalid state", function() {
      expect(() => dfa_utils.receiveInput(dfa, "a", q3)).to.throw(ErrorCode.INPUT_STATE_NOT_FOUND);
      expect(() => dfa_utils.receiveInput(dfa, "a", q3)).to.throw(ErrorCode.INPUT_STATE_NOT_FOUND);
    });

    it("Should reject invalid state array", function() {
      expect(() => dfa_utils.receiveInput(dfa, "a", [q1, q2])).to.throw(ErrorCode.INVALID_STATE_ARRAY);
    });
  });

  describe("FSAUtils#receiveInputNFA()", function() {
    it("Should process NFA input", function() {
      const expected = new Set([q1, q2]);
      const state = nfa_utils.receiveInput(nfa, "b", q1);
      const state2 = nfa_utils.receiveInput(nfa, "b", [q1, q2]);
      assert(isSubsetOf(state, expected) && isSupersetOf(state, expected));
      assert(isSubsetOf(state2, expected) && isSupersetOf(state2, expected));
    });

    it("Should reject invalid input char", function() {
      expect(() => nfa_utils.receiveInput(nfa, "x", q1)).to.throw(ErrorCode.INVALID_INPUT_CHAR);
    });

    it("Should return empty set when no transition exists", function() {
      const nfaStates = new Set([q1]);
      const nfaAlph = new Alphabet("ab");
      const nfaTrans = new Set([new NFATransition(q1, [q1], "a")]);
      const simpleNfa = new NFA(nfaStates, nfaAlph, nfaTrans, q1, new Set());
      const result = nfa_utils.receiveInput(simpleNfa, "b", [q1]);
      assert(result.size === 0);
    });
  });

  describe("globals helpers", function() {
    it("Should evaluate isSupersetOf", function() {
      const superset = new Set([q1, q2, q3]);
      const subset = new Set([q1, q2]);
      assert(isSupersetOf(superset, subset) === true);
      assert(isSupersetOf(subset, superset) === false);
    });

    it("Should evaluate count and duplicates", function() {
      assert.deepEqual(count(["a", "b", "a"]), { a: 2, b: 1 });
      assert.deepEqual(duplicates({ a: 2, b: 1 }), ["a"]);
    });

    it("Should resolve getOrDefault for present and missing keys", function() {
      const map = new Map([["q1", q1]]);
      assert(getOrDefault(map, "q1", q2) === q1);
      assert(getOrDefault(map, "missing", q2) === q2);
    });

    it("Should fall back to constructor name in instanceOf", function() {
      const mockNfa = { constructor: { name: "NFA" } };
      assert(instanceOf(NFA, mockNfa) === true);
    });
  });

  describe("FSAUtils#receiveInputDFA() edge cases", function() {
    it("Should reject missing transition path", function() {
      const mockDfa = {
        getAlphabet: () => alphabet,
        getStates: () => new Set([q1]),
        getTFunc: () => new Set(),
      };
      expect(() => dfa_utils.receiveInput(mockDfa, "a", q1)).to.throw(
        ErrorCode.INVALID_TRANSITION_OBJECT
      );
    });
  });
});
