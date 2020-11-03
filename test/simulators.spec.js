import { simulateFSA, stepOnceFSA } from "../src/modules.js";
import { DFA, NFA, RegEx } from "../src/automata";
import { State, Alphabet, Transition, NFATransition } from "../src/components";
import { ErrorCode } from "../src/globals/errors.js";
import { compare } from "../src/globals/globals.js";

const chai = require("chai");
const assert = chai.assert;
const expect = chai.expect;

describe("DFA Simulations", function () {
  // Logging enabled on some tests for code coverage
  describe("Simulators#simulateFSA()", function () {
    describe("w ends in a 1", function () {
      let q1, q2;
      let t1, t2, t3, t4;
      let states, alphabet, accepts, acceptsNames, transitions, dfa;

      before(function () {
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

      it("Should not accept invalid w type", function () {
        // Type check clauses tested here
        expect(() => simulateFSA(null, dfa, true)).to.throw(TypeError);
        expect(() => simulateFSA(undefined, dfa)).to.throw(TypeError);
        expect(() => simulateFSA(0, dfa)).to.throw(TypeError);
        expect(() => simulateFSA([0, 1, 2], dfa)).to.throw(TypeError);
        expect(() => simulateFSA(() => {}, dfa)).to.throw(TypeError);
        expect(() => simulateFSA("xyz", dfa)).to.throw(ErrorCode.INVALID_INPUT_CHAR);
      });

      it("Should accept for 101/1/111/10101", function () {
        assert(acceptsNames.indexOf(simulateFSA("101", dfa, true, true)) !== -1);
        assert(acceptsNames.indexOf(simulateFSA("1", dfa, undefined, true)) !== -1); // undefined or false can be used if returnEndState param is passed in
        assert(simulateFSA("111", dfa));
        assert(simulateFSA("10101", dfa));
      });

      it("Should reject for empty/0/10/0110/xyz", function () {
        assert(!simulateFSA("", dfa));
        assert(acceptsNames.indexOf(simulateFSA("0", dfa, true, true)) === -1);
        assert(!simulateFSA("0", dfa));
        assert(!simulateFSA("10", dfa));
        assert(!simulateFSA("0110", dfa));
      });
    });

    describe("w starts and ends with same symbol", function () {
      let s, q1, q2, r1, r2;
      let t1, t2, t3, t4, t5, t6, t7, t8, t9, t10;
      let states, alphabet, accepts, acceptsNames, transitions, dfa;

      before(function () {
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

      it("Should accept for a/b/aa/bab/ababba", function () {
        assert(simulateFSA("a", dfa));
        assert(simulateFSA("b", dfa));
        assert(simulateFSA(["a", "a"], dfa)); // Use array param for additional code coverage
        assert(simulateFSA("bab", dfa));
        assert(simulateFSA("ababba", dfa));
      });

      it("Should reject for empty/ab/aab/baba/baxb", function () {
        assert(!simulateFSA("", dfa));
        assert(!simulateFSA("ab", dfa));
        assert(!simulateFSA("aab", dfa));
        assert(!simulateFSA("baba", dfa));
      });
    });
  });

  // Logging enabled on some tests for code coverage
  describe("Simulators#stepOnceFSA()", function () {
    describe("w ends in a 1", function () {
      let q1, q2;
      let t1, t2, t3, t4;
      let ndt1, ndt2, ndt3, ndt4;
      let states, alphabet, accepts, transitions, nfaTFunc, dfa, nfa;

      before(function () {
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

      it("Should not accept invalid w type", function () {
        // Type check clauses tested here
        expect(() => stepOnceFSA(null, q1.name, dfa, true)).to.throw(TypeError);
        expect(() => stepOnceFSA(undefined, q1.name, dfa)).to.throw(TypeError);
        expect(() => stepOnceFSA(0, q1.name, dfa)).to.throw(TypeError);
        expect(() => stepOnceFSA([0, 1, 2], q1.name, dfa)).to.throw(TypeError);
        expect(() => stepOnceFSA(() => {}, q1.name, dfa)).to.throw(TypeError);

        expect(() => stepOnceFSA("0", null, dfa, true)).to.throw(TypeError);
        expect(() => stepOnceFSA("0", undefined, dfa)).to.throw(TypeError);
        expect(() => stepOnceFSA("0", 0, dfa)).to.throw(TypeError);
        expect(() => stepOnceFSA("0", () => {}, dfa)).to.throw(TypeError);
      });

      it("Should return valid states for valid transitions", function () {
        assert(stepOnceFSA("0", q1.name, dfa, true) === q1.name);
        assert(stepOnceFSA("1", q1.name, dfa) === q2.name);
      });

      it("Should throw exception for invalid state", function () {
        expect(() => stepOnceFSA("0", "invalid", dfa)).to.throw(ErrorCode.INVALID_STATE_NAME);
      });
    });
  });
});

describe("NFA Simulations", function () {
  // Logging enabled on some tests for code coverage
  describe("Simulators#simulateFSA()", function () {
    describe("w contains 1 in third or second position from the end", function () {
      let q1, q2, q3, q4;
      let t1, t2, t3, t4, t5, t6, t7;
      let states, alphabet, accepts, acceptsNames, transitions, nfa;

      before(function () {
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
        t7 = new NFATransition(q2, [q3], "");

        states = new Set([q1, q2, q3, q4]);
        alphabet = new Alphabet("01");
        transitions = new Set([t1, t2, t3, t4, t5, t6, t7]);
        accepts = new Set([q4]);
        acceptsNames = [q4.name];
        nfa = new NFA(states, alphabet, transitions, q1, accepts);
      });

      it("Should not accept invalid w type", () => {
        // Type check clauses tested here
        expect(() => simulateFSA(null, nfa, true)).to.throw(TypeError);
        expect(() => simulateFSA(undefined, nfa)).to.throw(TypeError);
        expect(() => simulateFSA(0, nfa)).to.throw(TypeError);
        expect(() => simulateFSA([0, 1, 2], nfa)).to.throw(TypeError);
        expect(() => simulateFSA(() => {}, nfa)).to.throw(TypeError);
        expect(() => simulateFSA("xyz", nfa)).to.throw(ErrorCode.INVALID_INPUT_CHAR);
      });

      it("Should accept for 1111/100/0101/10", () => {
        assert(compare(simulateFSA("1111", nfa, true, true), acceptsNames)); // Demo the NFA logging
        assert(compare(simulateFSA("100", nfa, false, true), acceptsNames));
        assert(simulateFSA("0101", nfa, true));
        assert(simulateFSA("10", nfa));
      });

      it("Should reject for empty/0/00/1110000", () => {
        assert(!compare(simulateFSA("", nfa, true, true), acceptsNames));
        assert(!simulateFSA("0", nfa));
        assert(!simulateFSA(["0", "0"], nfa)); // Use array param for additional code coverage
        assert(!compare(simulateFSA("1110000", nfa, false, true), acceptsNames));
      });
    });

    describe("Test NFA with eps transition to accept state", function () {
      let q1, q2, q3, q4, q5;
      let t1, t2, t3, t4, t5, t6, t7, t8, t9;
      let states, alphabet, accepts, acceptsNames, transitions, nfa;

      before(function () {
        q1 = new State("q1");
        q2 = new State("q2");
        q3 = new State("q3");
        q4 = new State("q4");
        q5 = new State("q5");

        t1 = new NFATransition(q1, [q2], "a");
        t2 = new NFATransition(q2, [q2], "a");
        t3 = new NFATransition(q2, [q3], "");
        t4 = new NFATransition(q3, [q3], "b");
        t5 = new NFATransition(q3, [q4], "a");
        t6 = new NFATransition(q3, [q4], "b");
        t7 = new NFATransition(q4, [q4], "a");
        t8 = new NFATransition(q4, [q2], "b");
        t9 = new NFATransition(q4, [q5], "");

        states = new Set([q1, q2, q3, q4, q5]);
        alphabet = new Alphabet("ab");
        transitions = new Set([t1, t2, t3, t4, t5, t6, t7, t8, t9]);
        accepts = new Set([q5]);
        acceptsNames = [q5.name];
        nfa = new NFA(states, alphabet, transitions, q1, accepts);
      });

      it("Should accept valid inputs", () => {
        assert(simulateFSA("aa", nfa));
        assert(simulateFSA("aaa", nfa, true));
        assert(simulateFSA("aab", nfa));
        assert(simulateFSA("abbabbabbba", nfa));
        assert(simulateFSA("abbabbaaab", nfa));
      });

      it("Should reject invalid inupts", () => {
        assert(!simulateFSA("", nfa));
        assert(!simulateFSA("a", nfa));
        assert(!simulateFSA("b", nfa));
        assert(!simulateFSA("baaa", nfa));
      });
    });

    describe("Accepts 01 or 1 using NFA with circular ε transition", function () {
      let q1, q2, q3, q4;
      let t1, t2, t3, t4, t5;
      let states, alphabet, accepts, acceptsNames, transitions, nfa;

      before(function () {
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
        assert(!compare(simulateFSA("00", nfa, false, true), acceptsNames));
        assert(!simulateFSA("10", nfa));
        assert(!simulateFSA("010", nfa));
      });
    });
  });

  describe("Simulators#stepOnceFSA()", function () {
    describe("w ends in a 1", function () {
      let q1, q2, q3, q4;
      let t1, t2, t3, t4, t5, t6;
      let states, alphabet, accepts, acceptsNames, transitions, nfa;

      before(function () {
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

      it("Should return valid states for valid transitions", function () {
        assert(compare(stepOnceFSA("", q2.name, nfa, true), [q1.name, q2.name, q3.name]));
        assert(compare(stepOnceFSA("0", [q1.name, q3.name], nfa), [q3.name, q4.name]));
      });

      it("Should throw exception for invalid states", function () {
        expect(() => stepOnceFSA("0", ["q1", "invalid"], nfa)).to.throw(ErrorCode.INVALID_STATE_NAME);
      });
    });
  });
});

describe("RegEx Simulations", function () {
  // Logging enabled on some tests for code coverage
  describe("Simulators#simulateFSA()", function () {
    describe("empty regex", function () {
      let regex, alphabet, _rx0;

      before(function () {
        regex = "";
        alphabet = new Alphabet(["0", "1"]);

        _rx0 = new RegEx(regex, alphabet);
      });

      it("Should accept for empty", () => {
        assert(simulateFSA("", _rx0));
      });

      it("Should reject for 0/00", () => {
        assert(!simulateFSA("0", _rx0));
        assert(!simulateFSA("00", _rx0));
      });
    });

    describe("0*10*", function () {
      let regex, alphabet, acceptsNames, _rx0;

      before(function () {
        regex = "0%s10%s";
        alphabet = new Alphabet(["0", "1"]);
        acceptsNames = ["q6"];

        _rx0 = new RegEx(regex, alphabet);
      });

      it("Should not accept invalid w type", () => {
        // Type check clauses tested here
        expect(() => simulateFSA(null, _rx0, true)).to.throw(TypeError);
        expect(() => simulateFSA(undefined, _rx0)).to.throw(TypeError);
        expect(() => simulateFSA(0, _rx0)).to.throw(TypeError);
        expect(() => simulateFSA([0, 1, 2], _rx0)).to.throw(TypeError);
        expect(() => simulateFSA(() => {}, _rx0)).to.throw(TypeError);
        expect(() => simulateFSA("xyz", _rx0)).to.throw(ErrorCode.INVALID_INPUT_CHAR);
      });

      it("Should accept for 01/010/0100", () => {
        assert(compare(simulateFSA("01", _rx0, true, true), acceptsNames)); // Demo the NFA logging
        assert(compare(simulateFSA("010", _rx0, false, true), acceptsNames));
        assert(simulateFSA("0100", _rx0, true));
      });

      it("Should reject for empty/0/00", () => {
        assert(!compare(simulateFSA("", _rx0, true, true), acceptsNames));
        assert(!simulateFSA("0", _rx0));
        assert(!simulateFSA(["0", "0"], _rx0)); // Use array param for additional code coverage
      });
    });

    describe("1*0+", function () {
      let regex, alphabet, _rx0;

      before(function () {
        regex = "1%s0%p";
        alphabet = new Alphabet(["0", "1"]);

        _rx0 = new RegEx(regex, alphabet);
      });

      it("Should accept for 0/10/100000", () => {
        assert(simulateFSA("0", _rx0));
        assert(simulateFSA("10", _rx0));
        assert(simulateFSA("100000", _rx0));
      });

      it("Should reject for empty/1/01", () => {
        assert(!simulateFSA("", _rx0));
        assert(!simulateFSA("1", _rx0));
        assert(!simulateFSA("01", _rx0));
      });
    });

    describe("1+0", function () {
      let regex, alphabet, _rx0;

      before(function () {
        regex = "1%p0";
        alphabet = new Alphabet(["0", "1"]);

        _rx0 = new RegEx(regex, alphabet);
      });

      it("Should accept for 10/110/1111110", () => {
        assert(simulateFSA("10", _rx0));
        assert(simulateFSA("110", _rx0));
        assert(simulateFSA("1111110", _rx0));
      });

      it("Should reject for empty/0/11010", () => {
        assert(!simulateFSA("", _rx0));
        assert(!simulateFSA("0", _rx0));
        assert(!simulateFSA("11010", _rx0));
      });
    });

    describe("01∪0*", function () {
      let regex, alphabet, _rx0;

      before(function () {
        regex = "01%u0%s";
        alphabet = new Alphabet(["0", "1"]);

        _rx0 = new RegEx(regex, alphabet);
      });

      it("Should accept for empty/0/01/0000", () => {
        assert(simulateFSA("", _rx0));
        assert(simulateFSA("0", _rx0));
        assert(simulateFSA("01", _rx0));
        assert(simulateFSA("0000", _rx0));
      });

      it("Should reject for 1/010/000001", () => {
        assert(!simulateFSA("1", _rx0));
        assert(!simulateFSA("010", _rx0));
        assert(!simulateFSA("000001", _rx0));
      });
    });
  });

  describe("Simulators#stepOnceFSA()", function () {
    describe("w ends in a 1", function () {
      /*       let q1, q2, q3, q4;
      let t1, t2, t3, t4, t5, t6;
      let states, alphabet, accepts, acceptsNames, transitions, nfa;

      before(function () {
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

      it("Should return valid states for valid transitions", function () {
        assert(compare(stepOnceFSA("", q2.name, nfa, true), [q1.name, q2.name, q3.name]));
        assert(compare(stepOnceFSA("0", [q1.name, q3.name], nfa), [q3.name, q4.name]));
      });

      it("Should throw exception for invalid states", function () {
        expect(() => stepOnceFSA("0", ["q1", "invalid"], nfa)).to.throw(ErrorCode.INVALID_STATE_NAME);
      }); */
    });
  });
});
