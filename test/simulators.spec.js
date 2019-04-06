import { simulateFSA, stepOnceFSA } from "../src/modules.js";
import { DFA } from "../src/classes/DFA.js";
import { State } from "../src/classes/State.js";
import { Alphabet } from "../src/classes/Alphabet.js";
import { DFATransition } from "../src/classes/DFATransition.js";
import { ErrorCode } from "../src/globals/errors.js";
var assert = require("chai").assert;
var expect = require("chai").expect;

describe("DFA Simulations", function() {
  describe("Simulators#simulateFSA()", function() {
    describe("w ends in a 1", function() {
      // Logging enabled on some tests for code coverage
      let q1, q2;
      let t1, t2, t3, t4;
      let states, alphabet, accepts, acceptsNames, transitions, fsa;

      before(function() {
        q1 = new State("q1");
        q2 = new State("q2");

        t1 = new DFATransition(q1, q1, "0");
        t2 = new DFATransition(q1, q2, "1");
        t3 = new DFATransition(q2, q2, "1");
        t4 = new DFATransition(q2, q1, "0");

        states = new Set([q1, q2]);
        alphabet = new Alphabet("01");
        transitions = new Set([t1, t2, t3, t4]);
        accepts = new Set([q2]);
        acceptsNames = [q2.name];
        fsa = new DFA(states, alphabet, transitions, q1, accepts);
      });

      it("Should not accept invalid w type", function() {
        // Type check clause tested here
        expect(() => simulateFSA(null, fsa, true)).to.throw(TypeError);
        expect(() => simulateFSA(undefined, fsa)).to.throw(TypeError);
        expect(() => simulateFSA(0, fsa)).to.throw(TypeError);
        expect(() => simulateFSA(() => {}, fsa)).to.throw(TypeError);
      });

      it("Should accept for 101/1/111/10101", function() {
        assert(acceptsNames.indexOf(simulateFSA("101", fsa, true)) !== -1);
        assert(acceptsNames.indexOf(simulateFSA("1", fsa)) !== -1);
        assert(acceptsNames.indexOf(simulateFSA("111", fsa)) !== -1);
        assert(acceptsNames.indexOf(simulateFSA("10101", fsa)) !== -1);
      });

      it("Should reject for empty/0/10/0110/xyz", function() {
        assert(acceptsNames.indexOf(simulateFSA("", fsa, true)) === -1);
        assert(acceptsNames.indexOf(simulateFSA("0", fsa)) === -1);
        assert(acceptsNames.indexOf(simulateFSA("10", fsa)) === -1);
        assert(acceptsNames.indexOf(simulateFSA("0110", fsa)) === -1);
        assert(simulateFSA("xyz", fsa) === "q1" && acceptsNames.indexOf("q1") === -1);
      });
    });

    describe("w starts and ends with same symbol", function() {
      let s, q1, q2, r1, r2;
      let t1, t2, t3, t4, t5, t6, t7, t8, t9, t10;
      let states, alphabet, accepts, acceptsNames, transitions, fsa;

      before(function() {
        s = new State("s");
        q1 = new State("q1");
        q2 = new State("q2");
        r1 = new State("r1");
        r2 = new State("r2");

        t1 = new DFATransition(s, q1, "a");
        t2 = new DFATransition(s, r1, "b");
        t3 = new DFATransition(q1, q1, "a");
        t4 = new DFATransition(q1, q2, "b");
        t5 = new DFATransition(q2, q1, "a");
        t6 = new DFATransition(q2, q2, "b");
        t7 = new DFATransition(r1, r2, "a");
        t8 = new DFATransition(r1, r1, "b");
        t9 = new DFATransition(r2, r2, "a");
        t10 = new DFATransition(r2, r1, "b");

        states = new Set([s, q1, q2, r1, r2]);
        alphabet = new Alphabet("ab");
        transitions = new Set([t1, t2, t3, t4, t5, t6, t7, t8, t9, t10]);
        accepts = new Set([r1, q1]);
        acceptsNames = [r1.name, q1.name];
        fsa = new DFA(states, alphabet, transitions, s, accepts);
      });

      it("Should accept for a/b/aa/bab/ababba", function() {
        assert(acceptsNames.indexOf(simulateFSA("a", fsa)) !== -1);
        assert(acceptsNames.indexOf(simulateFSA("b", fsa)) !== -1);
        assert(acceptsNames.indexOf(simulateFSA("aa", fsa)) !== -1);
        assert(acceptsNames.indexOf(simulateFSA("bab", fsa)) !== -1);
        assert(acceptsNames.indexOf(simulateFSA("ababba", fsa)) !== -1);
      });

      it("Should reject for empty/ab/aab/baba/baxb", function() {
        assert(acceptsNames.indexOf(simulateFSA("", fsa)) === -1);
        assert(acceptsNames.indexOf(simulateFSA("ab", fsa)) === -1);
        assert(acceptsNames.indexOf(simulateFSA("aab", fsa)) === -1);
        assert(acceptsNames.indexOf(simulateFSA("baba", fsa)) === -1);
        assert(simulateFSA("baxb", fsa) === "r2" && acceptsNames.indexOf("r2") === -1);
      });
    });
  });

  describe("Simulators#stepOnceFSA()", function() {
    describe("w ends in a 1", function() {
      // Logging enabled on some tests for code coverage
      let q1, q2;
      let t1, t2, t3, t4;
      let states, alphabet, accepts, transitions, fsa;

      before(function() {
        q1 = new State("q1");
        q2 = new State("q2");

        t1 = new DFATransition(q1, q1, "0");
        t2 = new DFATransition(q1, q2, "1");
        t3 = new DFATransition(q2, q2, "1");
        t4 = new DFATransition(q2, q1, "0");

        states = new Set([q1, q2]);
        alphabet = new Alphabet("01");
        transitions = new Set([t1, t2, t3, t4]);
        accepts = new Set([q2]);
        fsa = new DFA(states, alphabet, transitions, q1, accepts);
      });

      it("Should not accept invalid w type", function() {
        // Type check clauses tested here
        expect(() => stepOnceFSA(null, q1.name, fsa, true)).to.throw(TypeError);
        expect(() => stepOnceFSA(undefined, q1.name, fsa)).to.throw(TypeError);
        expect(() => stepOnceFSA(0, q1.name, fsa)).to.throw(TypeError);
        expect(() => stepOnceFSA(() => {}, q1.name, fsa)).to.throw(TypeError);

        expect(() => stepOnceFSA("0", null, fsa, true)).to.throw(TypeError);
        expect(() => stepOnceFSA("0", undefined, fsa)).to.throw(TypeError);
        expect(() => stepOnceFSA("0", 0, fsa)).to.throw(TypeError);
        expect(() => stepOnceFSA("0", () => {}, fsa)).to.throw(TypeError);
      });

      it("Should return valid states for valid transitions", function() {
        assert(stepOnceFSA("0", q1.name, fsa, true) === q1.name);
        assert(stepOnceFSA("1", q1.name, fsa) === q2.name);
      });

      it("Should throw exception for invalid state", function() {
        expect(() => stepOnceFSA("0", "invalid", fsa)).to.throw(ErrorCode.INVALID_STATE_NAME);
      });
    });
  });
});
