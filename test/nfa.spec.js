import { State, Alphabet, NFATransition, Transition } from "../src/components";
import { NFA } from "../src/automata";
import { ErrorCode } from "../src/globals/errors.js";
import { compare, instanceOf } from "../src/globals/globals.js";
import { createFSA } from "../src/utils";

const chai = require("chai");
const assert = chai.assert;
const expect = chai.expect;

describe("NFA Creation", function () {
  describe("NFA#constructor()", function () {
    let q1, q2, q3, q4;
    let t1, t2, t3, t4, t5, t6, t7;
    let c1, c2, c3, c4, c5, c6, c7, c8; // TFunc acceptance
    let states, alphabet, accepts, transitions, checkTfunc;

    before(function () {
      q1 = new State("q1");
      q2 = new State("q2");
      q3 = new State("q3");
      q4 = new State("q4");

      states = new Set([q1, q2, q3, q4]);
      alphabet = new Alphabet(["0", "1", ""]);
      accepts = new Set([q4]);

      t1 = new NFATransition(q1, [q1], "0");
      t2 = new NFATransition(q1, [q1, q2], "1");
      t3 = new NFATransition(q2, [q3], "0");
      t4 = new NFATransition(q2, [q3], "");
      t5 = new NFATransition(q3, [q4], "1");
      t6 = new NFATransition(q4, [q4], "0");
      t7 = new NFATransition(q4, [q4], "1");
      transitions = new Set([t1, t2, t3, t4, t5, t6, t7]);

      c1 = new Transition(q1, q1, "0");
      c2 = new Transition(q1, q1, "1");
      c3 = new Transition(q2, q3, "0");
      c4 = new Transition(q2, q3, "");
      c5 = new Transition(q3, q4, "1");
      c6 = new Transition(q4, q4, "0");
      c7 = new Transition(q4, q4, "1");
      c8 = new Transition(q1, q2, "1");
      checkTfunc = new Set([c1, c2, c3, c4, c5, c6, c7, c8]);
    });

    it("Should return valid class attributes", function () {
      const nfa = new NFA(states, alphabet, transitions, q1, accepts);

      assert(nfa.getStates() === states);
      assert(nfa.getAlphabet() === alphabet);
      assert(nfa.getStartState() === q1);
      assert(nfa.getAcceptStates() === accepts);
      assert(nfa.getType() === "NFA");

      // Validate TFunc
      assert(nfa.getTFunc().length === checkTfunc.length);
      for (const t in nfa.getTFunc()) assert(checkTfunc.has(t));
    });

    it("Should have no public attributes", function () {
      const nfa = new NFA(states, alphabet, transitions, q1, accepts);
      assert(Object.getOwnPropertyNames(nfa).length === 0);
    });

    it("Should allow accepts to be empty set", function () {
      const emptySet = new Set([]);
      const nfa = new NFA(states, alphabet, transitions, q1, emptySet);
      const nfa2 = new NFA(states, alphabet, transitions, q1, {});
      assert(nfa.getAcceptStates() === emptySet);
      assert(nfa2.getAcceptStates().size === 0);
    });

    it("Should automatically add empty string to alphabet", function () {
      const alph2 = new Alphabet("01");
      const nfa = new NFA(states, alph2, transitions, q1, accepts);
      assert(compare(nfa.getAlphabet().sigma, alphabet.sigma));
    });

    it("Should fail because tfunc contains invalid origin state", function () {
      const ftfunc = new Set([t1, new NFATransition(new State("q99"), [q4], "1")]);
      expect(() => new NFA(states, alphabet, ftfunc, q1, accepts)).to.throw(ErrorCode.ORIGIN_STATE_NOT_FOUND);
    });

    it("Should fail because tfunc contains invalid dest state", function () {
      const ftfunc = new Set([t1, new NFATransition(q4, [new State("q99")], "1")]);
      expect(() => new NFA(states, alphabet, ftfunc, q1, accepts)).to.throw(ErrorCode.DEST_STATE_NOT_FOUND);
    });

    it("Should fail because tfunc contains invalid input char", function () {
      const ftfunc = new Set([t1, new NFATransition(q4, [q4], "9")]);
      expect(() => new NFA(states, alphabet, ftfunc, q1, accepts)).to.throw(ErrorCode.INVALID_INPUT_CHAR);
    });

    it("Should reduce tfunc if additional transitions found or invalid transition", function () {
      const tt2 = new NFATransition(q1, [q2], "1");
      const tt3 = new NFATransition(q2, [q2], "0");
      const tt4 = new NFATransition(q2, [q1], "1");
      const tt5 = new NFATransition(q2, [q2], "0"); // Should be ignored - duplicate origin/dest/input
      const tt6 = new NFATransition(q1, [q1], "0");
      const transitions2 = new Set([tt2, tt3, tt4, tt5, tt6]);

      const nfa = new NFA(states, alphabet, transitions2, q1, accepts);
      assert(nfa.getTFunc().size === 4);
    });
  });

  describe("NFA#generateDigraph()", function () {
    let q1, q2, q3, q4;
    let t1, t2, t3, t4, t5, t6, t7, t8;
    let states, alphabet, accepts, transitions, nfa;

    before(function () {
      q1 = new State("q1");
      q2 = new State("q2");
      q3 = new State("q3");
      q4 = new State("q4");

      states = new Set([q1, q2, q3, q4]);
      alphabet = new Alphabet(["0", "1", "label", "a", "b"]);
      accepts = new Set([q4]);

      t1 = new NFATransition(q1, [q1], "0");
      t2 = new NFATransition(q1, [q1, q2], "label");
      t3 = new NFATransition(q2, [q3], "0");
      t4 = new NFATransition(q2, [q3], "");
      t5 = new NFATransition(q3, [q4], "1");
      t6 = new NFATransition(q4, [q4], "0");
      t7 = new NFATransition(q4, [q4], "a");
      t8 = new NFATransition(q4, [q4], "b");
      transitions = new Set([t1, t2, t3, t4, t5, t6, t7, t8]);
      nfa = new NFA(states, alphabet, transitions, q1, accepts);
    });

    it("Should generate correct digraph", function () {
      const digraph = nfa.generateDigraph();
      assert(digraph.includes("digraph fsa"));
      assert(digraph.includes("q4 [shape = doublecircle];"));
      assert(digraph.includes("node [shape = point ]; qi;"));
      assert(digraph.includes("qi -> q1;"));
      assert(digraph.includes('q1 -> q1 [ label = "0,label" ];'));
      assert(digraph.includes('q1 -> q2 [ label = "label" ];'));
      assert(digraph.includes('q2 -> q3 [ label = "0,ε" ];'));
      assert(digraph.includes('q3 -> q4 [ label = "1" ];'));
      assert(digraph.includes('q4 -> q4 [ label = "0,a,b" ];'));
    });
  });

  describe("NFA#createFSA()", function () {
    let states, aph, tr, tr2, tr3, tr_fail;

    before(function () {
      states = ["q1", "q2", "q3", "q4"];
      aph = "01";
      tr = [
        { from: "q1", to: "q1", input: "0" },
        { from: "q1", to: "q1,q2", input: "1" },
        { from: "q2", to: "q3", input: "0" },
        { from: "q2", to: "q3", input: "" },
        { from: "q3", to: "q4", input: "1" },
        { from: "q4", to: "q4", input: "0" },
        { from: "q4", to: "q4", input: "1" },
      ];
      tr2 = { from: "q1", to: "q1", input: "" };
      tr3 = { from: "q1", to: "q1,q2", input: "0" };
      tr_fail = { from: null, to: "q1,q2", input: "0" };
    });

    it("Should not accept invalid input types", function () {
      // Invalid states type
      expect(() => createFSA(null, aph, tr, "q1", states)).to.throw(TypeError);
      expect(() => createFSA(undefined, aph, tr, "q1", states)).to.throw(TypeError);
      expect(() => createFSA(0, aph, tr, "q1", states)).to.throw(TypeError);
      expect(() => createFSA(() => {}, aph, tr, "q1", states)).to.throw(TypeError);

      // Invalid alphabet type
      expect(() => createFSA(states, null, tr, "q1", states)).to.throw(TypeError);
      expect(() => createFSA(states, undefined, tr, "q1", states)).to.throw(TypeError);
      expect(() => createFSA(states, 0, tr, "q1", states)).to.throw(TypeError);
      expect(() => createFSA(states, () => {}, tr, "q1", states)).to.throw(TypeError);

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

      // Invalid transition object
      expect(() => createFSA(states, aph, tr_fail, "q1", states)).to.throw(ErrorCode.INVALID_TRANSITION_OBJECT);
    });

    it("Should successfully create the NFA", function () {
      assert(instanceOf(NFA, createFSA(states, aph, tr, "q1", states)));
      assert(instanceOf(NFA, createFSA(states, aph, tr, "q1", "q1")));
      assert(instanceOf(NFA, createFSA(states, aph, tr3, "q1", "q1")));
      assert(instanceOf(NFA, createFSA("q1", "", tr2, "q1", "q1")));
    });
  });
});
