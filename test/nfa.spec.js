import { State } from "../src/classes/State.js";
import { NFA, createDFA } from "../src/classes/NFA.js";
import { Alphabet } from "../src/classes/Alphabet.js";
import { NFATransition } from "../src/classes/NFATransition.js";
import { Transition } from "../src/classes/Transition.js";
import { ErrorCode } from "../src/globals/errors.js";
import { isSetsEqual } from "../src/globals/globals.js";
var assert = require("chai").assert;
var expect = require("chai").expect;

describe("NFA Creation", function() {
  describe("NFA#constructor()", function() {
    let q1, q2, q3, q4;
    let t1, t2, t3, t4, t5, t6, t7;
    let c1, c2, c3, c4, c5, c6, c7, c8; // TFunc acceptance
    let states, alphabet, accepts, transitions, checkTfunc;

    before(function() {
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

    it("Should return valid class attributes", function() {
      const nfa = new NFA(states, alphabet, transitions, q1, accepts);
      console.log(nfa.tfunc);
      console.log(checkTfunc);

      assert(nfa.states === states);
      assert(nfa.alphabet === alphabet);
      assert(nfa.start === q1);
      assert(nfa.accepts === accepts);

      // Validate TFunc
      assert(nfa.tfunc.length === checkTfunc.length);
      for (const t in nfa.tfunc) assert(checkTfunc.has(t));
    });
  });
});
