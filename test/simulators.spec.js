import { simulateFSA, stepOnceFSA } from "../src/modules.js";
import { DFA, NFA } from "../src/automata";
import { State, Alphabet, Transition, NFATransition } from "../src/components";
import { ErrorCode } from "../src/globals/errors.js";
import { compare } from "../src/globals/globals.js";

const chai = require("chai");
const assert = chai.assert;
const expect = chai.expect;

describe("DFA Simulations", function() {
  // Logging enabled on some tests for code coverage
  describe("Simulators#simulateFSA()", function() {
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
        expect(() => simulateFSA(null, dfa, true)).to.throw(TypeError);
        expect(() => simulateFSA(undefined, dfa)).to.throw(TypeError);
        expect(() => simulateFSA(0, dfa)).to.throw(TypeError);
        expect(() => simulateFSA(() => {}, dfa)).to.throw(TypeError);
        expect(() => simulateFSA("xyz", dfa)).to.throw(ErrorCode.INVALID_INPUT_CHAR);
      });

      it("Should accept for 101/1/111/10101", function() {
        assert(acceptsNames.indexOf(simulateFSA("101", dfa, true, true)) !== -1);
        assert(acceptsNames.indexOf(simulateFSA("1", dfa, undefined, true)) !== -1); // undefined or false can be used if returnEndState param is passed in
        assert(simulateFSA("111", dfa));
        assert(simulateFSA("10101", dfa));
      });

      it("Should reject for empty/0/10/0110/xyz", function() {
        assert(!simulateFSA("", dfa));
        assert(acceptsNames.indexOf(simulateFSA("0", dfa, true, true)) === -1);
        assert(!simulateFSA("0", dfa));
        assert(!simulateFSA("10", dfa));
        assert(!simulateFSA("0110", dfa));
      });

      it("Should only accept DFAs", function() {
        const test_nfa = new NFA(states, alphabet, new Set([new NFATransition(q1, [q1], "0")]), q1, accepts);
        expect(() => simulateFSA(null, test_nfa, true)).to.throw(TypeError);
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
        assert(simulateFSA("a", dfa));
        assert(simulateFSA("b", dfa));
        assert(simulateFSA(["a", "a"], dfa)); // Use array param for additional code coverage
        assert(simulateFSA("bab", dfa));
        assert(simulateFSA("ababba", dfa));
      });

      it("Should reject for empty/ab/aab/baba/baxb", function() {
        assert(!simulateFSA("", dfa));
        assert(!simulateFSA("ab", dfa));
        assert(!simulateFSA("aab", dfa));
        assert(!simulateFSA("baba", dfa));
      });
    });
  });

  // Logging enabled on some tests for code coverage
  describe("Simulators#stepOnceFSA()", function() {
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

      it("Should not accept invalid w type", function() {
        // Type check clauses tested here
        expect(() => stepOnceFSA(null, q1.name, dfa, true)).to.throw(TypeError);
        expect(() => stepOnceFSA(undefined, q1.name, dfa)).to.throw(TypeError);
        expect(() => stepOnceFSA(0, q1.name, dfa)).to.throw(TypeError);
        expect(() => stepOnceFSA(() => {}, q1.name, dfa)).to.throw(TypeError);

        expect(() => stepOnceFSA("0", null, dfa, true)).to.throw(TypeError);
        expect(() => stepOnceFSA("0", undefined, dfa)).to.throw(TypeError);
        expect(() => stepOnceFSA("0", 0, dfa)).to.throw(TypeError);
        expect(() => stepOnceFSA("0", () => {}, dfa)).to.throw(TypeError);
      });

      it("Should return valid states for valid transitions", function() {
        assert(stepOnceFSA("0", q1.name, dfa, true) === q1.name);
        assert(stepOnceFSA("1", q1.name, dfa) === q2.name);
      });

      it("Should throw exception for invalid state", function() {
        expect(() => stepOnceFSA("0", "invalid", dfa)).to.throw(ErrorCode.INVALID_STATE_NAME);
      });
    });
  });
});

describe("NFA Simulations", function() {
  // Logging enabled on some tests for code coverage
  describe("Simulators#simulateFSA()", function() {
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

      it("Should not accept invalid w type", () => {
        // Type check clause tested here
        expect(() => simulateFSA(null, nfa, true)).to.throw(TypeError);
        expect(() => simulateFSA(undefined, nfa)).to.throw(TypeError);
        expect(() => simulateFSA(0, nfa)).to.throw(TypeError);
        expect(() => simulateFSA(() => {}, nfa)).to.throw(TypeError);
        expect(() => simulateFSA("xyz", nfa)).to.throw(ErrorCode.INVALID_INPUT_CHAR);
      });

      it("Should accept for 1111/100/111/10101", () => {
        assert(acceptsNames.indexOf(simulateFSA("1111", nfa, true, true)) !== -1); // Demo the NFA logging
        assert(acceptsNames.indexOf(simulateFSA("100", nfa, false, true)) !== -1);
        assert(simulateFSA("111", nfa));
        assert(simulateFSA("10101", nfa));
      });

      it("Should reject for empty/0/10/1110000", () => {
        assert(acceptsNames.indexOf(simulateFSA("", nfa, true, true)) === -1);
        assert(!simulateFSA("0", nfa));
        assert(!simulateFSA(["1", "0"], nfa)); // Use array param for additional code coverage
        assert(!simulateFSA("1110000", nfa));
      });

      it("Should only accept NFAs", () => {
        const test_dfa = new DFA(
          new Set([q1]),
          new Alphabet("01"),
          new Set([new Transition(q1, q1, "0"), new Transition(q1, q1, "1")]),
          q1,
          new Set([q1])
        );
        expect(() => simulateFSA(null, test_dfa, true)).to.throw(TypeError);
      });
    });

    describe("Any binary string with last symbol 0 or all 1s or empty", function() {
      let q1, q2, q3, q4;
      let t1, t2, t3, t4, t5, t6;
      let states, alphabet, accepts, acceptsNames, transitions, nfa;

      before(function() {
        q1 = new State("q1");
        q2 = new State("q2");
        q3 = new State("q3");
        q4 = new State("q4");

        t1 = new NFATransition(q1, [q1], "1");
        t2 = new NFATransition(q2, [q1, q3], "");
        t3 = new NFATransition(q3, [q3, q4], "0");
        t4 = new NFATransition(q3, [q3], "1");

        states = new Set([q1, q2, q3, q4]);
        alphabet = new Alphabet("01");
        transitions = new Set([t1, t2, t3, t4]);
        accepts = new Set([q1, q4]);
        acceptsNames = [q1.name, q4.name];
        nfa = new NFA(states, alphabet, transitions, q2, accepts);
      });

      it("Should accept for empty/11/0/1110/010", () => {
        assert(simulateFSA("", nfa));
        assert(simulateFSA("11", nfa));
        assert(simulateFSA("0", nfa));
        assert(simulateFSA("1110", nfa));
        assert(simulateFSA("010", nfa));
      });

      it("Should reject for 01/1101/01011/", () => {
        assert(!simulateFSA("01", nfa));
        assert(!simulateFSA("1101", nfa));
        assert(!simulateFSA("01011", nfa));
      });
    });

    describe("Accepts 01 or 1 using NFA with circular ε transition", function() {
      let q1, q2, q3, q4;
      let t1, t2, t3, t4, t5;
      let states, alphabet, accepts, acceptsNames, transitions, nfa;

      before(function() {
        q1 = new State("q1");
        q2 = new State("q2");
        q3 = new State("q3");
        q4 = new State("q4");

        t1 = new NFATransition(q1, [q4], "1");
        t2 = new NFATransition(q1, [q2], "");
        t3 = new NFATransition(q2, [q1], "");
        t4 = new NFATransition(q2, [q3], "0");
        t5 = new NFATransition(q3, [q4], "1");

        states = new Set([q1, q2, q3, q4]);
        alphabet = new Alphabet("01");
        transitions = new Set([t1, t2, t3, t4, t5]);
        accepts = new Set([q4]);
        acceptsNames = [q4.name];
        nfa = new NFA(states, alphabet, transitions, q1, accepts);
      });

      it("Should accept for 1/01", () => {
        assert(simulateFSA("1", nfa));
        assert(simulateFSA("01", nfa));
      });

      it("Should reject for empty/0/00/10/010", () => {
        assert(!simulateFSA("", nfa));
        assert(!simulateFSA("0", nfa));
        assert(!simulateFSA("00", nfa));
        assert(acceptsNames.indexOf(simulateFSA("00", nfa, false, true)) === -1);
        assert(!simulateFSA("10", nfa));
        assert(!simulateFSA("010", nfa));
      });
    });
  });

  describe("Simulators#stepOnceFSA()", function() {
    describe("w ends in a 1", function() {
      let q1, q2, q3, q4;
      let t1, t2, t3, t4, t5, t6;
      let states, alphabet, accepts, acceptsNames, transitions, nfa;

      before(function() {
        q1 = new State("q1");
        q2 = new State("q2");
        q3 = new State("q3");
        q4 = new State("q4");

        t1 = new NFATransition(q1, [q1], "1");
        t2 = new NFATransition(q2, [q1, q3], "");
        t3 = new NFATransition(q3, [q3, q4], "0");
        t4 = new NFATransition(q3, [q3], "1");

        states = new Set([q1, q2, q3, q4]);
        alphabet = new Alphabet("01");
        transitions = new Set([t1, t2, t3, t4]);
        accepts = new Set([q1, q4]);
        acceptsNames = [q1.name, q4.name];
        nfa = new NFA(states, alphabet, transitions, q2, accepts);
      });

      it("Should return valid states for valid transitions", function() {
        assert(compare(stepOnceFSA("", q2.name, nfa, true), [q1.name, q2.name, q3.name]));
        assert(compare(stepOnceFSA("0", [q1.name, q3.name], nfa), [q3.name, q4.name]));
      });

      it("Should throw exception for invalid states", function() {
        expect(() => stepOnceFSA("0", ["q1", "invalid"], nfa)).to.throw(ErrorCode.INVALID_STATE_NAME);
      });
    });
  });
});
