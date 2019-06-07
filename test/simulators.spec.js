import { simulateDFA, stepOnceDFA, simulateNFA } from "../src/modules.js";
import { DFA } from "../src/classes/DFA.js";
import { NFA } from "../src/classes/NFA.js";
import { State } from "../src/classes/State.js";
import { Alphabet } from "../src/classes/Alphabet.js";
import { Transition } from "../src/classes/Transition.js";
import { NFATransition } from "../src/classes/NFATransition.js";
import { ErrorCode } from "../src/globals/errors.js";
var assert = require("chai").assert;
var expect = require("chai").expect;

import "core-js/stable";
import "regenerator-runtime/runtime";

describe("DFA Simulations", function() {
  // Logging enabled on some tests for code coverage
  describe("Simulators#simulateDFA()", function() {
    describe("w ends in a 1", function() {
      let q1, q2;
      let t1, t2, t3, t4;
      let states, alphabet, accepts, acceptsNames, transitions, dfa;

      before(function() {
        q1 = new State("q1");
        q2 = new State("q2");

        t1 = new Transition(q1, q1, "0");
        t2 = new Transition(q1, q2, "1");
        t3 = new Transition(q2, q2, "1");
        t4 = new Transition(q2, q1, "0");

        states = new Set([q1, q2]);
        alphabet = new Alphabet("01");
        transitions = new Set([t1, t2, t3, t4]);
        accepts = new Set([q2]);
        acceptsNames = [q2.name];
        dfa = new DFA(states, alphabet, transitions, q1, accepts);
      });

      it("Should not accept invalid w type", function() {
        // Type check clause tested here
        expect(() => simulateDFA(null, dfa, true)).to.throw(TypeError);
        expect(() => simulateDFA(undefined, dfa)).to.throw(TypeError);
        expect(() => simulateDFA(0, dfa)).to.throw(TypeError);
        expect(() => simulateDFA(() => {}, dfa)).to.throw(TypeError);
      });

      it("Should accept for 101/1/111/10101", function() {
        assert(acceptsNames.indexOf(simulateDFA("101", dfa, true)) !== -1);
        assert(acceptsNames.indexOf(simulateDFA("1", dfa)) !== -1);
        assert(acceptsNames.indexOf(simulateDFA("111", dfa)) !== -1);
        assert(acceptsNames.indexOf(simulateDFA("10101", dfa)) !== -1);
      });

      it("Should reject for empty/0/10/0110/xyz", function() {
        assert(acceptsNames.indexOf(simulateDFA("", dfa, true)) === -1);
        assert(acceptsNames.indexOf(simulateDFA("0", dfa)) === -1);
        assert(acceptsNames.indexOf(simulateDFA("10", dfa)) === -1);
        assert(acceptsNames.indexOf(simulateDFA("0110", dfa)) === -1);
        assert(simulateDFA("xyz", dfa) === "q1" && acceptsNames.indexOf("q1") === -1);
      });
    });

    describe("w starts and ends with same symbol", function() {
      let s, q1, q2, r1, r2;
      let t1, t2, t3, t4, t5, t6, t7, t8, t9, t10;
      let states, alphabet, accepts, acceptsNames, transitions, dfa;

      before(function() {
        s = new State("s");
        q1 = new State("q1");
        q2 = new State("q2");
        r1 = new State("r1");
        r2 = new State("r2");

        t1 = new Transition(s, q1, "a");
        t2 = new Transition(s, r1, "b");
        t3 = new Transition(q1, q1, "a");
        t4 = new Transition(q1, q2, "b");
        t5 = new Transition(q2, q1, "a");
        t6 = new Transition(q2, q2, "b");
        t7 = new Transition(r1, r2, "a");
        t8 = new Transition(r1, r1, "b");
        t9 = new Transition(r2, r2, "a");
        t10 = new Transition(r2, r1, "b");

        states = new Set([s, q1, q2, r1, r2]);
        alphabet = new Alphabet("ab");
        transitions = new Set([t1, t2, t3, t4, t5, t6, t7, t8, t9, t10]);
        accepts = new Set([r1, q1]);
        acceptsNames = [r1.name, q1.name];
        dfa = new DFA(states, alphabet, transitions, s, accepts);
      });

      it("Should accept for a/b/aa/bab/ababba", function() {
        assert(acceptsNames.indexOf(simulateDFA("a", dfa)) !== -1);
        assert(acceptsNames.indexOf(simulateDFA("b", dfa)) !== -1);
        assert(acceptsNames.indexOf(simulateDFA(["a", "a"], dfa)) !== -1); // Use array param for additional code coverage
        assert(acceptsNames.indexOf(simulateDFA("bab", dfa)) !== -1);
        assert(acceptsNames.indexOf(simulateDFA("ababba", dfa)) !== -1);
      });

      it("Should reject for empty/ab/aab/baba/baxb", function() {
        assert(acceptsNames.indexOf(simulateDFA("", dfa)) === -1);
        assert(acceptsNames.indexOf(simulateDFA("ab", dfa)) === -1);
        assert(acceptsNames.indexOf(simulateDFA("aab", dfa)) === -1);
        assert(acceptsNames.indexOf(simulateDFA("baba", dfa)) === -1);
        assert(simulateDFA("baxb", dfa) === "r2" && acceptsNames.indexOf("r2") === -1);
      });
    });
  });

  // Logging enabled on some tests for code coverage
  describe("Simulators#stepOnceDFA()", function() {
    describe("w ends in a 1", function() {
      let q1, q2;
      let t1, t2, t3, t4;
      let ndt1, ndt2, ndt3, ndt4;
      let states, alphabet, accepts, transitions, nfaTFunc, dfa, nfa;

      before(function() {
        q1 = new State("q1");
        q2 = new State("q2");

        t1 = new Transition(q1, q1, "0");
        t2 = new Transition(q1, q2, "1");
        t3 = new Transition(q2, q2, "1");
        t4 = new Transition(q2, q1, "0");

        ndt1 = new Transition(q1, [q1], "0");
        ndt2 = new Transition(q1, [q2], "1");
        ndt3 = new Transition(q2, [q2], "1");
        ndt4 = new Transition(q2, [q1], "0");

        states = new Set([q1, q2]);
        alphabet = new Alphabet("01");
        transitions = new Set([t1, t2, t3, t4]);
        nfaTFunc = new Set([ndt1, ndt2, ndt3, ndt4]);
        accepts = new Set([q2]);
        dfa = new DFA(states, alphabet, transitions, q1, accepts);
        nfa = new NFA(states, alphabet, nfaTFunc, q1, accepts);
      });

      it("Should not accept NFAs", function() {
        expect(() => stepOnceDFA("0", q1.name, nfa, true)).to.throw(TypeError);
      });

      it("Should not accept invalid w type", function() {
        // Type check clauses tested here
        expect(() => stepOnceDFA(null, q1.name, dfa, true)).to.throw(TypeError);
        expect(() => stepOnceDFA(undefined, q1.name, dfa)).to.throw(TypeError);
        expect(() => stepOnceDFA(0, q1.name, dfa)).to.throw(TypeError);
        expect(() => stepOnceDFA(() => {}, q1.name, dfa)).to.throw(TypeError);

        expect(() => stepOnceDFA("0", null, dfa, true)).to.throw(TypeError);
        expect(() => stepOnceDFA("0", undefined, dfa)).to.throw(TypeError);
        expect(() => stepOnceDFA("0", 0, dfa)).to.throw(TypeError);
        expect(() => stepOnceDFA("0", () => {}, dfa)).to.throw(TypeError);
      });

      it("Should return valid states for valid transitions", function() {
        assert(stepOnceDFA("0", q1.name, dfa, true) === q1.name);
        assert(stepOnceDFA("1", q1.name, dfa) === q2.name);
      });

      it("Should throw exception for invalid state", function() {
        expect(() => stepOnceDFA("0", "invalid", dfa)).to.throw(ErrorCode.INVALID_STATE_NAME);
      });
    });
  });
});

describe("NFA Simulations", function() {
  // Logging enabled on some tests for code coverage
  describe("Simulators#simulateNFA()", function() {
    describe("w contains 1 in third position from the end", function() {
      let q1, q2, q3, q4;
      let t1, t2, t3, t4, t5, t6;
      let states, alphabet, accepts, acceptsNames, transitions, nfa;

      before(function() {
        q1 = new State("q1");
        q2 = new State("q2");
        q3 = new State("q3");
        q4 = new State("q4");

        t1 = new NFATransition(q1, [q1], "0");
        t2 = new NFATransition(q1, [q1, q2], "1");
        t3 = new NFATransition(q2, [q3], "0");
        t4 = new NFATransition(q2, [q3], "1");
        t5 = new NFATransition(q3, [q4], "0");
        t6 = new NFATransition(q3, [q4], "1");

        states = new Set([q1, q2, q3, q4]);
        alphabet = new Alphabet("01");
        transitions = new Set([t1, t2, t3, t4, t5, t6]);
        accepts = new Set([q4]);
        acceptsNames = [q4.name];
        nfa = new NFA(states, alphabet, transitions, q1, accepts);
      });

      /*       it("Should not accept invalid w type", function() {
        // Type check clause tested here
        expect(() => simulateNFA(null, nfa, true)).to.throw(TypeError);
        expect(() => simulateNFA(undefined, nfa)).to.throw(TypeError);
        expect(() => simulateNFA(0, nfa)).to.throw(TypeError);
        expect(() => simulateNFA(() => {}, nfa)).to.throw(TypeError);
      }); */

      it("Should accept for 1111/100/111/10101", async () => {
        assert(acceptsNames.indexOf(await simulateNFA("1111", nfa)) !== -1);
        assert(acceptsNames.indexOf(await simulateNFA("100", nfa)) !== -1);
        assert(acceptsNames.indexOf(await simulateNFA("111", nfa)) !== -1);
        //assert(acceptsNames.indexOf(simulateNFA("10101", nfa)) !== -1);
      });

      it("Should reject for empty/0/10/0110/xyz", async () => {
        assert(acceptsNames.indexOf(await simulateNFA("", nfa)) === -1);
        assert(acceptsNames.indexOf(await simulateNFA("0", nfa)) === -1);
        assert(acceptsNames.indexOf(await simulateNFA("10", nfa)) === -1);
        //assert(acceptsNames.indexOf(await simulateNFA("0110", nfa)) === -1);
        //assert(simulateNFA("xyz", nfa) === "q1" && acceptsNames.indexOf("q1") === -1);
      });
    });
  });
});
