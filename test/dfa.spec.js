import { State } from "../src/classes/State.js";
import { DFA, createDFA } from "../src/classes/DFA.js";
import { Alphabet } from "../src/classes/Alphabet.js";
import { Transition } from "../src/classes/Transition.js";
import { ErrorCode } from "../src/globals/errors.js";
import { isSubSet } from "../src/globals/globals.js";
var assert = require("chai").assert;
var expect = require("chai").expect;

describe("DFA Creation", function() {
  describe("DFA#constructor()", function() {
    let q1, q2;
    let t1, t2, t3, t4;
    let states, alphabet, accepts, transitions;

    before(function() {
      q1 = new State("q1");
      q2 = new State("q2");

      states = new Set([q1, q2]);
      alphabet = new Alphabet("ab");
      accepts = new Set([q2]);

      t1 = new Transition(q1, q1, "a");
      t2 = new Transition(q1, q2, "b");
      t3 = new Transition(q2, q1, "a");
      t4 = new Transition(q2, q2, "b");
      transitions = new Set([t1, t2, t3, t4]);
    });

    it("Should return valid class attributes", function() {
      const dfa = new DFA(states, alphabet, transitions, q1, accepts);

      assert(dfa.states === states);
      assert(dfa.alphabet === alphabet);
      assert(isSubSet(dfa.tfunc, transitions)); // tfunc can be reduced
      assert(dfa.start === q1);
      assert(dfa.accepts === accepts);
      assert(dfa.paths.size === 0);
    });

    it("Should allow accepts to be empty set", function() {
      const emptySet = new Set([]);
      const dfa = new DFA(states, alphabet, transitions, q1, emptySet);
      const dfa2 = new DFA(states, alphabet, transitions, q1, {});
      assert(dfa.accepts === emptySet);
      assert(dfa2.accepts.size === 0);
    });

    it("Should fail because states contains duplicates", function() {
      expect(() => new DFA(new Set([new State("q1"), new State("q1")]), alphabet, transitions, q1, accepts)).to.throw(
        ErrorCode.DUPLICATE_STATE_NAMES
      );
    });

    it("Should fail because start state not in states", function() {
      expect(() => new DFA(states, alphabet, transitions, new State("q1"), accepts)).to.throw(
        ErrorCode.START_STATE_NOT_FOUND
      );
    });

    it("Should fail because accept states are not subset of states", function() {
      expect(() => new DFA(states, alphabet, transitions, q1, new Set([new State("q1")]))).to.throw(
        ErrorCode.ACCEPTS_NOT_SUBSET
      );
      expect(() => new DFA(new Set([q1]), alphabet, transitions, q1, new Set([q1, q2]))).to.throw(
        ErrorCode.ACCEPTS_NOT_SUBSET
      );
    });
  });

  describe("DFA#constructor() with dead states", function() {
    let q1, q2, q3;
    let t1, t2, t3, t4, t5, t6;
    let states, alphabet, accepts, transitions;

    before(function() {
      q1 = new State("q1");
      q2 = new State("q2");
      q3 = new State("q3");

      states = new Set([q1, q2, q3]);
      alphabet = new Alphabet("ab");
      accepts = new Set([q2, q3]);

      t1 = new Transition(q1, q1, "a");
      t2 = new Transition(q1, q2, "b");
      t3 = new Transition(q2, q1, "a");
      t4 = new Transition(q2, q2, "b");
      t5 = new Transition(q3, q3, "a");
      t6 = new Transition(q3, q3, "b");
      transitions = new Set([t1, t2, t3, t4, t5, t6]);
    });

    it("Should return valid class attributes", function() {
      const dfa = new DFA(states, alphabet, transitions, q1, accepts);
      states.delete(q3);
      accepts.delete(q3);
      transitions.delete(t5);
      transitions.delete(t6);

      assert(dfa.states === states);
      assert(dfa.alphabet === alphabet);
      assert(isSubSet(dfa.tfunc, transitions)); // tfunc can be reduced
      assert(dfa.start === q1);
      assert(dfa.accepts === accepts);
      assert(dfa.paths.size === 0);
    });
  });

  describe("DFA#validateTFunc()", function() {
    let q1, q2, q3;
    let states, alphabet, accepts;

    before(function() {
      q1 = new State("q1");
      q2 = new State("q2");
      q3 = new State("q3");

      states = new Set([q1, q2]);
      alphabet = new Alphabet("ab");
      accepts = new Set([q2]);
    });

    it("Should not allow empty Transition Set", function() {
      const transitions = new Set([]);
      expect(() => new DFA(states, alphabet, transitions, q1, accepts)).to.throw(ErrorCode.MISSING_REQUIRED_TRANSITION);
    });

    it("Should not allow invalid Transition origin state", function() {
      const t1 = new Transition(new State("q1"), q1, "a");
      const transitions = new Set([t1]);
      expect(() => new DFA(states, alphabet, transitions, q1, accepts)).to.throw(ErrorCode.ORIGIN_STATE_NOT_FOUND);
    });

    it("Should not allow invalid Transition dest state", function() {
      const t1 = new Transition(q1, new State("q1"), "a");
      const transitions = new Set([t1]);
      expect(() => new DFA(states, alphabet, transitions, q1, accepts)).to.throw(ErrorCode.DEST_STATE_NOT_FOUND);
    });

    it("Should fail because required transition is missing", function() {
      const t1 = new Transition(q1, q1, "a");
      const t2 = new Transition(q1, q2, "b");
      const t3 = new Transition(q2, q2, "a");
      const transitions = new Set([t1, t2, t3]);
      expect(() => new DFA(states, alphabet, transitions, q1, accepts)).to.throw(ErrorCode.MISSING_REQUIRED_TRANSITION);
    });

    it("Should reduce tfunc if additional transitions found or invalid transition", function() {
      const t1 = new Transition(q1, q1, "x"); // Should be ignored - invalid input symbol
      const t2 = new Transition(q1, q2, "b");
      const t3 = new Transition(q2, q2, "a");
      const t4 = new Transition(q2, q1, "b");
      const t5 = new Transition(q2, q2, "b"); // Should be ignored - duplicate origin/dest
      const t6 = new Transition(q1, q1, "a");
      const transitions = new Set([t1, t2, t3, t4, t5, t6]);

      const dfa = new DFA(states, alphabet, transitions, q1, accepts);
      assert(isSubSet(dfa.tfunc, transitions));
      assert(dfa.tfunc.has(t4) && !dfa.tfunc.has(t5) && !dfa.tfunc.has(t1));
      assert(dfa.paths.size === 0);
    });
  });

  describe("DFA#createDFA()", function() {
    let states, aph, tr, tr2;

    before(function() {
      states = ["q1", "q2"];
      aph = "01";
      tr = [
        { from: "q1", to: "q2", input: "1" },
        { from: "q2", to: "q1", input: "0" },
        { from: "q2", to: "q2", input: "1" },
        { from: "q1", to: "q1", input: "0" }
      ];
      tr2 = { from: "q1", to: "q1", input: "0" };
    });

    it("Should not accept invalid input types", function() {
      // Invalid states type
      expect(() => createDFA(null, aph, tr, "q1", states)).to.throw(TypeError);
      expect(() => createDFA(undefined, aph, tr, "q1", states)).to.throw(TypeError);
      expect(() => createDFA(0, aph, tr, "q1", states)).to.throw(TypeError);
      expect(() => createDFA(() => {}, aph, tr, "q1", states)).to.throw(TypeError);

      // Invalid transitions type
      expect(() => createDFA(states, aph, null, "q1", states)).to.throw(TypeError);
      expect(() => createDFA(states, aph, undefined, "q1", states)).to.throw(TypeError);
      expect(() => createDFA(states, aph, 0, "q1", states)).to.throw(TypeError);
      expect(() => createDFA(states, aph, () => {}, "q1", states)).to.throw(TypeError);

      // Invalid accepts type
      expect(() => createDFA(states, aph, tr, "q1", null)).to.throw(TypeError);
      expect(() => createDFA(states, aph, tr, "q1", undefined)).to.throw(TypeError);
      expect(() => createDFA(states, aph, tr, "q1", 0)).to.throw(TypeError);
      expect(() => createDFA(states, aph, tr, "q1", () => {})).to.throw(TypeError);

      // Invalid start type
      expect(() => createDFA(states, aph, tr, null, states)).to.throw(TypeError);
      expect(() => createDFA(states, aph, tr, undefined, states)).to.throw(TypeError);
      expect(() => createDFA(states, aph, tr, 0, states)).to.throw(TypeError);
      expect(() => createDFA(states, aph, tr, () => {}, states)).to.throw(TypeError);
    });

    it("Should successfully create the DFA", function() {
      expect(() => createDFA(states, aph, tr, "q1", states)).to.not.throw();
      expect(() => createDFA(states, aph, tr, "q1", "q1")).to.not.throw();
      expect(() => createDFA("q1", "0", tr2, "q1", "q1")).to.not.throw();
    });
  });

  describe("DFA#receiveInput()", function() {
    let q1, q2, q3;
    let t1, t2, t3, t4;
    let states, alphabet, accepts, transitions, dfa;

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
      transitions = new Set([t1, t2, t3, t4]);
      dfa = new DFA(states, alphabet, transitions, q1, accepts);
    });

    it("Should return the destination state", function() {
      assert(dfa.receiveInput("a", q1), q1);
      assert(dfa.receiveInput("b", q1), q2);
    });

    it("Should throw error on invalid input state", function() {
      expect(() => dfa.receiveInput("a", q3)).to.throw(ErrorCode.INPUT_STATE_NOT_FOUND);
    });
  });
});