import { FSA, State, Alphabet, TFunc } from "../lib/modules.js";
var assert = require("chai").assert;
var expect = require("chai").expect;

describe("State Creation", function() {
  describe("State#constructor()", function() {
    it("Should return valid class attributes", function() {
      const name = "st1";
      let state = new State(name);
      assert(state.name === name, "state.name !== " + name);
    });

    it("Should fail because invalid name", function() {
      expect(() => new State("")).to.throw(Error);
      expect(() => new State(null)).to.throw(Error);
      expect(() => new State(undefined)).to.throw(Error);
    });
  });
});

describe("Alphabet Creation", function() {
  describe("Alphabet#constructor()", function() {
    it("Should return valid class attributes", function() {
      const sigma = "abcd";
      let alphabet = new Alphabet(sigma);
      assert(
        alphabet.sigma.length === sigma.length,
        `sigma length [${alphabet.sigma.length}] !== input length [${sigma.length}]`
      );
      assert(Array.isArray(alphabet.sigma), "sigma is not Array type");
    });

    it("Should allow an empty sigma", function() {
      expect(() => new Alphabet("")).to.not.throw();
    });

    it("Should fail because duplicate values in sigma", function() {
      expect(() => new Alphabet("abb")).to.throw(Error);
      expect(() => new Alphabet("bbb")).to.throw(Error);
    });

    it("Should fail because invalid input type", function() {
      expect(() => new Alphabet()).to.throw(Error);
      expect(() => new Alphabet(null)).to.throw(Error);
    });
  });
});

describe("FSA Creation", function() {
  describe("FSA#constructor()", function() {
    let q1;
    let q2;
    let q3;

    let states;
    let alphabet;
    let tfunc;
    let accepts;

    before(function() {
      q1 = new State("q1");
      q2 = new State("q2");
      q3 = new State("q3");

      states = [q1, q2, q3];
      alphabet = "abc";
      tfunc = new TFunc("test");
      accepts = new Set([q2, q3]);
    });

    it("Should return valid class attributes", function() {
      let fas = new FSA(states, alphabet, tfunc, q1, accepts);

      assert(fas.states === states);
      assert(fas.alphabet === alphabet);
      assert(fas.tfunc === tfunc);
      assert(fas.start === q1);
      assert(fas.accepts === accepts);
    });
  });
});
