import Set from "core-js/features/set";
import { State, Alphabet, Transition } from "../src/components";
import { RegEx, NFA } from "../src/automata";
import { compare, instanceOf } from "../src/globals/globals.js";
import { ErrorCode } from "../src/globals/errors.js";
import { createRegEx } from "../src/utils";

const deepEqualInAnyOrder = require("deep-equal-in-any-order");
const chai = require("chai");
chai.use(deepEqualInAnyOrder);
const assert = chai.assert;
const expect = chai.expect;

describe("RegEx Creation", function () {
  describe("RegEx#constructor()", function () {
    let q1, q2, q3, q4, q5, q6, q0;
    let t1, t2, t3, t4, t5, t6, t7, t8, t9, t10;
    let regex1, states, alphabet, alph_check, accepts, checkTfunc;
    let _rx1;

    before(function () {
      q1 = new State("q1");
      q2 = new State("q2");
      q3 = new State("q3");
      q4 = new State("q4");
      q5 = new State("q5");
      q6 = new State("q6");
      q0 = new State("q0");

      regex1 = "0%s10%s";
      states = new Set([q1, q2, q3, q4, q5, q6, q0]);
      alphabet = new Alphabet("01");
      alph_check = new Alphabet(["0", "1", ""]);
      accepts = new Set([q6]);

      t1 = new Transition(q1, q2, "0");
      t2 = new Transition(q1, q2, "");
      t3 = new Transition(q2, q1, "");
      t4 = new Transition(q3, q4, "1");
      t5 = new Transition(q2, q3, "");
      t6 = new Transition(q5, q6, "0");
      t7 = new Transition(q5, q6, "");
      t8 = new Transition(q6, q5, "");
      t9 = new Transition(q4, q5, "");
      t10 = new Transition(q0, q1, "");
      checkTfunc = new Set([t1, t2, t3, t4, t5, t6, t7, t8, t9, t10]);

      _rx1 = new RegEx(regex1, alphabet);
    });

    it("Should return valid class attributes", function () {
      expect(states).to.deep.equalInAnyOrder(_rx1.getStates());
      assert(compare(alph_check.sigma, _rx1.getAlphabet().sigma));
      expect(checkTfunc).to.deep.equalInAnyOrder(_rx1.getTFunc());
      assert(_rx1.getStartState().name === q0.name);
      expect(accepts).to.deep.equalInAnyOrder(_rx1.getAcceptStates());
      assert(_rx1.getType() === "NFA");
    });

    it("Should have no public attributes", function () {
      assert(Object.getOwnPropertyNames(_rx1).length === 0);
    });
  });

  describe("RegEx#createRegEx()", function () {
    let regex, alph1, alph2, _rx0;

    before(function () {
      regex = "0%s10%s";
      alph1 = new Alphabet("01");
      alph2 = new Alphabet(["0", "1", "%"]);
    });

    it("Should not accept invalid input types", function () {
      // Invalid regex type
      expect(() => createRegEx(null, alph1)).to.throw(TypeError);
      expect(() => createRegEx(undefined, alph1)).to.throw(TypeError);
      expect(() => createRegEx(0, alph1)).to.throw(TypeError);
      expect(() => createRegEx(() => {}, alph1)).to.throw(TypeError);

      // Invalid alphabet type
      expect(() => createRegEx(regex, null)).to.throw(TypeError);
      expect(() => createRegEx(regex, undefined)).to.throw(TypeError);
      expect(() => createRegEx(regex, 0)).to.throw(TypeError);
      expect(() => createRegEx(regex, () => {})).to.throw(TypeError);
      expect(() => createRegEx(regex, alph2)).to.throw(ErrorCode.INVALID_INPUT_CHAR);
    });

    it("Should not accept invalid syntax", function () {
      // RegEx syntax checks
      expect(() => createRegEx("%10", alph1)).to.throw(ErrorCode.INVALID_REGEX_SYNTAX);
      expect(() => createRegEx("01%", alph1)).to.throw(ErrorCode.INVALID_REGEX_SYNTAX);
      expect(() => createRegEx("01%u", alph1)).to.throw(ErrorCode.INVALID_REGEX_SYNTAX);
      expect(() => createRegEx("01y0", alph1)).to.throw(ErrorCode.INVALID_REGEX_SYNTAX);
      expect(() => createRegEx("01%r0", alph1)).to.throw(ErrorCode.INVALID_REGEX_SYNTAX);
      expect(() => createRegEx("0%s%s0", alph1)).to.throw(ErrorCode.INVALID_REGEX_SYNTAX);
    });

    it("Should successfully create the NFA", function () {
      _rx0 = createRegEx(regex, alph1);
      assert(instanceOf(NFA, _rx0));
    });
  });
});
