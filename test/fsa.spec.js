import { FSA, State, Alphabet, Transition, ErrorCode, isSubSet } from "../lib/modules.js";
var assert = require("chai").assert;
var expect = require("chai").expect;

describe("FSA Creation", function() {
  describe("FSA#constructor()", function() {
    let q1;
    let q2;

    let states;
    let alphabet;
    let accepts;

    let t1;
    let t2;
    let t3;
    let t4;
    let transitions;

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
      const fas = new FSA(states, alphabet, transitions, q1, accepts);

      assert(fas.states === states);
      assert(fas.alphabet === alphabet);
      assert(isSubSet(fas.tfunc, transitions)); // tfunc can be reduced
      assert(fas.start === q1);
      assert(fas.accepts === accepts);
      assert(fas.paths.size === 0);
    });

    it("Should allow accepts to be empty set", function() {
      const emptySet = new Set([]);
      const fas = new FSA(states, alphabet, transitions, q1, emptySet);
      assert(fas.accepts === emptySet);
    });

    it("Should fail because states contains duplicates", function() {
      expect(() => new FSA(new Set([new State("q1"), new State("q1")]), alphabet, transitions, q1, accepts)).to.throw(
        ErrorCode.DUPLICATE_STATE_NAMES
      );
    });

    it("Should fail because start state not in states", function() {
      expect(() => new FSA(states, alphabet, transitions, new State("q1"), accepts)).to.throw(
        ErrorCode.START_STATE_NOT_FOUND
      );
    });

    it("Should fail because accept states are not subset of states", function() {
      expect(() => new FSA(states, alphabet, transitions, q1, new Set([new State("q1")]))).to.throw(
        ErrorCode.ACCEPTS_NOT_SUBSET
      );
    });
  });

  describe("FSA#validateTFunc()", function() {
    let q1;
    let q2;
    let q3;

    let states;
    let alphabet;
    let accepts;

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
      expect(() => new FSA(states, alphabet, transitions, q1, accepts)).to.throw(ErrorCode.MISSING_REQUIRED_TRANSITION);
    });

    it("Should not allow invalid Transition origin state", function() {
      const t1 = new Transition(new State("q1"), q1, "a");
      const transitions = new Set([t1]);
      expect(() => new FSA(states, alphabet, transitions, q1, accepts)).to.throw(ErrorCode.ORIGIN_STATE_NOT_FOUND);
    });

    it("Should not allow invalid Transition dest state", function() {
      const t1 = new Transition(q1, new State("q1"), "a");
      const transitions = new Set([t1]);
      expect(() => new FSA(states, alphabet, transitions, q1, accepts)).to.throw(ErrorCode.DEST_STATE_NOT_FOUND);
    });

    it("Should fail because required transition is missing", function() {
      const t1 = new Transition(q1, q1, "a");
      const t2 = new Transition(q1, q2, "b");
      const t3 = new Transition(q2, q2, "a");
      const transitions = new Set([t1, t2, t3]);
      expect(() => new FSA(states, alphabet, transitions, q1, accepts)).to.throw(ErrorCode.MISSING_REQUIRED_TRANSITION);
    });

    it("Should reduce tfunc if additional transitions found or invalid transition", function() {
      const t1 = new Transition(q1, q1, "x"); // Should be ignored - invalid input symbol
      const t2 = new Transition(q1, q2, "b");
      const t3 = new Transition(q2, q2, "a");
      const t4 = new Transition(q2, q1, "b");
      const t5 = new Transition(q2, q2, "b"); // Should be ignored - duplicate origin/dest
      const t6 = new Transition(q1, q1, "a");
      const transitions = new Set([t1, t2, t3, t4, t5, t6]);

      const fas = new FSA(states, alphabet, transitions, q1, accepts);
      assert(isSubSet(fas.tfunc, transitions));
      assert(fas.tfunc.has(t4) && !fas.tfunc.has(t5) && !fas.tfunc.has(t1));
      assert(fas.paths.size === 0);
    });
  });
});
