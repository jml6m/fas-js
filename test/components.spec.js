import { State, Alphabet, Transition } from "../src/components";
import { ErrorCode } from "../src/globals/errors.js";
var assert = require("chai").assert;
var expect = require("chai").expect;

describe("State Creation", function () {
  describe("State#constructor()", function () {
    it("Should return valid class attributes", function () {
      const name = "st1";
      let state = new State(name);
      assert(state.name === name, "state.name !== " + name);
    });

    it("Should fail because invalid name", function () {
      expect(() => new State("")).to.throw(Error, ErrorCode.INVALID_STATE_NAME);
      expect(() => new State(null)).to.throw(Error, ErrorCode.INVALID_STATE_NAME);
      expect(() => new State(undefined)).to.throw(Error, ErrorCode.INVALID_STATE_NAME);
    });
  });
});

describe("Alphabet Creation", function () {
  describe("Alphabet#constructor()", function () {
    it("Should return valid class attributes", function () {
      const sigma = ["a", "b", "c", "d"];
      let alphabet = new Alphabet(sigma);
      assert(
        alphabet.sigma.length === sigma.length,
        `sigma length [${alphabet.sigma.length}] !== input length [${sigma.length}]`
      );
      assert(Array.isArray(alphabet.sigma), "sigma is not Array type");
    });

    it("Should allow an empty sigma", function () {
      expect(() => new Alphabet("")).to.not.throw();
    });

    it("Should fail because duplicate values in sigma", function () {
      expect(() => new Alphabet("abb")).to.throw(Error, ErrorCode.DUPLICATE_ALPHABET_VALS);
      expect(() => new Alphabet("bbb")).to.throw(Error, ErrorCode.DUPLICATE_ALPHABET_VALS);
    });

    it("Should fail because invalid input type", function () {
      expect(() => new Alphabet(null)).to.throw(TypeError);
      expect(() => new Alphabet(undefined)).to.throw(TypeError);
      expect(() => new Alphabet(0)).to.throw(TypeError);
      expect(() => new Alphabet(() => {})).to.throw(TypeError);
    });
  });
});

describe("Transition Creation", function () {
  describe("Transition#constructor()", function () {
    it("Should return valid class attributes", function () {
      const origin = new State("q1");
      const dest = new State("q2");
      const input = "a";
      let transition = new Transition(origin, dest, input);

      assert(transition.origin === origin);
      assert(transition.dest === dest);
      assert(transition.input === input);
    });
  });
});
