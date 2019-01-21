import { simulateFSA } from "../src/modules.js";
import { FSA } from "../src/classes/FSA.js";
import { State } from "../src/classes/State.js";
import { Alphabet } from "../src/classes/Alphabet.js";
import { Transition } from "../src/classes/Transition.js";
var assert = require("chai").assert;
var expect = require("chai").expect;

describe("FSA Simulations", function() {
  describe("w ends in a 1", function() {
    let q1, q2;
    let t1, t2, t3, t4;
    let states, alphabet, accepts, transitions, fsa;

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
      fsa = new FSA(states, alphabet, transitions, q1, accepts);
    });

    it("Should not accept invalid w type", function() { // Type check clause tested here
      expect(() => simulateFSA(null, fsa)).to.throw(TypeError);
      expect(() => simulateFSA(undefined, fsa)).to.throw(TypeError);
      expect(() => simulateFSA(0, fsa)).to.throw(TypeError);
      expect(() => simulateFSA(() => {}, fsa)).to.throw(TypeError);
    });

    it("Should accept for 101/1/111/10101", function() {
      assert.isOk(simulateFSA("101", fsa));
      assert.isOk(simulateFSA("1", fsa));
      assert.isOk(simulateFSA("111", fsa));
      assert.isOk(simulateFSA("10101", fsa));
    });

    it("Should reject for empty/0/10/0110/xyz", function() {
      assert.isNotOk(simulateFSA("", fsa));
      assert.isNotOk(simulateFSA("0", fsa));
      assert.isNotOk(simulateFSA("10", fsa));
      assert.isNotOk(simulateFSA("0110", fsa));
      assert.isNotOk(simulateFSA("xyz", fsa));
    });
  });

  describe("w starts and ends with same symbol", function() {
    let s, q1, q2, r1, r2;
    let t1, t2, t3, t4, t5, t6, t7, t8, t9, t10;
    let states, alphabet, accepts, transitions, fsa;

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
      fsa = new FSA(states, alphabet, transitions, s, accepts);
    });

    it("Should accept for a/b/aa/bab/ababba", function() {
      assert.isOk(simulateFSA("a", fsa));
      assert.isOk(simulateFSA("b", fsa));
      assert.isOk(simulateFSA("aa", fsa));
      assert.isOk(simulateFSA("bab", fsa));
      assert.isOk(simulateFSA("ababba", fsa));
    });

    it("Should reject for empty/ab/aab/baba/baxb", function() {
      assert.isNotOk(simulateFSA("", fsa));
      assert.isNotOk(simulateFSA("ab", fsa));
      assert.isNotOk(simulateFSA("aab", fsa));
      assert.isNotOk(simulateFSA("baba", fsa));
      assert.isNotOk(simulateFSA("baxb", fsa));
    });
  });
});
