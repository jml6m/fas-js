/**
 * Regular language theory — definitions, operations, closure.
 */
import { createFSA, simulateFSA } from '../src/modules';
import { ErrorCode } from '../src/globals/errors';
import { Language } from '../src/languages/Language';
import { RegularLanguage } from '../src/languages/RegularLanguage';
import { subsetConstruction } from '../src/languages/NFAtoDFA';
import { dfaLanguagesEqual } from './helpers/dfaLanguageEqual.js';
import { assertAcceptanceSmoke, assertSubsetStructuralWitness } from './helpers/subsetWitnessAssertions.js';
import { assertConcatMembership, assertStarMembership, assertUnionMembership } from './helpers/membershipAssertions.js';

import { assert, expect } from 'chai';

/** Mirrors RegularLanguage.contains — simulateFSA, with E-009 mapped to false. */
function acceptanceViaSimulator(word, fsa) {
  try {
    return Boolean(simulateFSA(word, fsa));
  } catch (error) {
    if (error instanceof Error && error.message === ErrorCode.INVALID_INPUT_CHAR) {
      return false;
    }
    throw error;
  }
}

function singleton(symbol) {
  return RegularLanguage.fromAutomaton(
    createFSA(
      ['q0', 'q1', 'dead'],
      symbol,
      [
        { from: 'q0', to: 'q1', input: symbol },
        { from: 'q1', to: 'dead', input: symbol },
        { from: 'dead', to: 'dead', input: symbol },
      ],
      'q0',
      ['q1']
    )
  );
}

function endsIn(symbol) {
  return RegularLanguage.fromAutomaton(
    createFSA(
      ['q0', 'q1'],
      symbol,
      [
        { from: 'q0', to: 'q1', input: symbol },
        { from: 'q1', to: 'q1', input: symbol },
      ],
      'q0',
      ['q1']
    )
  );
}

describe('Regular languages', function () {
  describe('Definition: L(M) = { w | M accepts w }', function () {
    it('contains(w) agrees with simulateFSA(M, w)', function () {
      const lang = singleton('a');
      const fsa = lang.getAutomaton();
      for (const word of ['a', '', 'b', 'aa']) {
        assert.equal(lang.contains(word), acceptanceViaSimulator(word, fsa), `membership for "${word}"`);
      }
    });
  });

  describe('Regular language classification', function () {
    it('extends the Language base class', function () {
      const lang = singleton('a');
      assert.instanceOf(lang, Language);
      assert.instanceOf(lang, RegularLanguage);
      assert.equal(lang.getClassification(), 'regular');
    });

    it('getClassification() is regular for automaton-backed languages', function () {
      const lang = RegularLanguage.fromAutomaton(
        createFSA(
          ['q1', 'q2'],
          '01',
          [
            { from: 'q1', to: 'q2', input: '1' },
            { from: 'q2', to: 'q1', input: '0' },
            { from: 'q2', to: 'q2', input: '1' },
            { from: 'q1', to: 'q1', input: '0' },
          ],
          'q1',
          ['q2']
        )
      );

      assert.equal(lang.getClassification(), 'regular');
      assert.deepEqual(lang.getAlphabetSymbols(), ['0', '1']);
      assert.isTrue(lang.contains('101'));
    });

    it('treats UTF-8 alphabet symbols as atomic in contains()', function () {
      const lang = RegularLanguage.fromAutomaton(
        createFSA(
          ['q0', 'q1', 'q2', 'dead'],
          ['α', 'β'],
          [
            { from: 'q0', to: 'q1', input: 'α' },
            { from: 'q0', to: 'dead', input: 'β' },
            { from: 'q1', to: 'q2', input: 'β' },
            { from: 'q1', to: 'dead', input: 'α' },
            { from: 'q2', to: 'dead', input: 'α' },
            { from: 'q2', to: 'dead', input: 'β' },
            { from: 'dead', to: 'dead', input: 'α' },
            { from: 'dead', to: 'dead', input: 'β' },
          ],
          'q0',
          ['q1', 'q2']
        )
      );

      assert.deepEqual(lang.getAlphabetSymbols(), ['α', 'β']);
      assert.isTrue(lang.contains('α'));
      assert.isTrue(lang.contains('αβ'));
      assert.isFalse(lang.contains('β'));
      assert.isFalse(lang.contains('αα'));
    });
  });

  describe('Union', function () {
    it('union with itself preserves membership', function () {
      const lang = singleton('a');
      const union = lang.union(lang);
      assert.isTrue(union.contains('a'));
      assert.isFalse(union.contains('b'));
    });

    it('builds an automaton for L1 ∪ L2', function () {
      const left = singleton('a');
      const right = singleton('b');
      const union = left.union(right);

      assert.isTrue(union.contains('a'));
      assert.isTrue(union.contains('b'));
      assert.isFalse(union.contains('ab'));
      assert.isFalse(union.contains(''));
    });

    it('is closed under union (operational check)', function () {
      const left = singleton('0');
      const right = endsIn('1');
      const union = left.union(right);
      const words = ['', '0', '1', '00', '01', '10', '11', '001', '101'];

      assertUnionMembership(left, right, union, words);
    });
  });

  describe('Concatenation', function () {
    it('builds an automaton for L1 ∘ L2', function () {
      const left = singleton('a');
      const right = singleton('b');
      const concat = left.concat(right);

      assert.isTrue(concat.contains('ab'));
      assert.isFalse(concat.contains('a'));
      assert.isFalse(concat.contains('b'));
      assert.isFalse(concat.contains('ba'));
    });

    it('is closed under concatenation (operational check)', function () {
      const left = singleton('a');
      const right = singleton('b');
      const concat = left.concat(right);
      const words = ['', 'a', 'b', 'ab', 'ba', 'aab', 'abb'];

      assertConcatMembership(left, right, concat, words);
    });
  });

  describe('Subset construction (toDFA)', function () {
    it('witness and smoke: 01-or-1 NFA', function () {
      const nfaLang = RegularLanguage.fromAutomaton(
        createFSA(
          ['q1', 'q2', 'q3', 'q4'],
          '01',
          [
            { from: 'q1', to: 'q2', input: '0' },
            { from: 'q2', to: 'q3', input: '1' },
            { from: 'q1', to: 'q4', input: '1' },
            { from: 'q3', to: 'q3', input: '' },
            { from: 'q4', to: 'q4', input: '' },
          ],
          'q1',
          ['q3', 'q4']
        )
      );
      const nfa = nfaLang.getAutomaton();

      assertSubsetStructuralWitness(nfa, subsetConstruction(nfa));
      assertAcceptanceSmoke(nfaLang, ['', '0', '1', '01', '10']);
    });

    it('witness and smoke: multi-destination NFA', function () {
      const nfaLang = RegularLanguage.fromAutomaton(
        createFSA(
          ['q1', 'q2'],
          'ab',
          [
            { from: 'q1', to: 'q1,q2', input: 'a' },
            { from: 'q2', to: 'q2', input: 'b' },
          ],
          'q1',
          ['q2']
        )
      );
      const nfa = nfaLang.getAutomaton();

      assertSubsetStructuralWitness(nfa, subsetConstruction(nfa));
      assertAcceptanceSmoke(nfaLang, ['a', 'b', 'ab']);
    });

    it('witness and smoke: sparse NFA uses dead state', function () {
      const nfaLang = RegularLanguage.fromAutomaton(
        createFSA(
          ['q1', 'q2'],
          'a',
          [
            { from: 'q1', to: 'q2', input: 'a' },
            { from: 'q2', to: 'q2', input: '' },
          ],
          'q1',
          ['q2']
        )
      );
      const nfa = nfaLang.getAutomaton();
      const result = subsetConstruction(nfa);

      assertSubsetStructuralWitness(nfa, result);
      assert.include(result.definition.states, 'dead');
      assertAcceptanceSmoke(nfaLang, ['a', 'b']);
    });

    it('returns the same DFA when toDFA is applied twice', function () {
      const dfaLang = singleton('a');
      const once = dfaLang.toDFA().toDefinition();
      const twice = dfaLang.toDFA().toDFA().toDefinition();
      assert.deepEqual(once, twice);
    });

    it('rejects subset construction on a DFA', function () {
      const dfa = singleton('a').getAutomaton();
      expect(() => subsetConstruction(dfa)).to.throw(TypeError, 'subsetConstruction requires an NFA');
    });

    it('rejects subset construction on nullish input', function () {
      expect(() => subsetConstruction(null)).to.throw(TypeError, 'subsetConstruction received nullish input');
      expect(() => subsetConstruction(undefined)).to.throw(TypeError, 'subsetConstruction received nullish input');
    });
  });

  describe('Kleene star', function () {
    it('builds an automaton for L*', function () {
      const source = singleton('a');
      const star = source.kleeneStar();

      assert.isTrue(star.contains(''));
      assert.isTrue(star.contains('a'));
      assert.isTrue(star.contains('aa'));
      assert.isTrue(star.contains('aaa'));
      assert.isFalse(star.contains('b'));
      assert.isFalse(star.contains('ab'));
    });

    it('is closed under star (operational check)', function () {
      const source = singleton('a');
      const star = source.kleeneStar();
      const words = ['', 'a', 'aa', 'aaa', 'b', 'ab', 'aba'];

      assertStarMembership(source, star, words);
    });
  });

  describe('Membership edge cases', function () {
    it('returns false for symbols outside the alphabet', function () {
      const lang = singleton('a');
      assert.isFalse(lang.contains('b'));
      assert.isFalse(lang.contains('ab'));
    });

    it('rethrows unexpected errors from simulateFSA', function () {
      const lang = singleton('a');
      expect(() => lang.contains(null)).to.throw(TypeError);
    });

    it('exports automata for inspection', function () {
      const lang = singleton('a');
      const definition = lang.toDefinition();
      assert.include(definition.states, 'q1');
      assert.deepEqual(definition.accepts, ['q1']);
    });

    it('detects non-equivalent languages via complete DFA distinguishability', function () {
      const left = singleton('a');
      const right = singleton('b');

      assert.isFalse(dfaLanguagesEqual(left.getAutomaton(), right.getAutomaton()));
      assert.isTrue(left.contains('a'));
      assert.isFalse(right.contains('a'));
    });

    it('preserves equivalence after Kleene star', function () {
      const source = endsIn('1');
      const star = source.kleeneStar();
      const words = ['', '1', '01', '101', '0', '10'];

      assert.isTrue(star.contains(''));
      assertStarMembership(source, star, words);
    });

    it('groups multi-destination transitions when exporting', function () {
      const lang = RegularLanguage.fromAutomaton(createFSA(['q1', 'q2', 'q3'], 'a', [{ from: 'q1', to: 'q2,q3', input: 'a' }], 'q1', ['q2', 'q3']));
      const definition = lang.toDefinition();
      const grouped = definition.transitions.find((entry) => entry.from === 'q1');
      assert.include(grouped.to, ',');
    });
  });
});
