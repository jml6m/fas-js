import { State } from "../src/classes/State.js";
import { FSA } from "../src/classes/FSA.js";
import { Alphabet } from "../src/classes/Alphabet.js";
import { Transition } from "../src/classes/Transition.js";
import { ErrorCode } from "../src/globals/errors.js";
import { isSubSet } from "../src/globals/globals.js";
import { createFSA } from "../src/modules.js";
var assert = require("chai").assert;
var expect = require("chai").expect;

describe("FSA Creation", function() {
  describe("FSA#constructor()", function() {
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
      const fas2 = new FSA(states, alphabet, transitions, q1, {});
      assert(fas.accepts === emptySet);
      assert(fas2.accepts.size === 0);
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
      expect(() => new FSA(new Set([q1]), alphabet, transitions, q1, new Set([q1, q2]))).to.throw(
        ErrorCode.ACCEPTS_NOT_SUBSET
      );
    });
  });

  describe("FSA#validateTFunc()", function() {
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

  describe("FSA#createFSA()", function() {
    let states, states2, aph, aph2, tr, tr2;

    before(function() {
      states = ["q1", "q2"];
      states2 = "q1";
      aph = "01";
      aph2 = ["start", "end"];
      tr = [
        { from: "q1", to: "q2", input: "0" },
        { from: "q2", to: "q1", input: "0" },
        { from: "q2", to: "q2", input: "1" },
        { from: "q1", to: "q1", input: "1" }
      ];
      tr2 = { from: "q1", to: "q1", input: "0" };
    });

    it("Should not accept invalid input types", function() {
      // Invalid states type
      expect(() => createFSA(null, aph, tr, "q1", states)).to.throw(TypeError);
      expect(() => createFSA(undefined, aph, tr, "q1", states)).to.throw(TypeError);
      expect(() => createFSA(0, aph, tr, "q1", states)).to.throw(TypeError);
      expect(() => createFSA(() => {}, aph, tr, "q1", states)).to.throw(TypeError);

      // Invalid transitions type
      expect(() => createFSA(states, aph, null, "q1", states)).to.throw(TypeError);
      expect(() => createFSA(states, aph, undefined, "q1", states)).to.throw(TypeError);
      expect(() => createFSA(states, aph, 0, "q1", states)).to.throw(TypeError);
      expect(() => createFSA(states, aph, () => {}, "q1", states)).to.throw(TypeError);

      // Invalid accepts type
      expect(() => createFSA(states, aph, tr, "q1", null)).to.throw(TypeError);
      expect(() => createFSA(states, aph, tr, "q1", undefined)).to.throw(TypeError);
      expect(() => createFSA(states, aph, tr, "q1", 0)).to.throw(TypeError);
      expect(() => createFSA(states, aph, tr, "q1", () => {})).to.throw(TypeError);

      // Invalid start type
      expect(() => createFSA(states, aph, tr, null, states)).to.throw(TypeError);
      expect(() => createFSA(states, aph, tr, undefined, states)).to.throw(TypeError);
      expect(() => createFSA(states, aph, tr, 0, states)).to.throw(TypeError);
      expect(() => createFSA(states, aph, tr, () => {}, states)).to.throw(TypeError);
    });

    it("Should successfully create the FSA", function() {
      expect(() => createFSA(states, aph, tr, "q1", states)).to.not.throw();
    });
  });
});
