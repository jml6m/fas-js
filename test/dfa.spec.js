import Set from "core-js/features/set";
import { DFA, createDFA } from "../src/automata";
import { State, Alphabet, Transition } from "../src/components";
import { ErrorCode } from "../src/globals/errors.js";

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

      assert(dfa.getStates() === states);
      assert(dfa.getAlphabet() === alphabet);
      assert(dfa.getTFunc().isSubsetOf(transitions)); // tfunc can be reduced
      assert(dfa.getStartState() === q1);
      assert(dfa.getAcceptStates() === accepts);
    });

    it("Should have no public attributes", function() {
      const dfa = new DFA(states, alphabet, transitions, q1, accepts);
      assert(Object.getOwnPropertyNames(dfa).length === 0);
    });

    it("Should allow accepts to be empty set", function() {
      const emptySet = new Set([]);
      const dfa = new DFA(states, alphabet, transitions, q1, emptySet);
      const dfa2 = new DFA(states, alphabet, transitions, q1, {});
      assert(dfa.getAcceptStates() === emptySet);
      assert(dfa2.getAcceptStates().size === 0);
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

    it("Should return valid class attributes with dead states removed", function() {
      const dfa = new DFA(states, alphabet, transitions, q1, accepts);

      assert(dfa.getStates().isSubsetOf(states));
      assert(dfa.getAlphabet() === alphabet);
      assert(dfa.getTFunc().isSubsetOf(transitions)); // tfunc can be reduced
      assert(dfa.getStartState() === q1);
      assert(dfa.getAcceptStates().isSubsetOf(accepts));
    });
  });

  describe("DFA#validateTFunc()", function() {
    let q1, q2;
    let t1, t2, t3, t4;
    let states, alphabet, accepts;

    before(function() {
      q1 = new State("q1");
      q2 = new State("q2");

      t1 = new Transition(q1, q1, "a");
      t2 = new Transition(q1, q2, "b");
      t3 = new Transition(q2, q1, "a");
      t4 = new Transition(q2, q2, "b");

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

    it("Should not allow invalid Transition input char", function() {
      const t5 = new Transition(q1, q2, "z");
      const transitions = new Set([t1, t2, t3, t4, t5]);
      expect(() => new DFA(states, alphabet, transitions, q1, accepts)).to.throw(ErrorCode.INVALID_INPUT_CHAR);
    });

    it("Should fail because required transition is missing", function() {
      const t1 = new Transition(q1, q1, "a");
      const t2 = new Transition(q1, q2, "b");
      const t3 = new Transition(q2, q2, "a");
      const transitions = new Set([t1, t2, t3]);
      expect(() => new DFA(states, alphabet, transitions, q1, accepts)).to.throw(ErrorCode.MISSING_REQUIRED_TRANSITION);
    });

    it("Should not allow duplicate transition", function() {
      const t5 = new Transition(q1, q2, "a");
      const transitions = new Set([t1, t2, t3, t4, t5]);
      expect(() => new DFA(states, alphabet, transitions, q1, accepts)).to.throw(ErrorCode.DUPLICATE_TRANSITION_OBJECT);
    });
  });

  describe("DFA#generateDigraph()", function() {
    let q1, q2, q3;
    let t1, t2, t3, t4, t5, t6;
    let states, alphabet, accepts, transitions, dfa;

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
      dfa = new DFA(states, alphabet, transitions, q1, accepts);
    });

    it("Should generate correct digraph with dead states removed", function() {
      const digraph = dfa.generateDigraph();
      assert(digraph.includes("digraph fsa"));
      assert(digraph.includes("q2 [shape = doublecircle];"));
      assert(digraph.includes("node [shape = point ]; qi;"));
      assert(digraph.includes("qi -> q1;"));
      assert(digraph.includes('q1 -> q1 [ label = "a" ];'));
      assert(digraph.includes('q1 -> q2 [ label = "b" ];'));
      assert(digraph.includes('q2 -> q1 [ label = "a" ];'));
      assert(digraph.includes('q2 -> q2 [ label = "b" ];'));
    });
  });

  describe("DFA#createDFA()", function() {
    let states, aph, tr, tr2, tr3;

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
      tr3 = { from: "q1", to: "q1" };
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

      // Invalid transition object
      expect(() => createDFA(states, aph, tr3, "q1", states)).to.throw(ErrorCode.INVALID_TRANSITION_OBJECT);
    });

    it("Should successfully create the DFA", function() {
      expect(() => createDFA(states, aph, tr, "q1", states)).to.not.throw();
      expect(() => createDFA(states, aph, tr, "q1", "q1")).to.not.throw();
      expect(() => createDFA("q1", "0", tr2, "q1", "q1")).to.not.throw();
    });
  });
});
