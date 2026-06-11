/**
 * Regular language theory — definitions, operations, closure, NFA↔DFA.
 */
import { createFSA } from "../src/modules";
import { RegularLanguage } from "../src/languages/RegularLanguage";
import { subsetConstruction } from "../src/languages/NFAtoDFA";
import {
  languagesEquivalent,
  membershipMatchesOperationalConcat,
  membershipMatchesOperationalStar,
  membershipMatchesOperationalUnion,
} from "../src/languages/LanguageEquivalence";

import { assert, expect } from "chai";

function singleton(symbol) {
  return RegularLanguage.fromAutomaton(
    createFSA(
      ["q0", "q1", "dead"],
      symbol,
      [
        { from: "q0", to: "q1", input: symbol },
        { from: "q1", to: "dead", input: symbol },
        { from: "dead", to: "dead", input: symbol },
      ],
      "q0",
      ["q1"]
    )
  );
}

function endsIn(symbol) {
  return RegularLanguage.fromAutomaton(
    createFSA(
      ["q0", "q1"],
      symbol,
      [
        { from: "q0", to: "q1", input: symbol },
        { from: "q1", to: "q1", input: symbol },
      ],
      "q0",
      ["q1"]
    )
  );
}

describe("Regular languages (#v1.5)", function() {
  describe("Definition: L(M) = { w | M accepts w }", function() {
    it("contains matches simulateFSA acceptance", function() {
      const lang = singleton("a");
      assert.isTrue(lang.contains("a"));
      assert.isFalse(lang.contains(""));
      assert.isFalse(lang.contains("b"));
      assert.isFalse(lang.contains("aa"));
    });
  });

  describe("Regular language classification", function() {
    it("treats FSA-backed languages as regular", function() {
      const lang = RegularLanguage.fromAutomaton(
        createFSA(
          ["q1", "q2"],
          "01",
          [
            { from: "q1", to: "q2", input: "1" },
            { from: "q2", to: "q1", input: "0" },
            { from: "q2", to: "q2", input: "1" },
            { from: "q1", to: "q1", input: "0" },
          ],
          "q1",
          ["q2"]
        )
      );

      assert.deepEqual(lang.getAlphabetSymbols(), ["0", "1"]);
      assert.isTrue(lang.contains("101"));
    });
  });

  describe("Union", function() {
    it("builds an automaton for L1 ∪ L2", function() {
      const left = singleton("a");
      const right = singleton("b");
      const union = left.union(right);

      assert.isTrue(union.contains("a"));
      assert.isTrue(union.contains("b"));
      assert.isFalse(union.contains("ab"));
      assert.isFalse(union.contains(""));
    });

    it("is closed under union (operational check)", function() {
      const left = singleton("0");
      const right = endsIn("1");
      const union = left.union(right);

      assert.isTrue(membershipMatchesOperationalUnion(left, right, union, 4));
    });
  });

  describe("Concatenation", function() {
    it("builds an automaton for L1L2", function() {
      const left = singleton("a");
      const right = singleton("b");
      const concat = left.concat(right);

      assert.isTrue(concat.contains("ab"));
      assert.isFalse(concat.contains("a"));
      assert.isFalse(concat.contains("b"));
      assert.isFalse(concat.contains("ba"));
    });

    it("is closed under concatenation (operational check)", function() {
      const left = singleton("a");
      const right = singleton("b");
      const concat = left.concat(right);

      assert.isTrue(membershipMatchesOperationalConcat(left, right, concat, 3));
    });
  });

  describe("Kleene star", function() {
    it("builds an automaton for L*", function() {
      const source = singleton("a");
      const star = source.kleeneStar();

      assert.isTrue(star.contains(""));
      assert.isTrue(star.contains("a"));
      assert.isTrue(star.contains("aa"));
      assert.isTrue(star.contains("aaa"));
      assert.isFalse(star.contains("b"));
      assert.isFalse(star.contains("ab"));
    });

    it("is closed under star (operational check)", function() {
      const source = singleton("a");
      const star = source.kleeneStar();

      assert.isTrue(membershipMatchesOperationalStar(source, star, 4));
    });
  });

  describe("NFA to DFA equivalence", function() {
    it("converts an NFA to an equivalent DFA", function() {
      const nfaLang = RegularLanguage.fromAutomaton(
        createFSA(
          ["q1", "q2", "q3", "q4"],
          "01",
          [
            { from: "q1", to: "q2", input: "0" },
            { from: "q2", to: "q3", input: "1" },
            { from: "q1", to: "q4", input: "1" },
            { from: "q3", to: "q3", input: "" },
            { from: "q4", to: "q4", input: "" },
          ],
          "q1",
          ["q3", "q4"]
        )
      );

      const dfaLang = nfaLang.toDFA();
      assert.equal(dfaLang.getAutomaton().getType(), "DFA");
      assert.isTrue(languagesEquivalent(nfaLang, dfaLang, 5));
    });
  });

  describe("Membership edge cases", function() {
    it("returns false for symbols outside the alphabet", function() {
      const lang = singleton("a");
      assert.isFalse(lang.contains("b"));
      assert.isFalse(lang.contains("ab"));
    });

    it("exports automata for inspection", function() {
      const lang = singleton("a");
      const definition = lang.toDefinition();
      assert.include(definition.states, "q1");
      assert.deepEqual(definition.accepts, ["q1"]);
    });

    it("returns the same DFA when toDFA is applied twice", function() {
      const dfaLang = singleton("a");
      assert.isTrue(languagesEquivalent(dfaLang, dfaLang.toDFA(), 3));
    });

    it("detects non-equivalent languages", function() {
      const left = singleton("a");
      const right = singleton("b");
      assert.isFalse(languagesEquivalent(left, right, 3));
    });

    it("rejects subset construction on a DFA", function() {
      const dfa = singleton("a").getAutomaton();
      expect(() => subsetConstruction(dfa)).to.throw(TypeError);
    });

    it("uses a dead state when the NFA lacks a transition", function() {
      const sparse = RegularLanguage.fromAutomaton(
        createFSA(
          ["q1", "q2"],
          "a",
          [
            { from: "q1", to: "q2", input: "a" },
            { from: "q2", to: "q2", input: "" },
          ],
          "q1",
          ["q2"]
        )
      );
      const dfa = sparse.toDFA();
      assert.isTrue(dfa.contains("a"));
      assert.isFalse(dfa.contains("aa"));
    });

    it("preserves equivalence after Kleene star", function() {
      const source = endsIn("1");
      const star = source.kleeneStar();
      assert.isTrue(star.contains(""));
      assert.isTrue(membershipMatchesOperationalStar(source, star, 3));
    });

    it("reuses subset states when symbols converge", function() {
      const lang = RegularLanguage.fromAutomaton(
        createFSA(
          ["q1", "q2"],
          "01",
          [
            { from: "q1", to: "q1", input: "0" },
            { from: "q1", to: "q2", input: "1" },
            { from: "q2", to: "q2", input: "0" },
            { from: "q2", to: "q2", input: "1" },
          ],
          "q1",
          ["q2"]
        )
      );
      assert.isTrue(languagesEquivalent(lang, lang.toDFA(), 4));
    });

    it("groups multi-destination transitions when exporting", function() {
      const lang = RegularLanguage.fromAutomaton(
        createFSA(
          ["q1", "q2", "q3"],
          "a",
          [{ from: "q1", to: "q2,q3", input: "a" }],
          "q1",
          ["q2", "q3"]
        )
      );
      const definition = lang.toDefinition();
      const grouped = definition.transitions.find(entry => entry.from === "q1");
      assert.include(grouped.to, ",");
    });
  });

  describe("Regular iff NFA recognizes", function() {
    it("matches NFA and DFA representatives of the same language", function() {
      const nfaLang = RegularLanguage.fromAutomaton(
        createFSA(
          ["q1", "q2"],
          "ab",
          [
            { from: "q1", to: "q1,q2", input: "a" },
            { from: "q2", to: "q2", input: "b" },
          ],
          "q1",
          ["q2"]
        )
      );

      const dfaLang = nfaLang.toDFA();
      assert.isTrue(languagesEquivalent(nfaLang, dfaLang, 4));
    });
  });
});