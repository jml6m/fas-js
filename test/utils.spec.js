import Set from "core-js/features/set";
import { FSAUtils } from "../src/utils/FSAUtils.js";
import { DFA, NFA } from "../src/automata";
import { State, Alphabet, Transition, NFATransition } from "../src/components";
import { ErrorCode } from "../src/globals/errors.js";

const chai = require("chai");
const assert = chai.assert;
const expect = chai.expect;

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
      const state = nfa_utils.receiveInput(nfa, "b", q1);
      const state2 = nfa_utils.receiveInput(nfa, "b", [q1, q2]);
      assert(state.difference(new Set([q1, q2])).size === 0);
      assert(state2.difference(new Set([q1, q2])).size === 0);
    });

    it("Should reject invalid input char", function() {
      expect(() => nfa_utils.receiveInput(nfa, "x", q1)).to.throw(ErrorCode.INVALID_INPUT_CHAR);
    });
  });
});
