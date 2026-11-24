/**
 * The simulator's ready-made machines. A table written by hand says what each one accepts; the
 * library must agree with the table, and the simulator's step logic must agree with the library.
 */
import { assert } from "chai";

import * as fas from "../src/modules";
import { PRESETS } from "../demo/presets.js";
import { buildMachine, checkDefinition } from "../demo/sim/machine.js";
import { readInput, trace } from "../demo/sim/run.js";

/** Each row: the preset, an input as it is typed, and whether the machine accepts it. */
const GOLDEN = [
  ["dfa-ends-in-1", "101", true],
  ["dfa-ends-in-1", "100", false],
  ["dfa-ends-in-1", "1", true],
  ["dfa-ends-in-1", "", false],

  ["dfa-same-ends", "abba", true],
  ["dfa-same-ends", "bab", true],
  ["dfa-same-ends", "a", true],
  ["dfa-same-ends", "ab", false],
  ["dfa-same-ends", "abb", false],
  ["dfa-same-ends", "", false],

  ["dfa-divisible-by-3", "1001", true],
  ["dfa-divisible-by-3", "110", true],
  ["dfa-divisible-by-3", "0", true],
  ["dfa-divisible-by-3", "", true],
  ["dfa-divisible-by-3", "1", false],
  ["dfa-divisible-by-3", "101", false],
  ["dfa-divisible-by-3", "111", false],

  ["nfa-one-near-end", "0100", true],
  ["nfa-one-near-end", "10", true],
  ["nfa-one-near-end", "110", true],
  ["nfa-one-near-end", "1", false],
  ["nfa-one-near-end", "1000", false],
  ["nfa-one-near-end", "000", false],
  ["nfa-one-near-end", "", false],

  ["nfa-epsilon-start", "", true],
  ["nfa-epsilon-start", "aaa", true],
  ["nfa-epsilon-start", "b", true],
  ["nfa-epsilon-start", "ab", false],
  ["nfa-epsilon-start", "bba", false],

  ["dfa-words", "up down up", true],
  ["dfa-words", "up", true],
  ["dfa-words", "up down", false],
  ["dfa-words", "down down", false],
  ["dfa-words", "", false],

  ["dfa-emoji", "🙂🙁🙂🙁", true],
  ["dfa-emoji", "🙂🙂", true],
  ["dfa-emoji", "", true],
  ["dfa-emoji", "🙁", false],
  ["dfa-emoji", "🙁🙂🙁🙁", false],

  ["dfa-accepts-nothing", "0110", false],
  ["dfa-accepts-nothing", "", false],
  ["dfa-accepts-nothing", "1", false],
  ["dfa-accepts-nothing", "00", false],
];

const machineOf = (preset) => buildMachine(fas, checkDefinition(preset.definition));

// Every word over the alphabet up to a length, shortest first
function wordsUpTo(alphabet, length) {
  let words = [[]];
  const all = [[]];
  for (let i = 0; i < length; i++) {
    words = words.flatMap((word) => alphabet.map((symbol) => [...word, symbol]));
    all.push(...words);
  }
  return all;
}

describe("simulator presets", function () {
  it("offers about eight machines, each with a name, a sentence about it and a first input", function () {
    assert.isAtLeast(PRESETS.length, 7);
    assert.isAtMost(PRESETS.length, 9);
    assert.lengthOf(new Set(PRESETS.map((preset) => preset.id)), PRESETS.length);
    for (const preset of PRESETS) {
      assert.match(preset.label, /^(DFA|NFA): /, preset.id);
      assert.match(preset.about, /^[A-Z].*\.$/, preset.id);
      assert.isString(preset.input, preset.id);
    }
  });

  it("covers the kinds of machine the simulator has to handle", function () {
    const machines = PRESETS.map(machineOf);
    const some = (test) => machines.some(test);

    assert.isTrue(some((m) => m.type === "DFA"), "a DFA");
    assert.isTrue(some((m) => m.type === "NFA" && m.edges.some((edge) => edge.input === "")), "an NFA with ε-transitions");
    assert.isTrue(some((m) => m.edges.some((edge) => edge.input === "" && edge.from === m.definition.start) && trace(fas, m, []).accepted), "an ε-move out of the start state that accepts the empty input");
    assert.isTrue(some((m) => m.definition.alphabet.some((symbol) => [...symbol].length > 1)), "symbols longer than one character");
    assert.isTrue(some((m) => m.definition.alphabet.some((symbol) => symbol.length > [...symbol].length)), "a symbol outside the Basic Multilingual Plane");
    assert.isTrue(some((m) => m.definition.accepts.length === 0), "a machine that rejects everything");
  });

  it("names every preset in the table", function () {
    assert.sameMembers([...new Set(GOLDEN.map(([id]) => id))], PRESETS.map((preset) => preset.id));
    for (const preset of PRESETS) {
      assert.isTrue(GOLDEN.some(([id, input]) => id === preset.id && input === preset.input), `${preset.id}: its first input is in the table`);
    }
  });

  for (const [id, input, accepted] of GOLDEN) {
    it(`${id} ${JSON.stringify(input)} is ${accepted ? "accepted" : "rejected"}`, function () {
      const machine = machineOf(PRESETS.find((preset) => preset.id === id));
      const symbols = readInput(input, machine.definition.alphabet);

      assert.strictEqual(fas.simulateFSA(symbols, machine.fsa), accepted, "the library");

      const run = trace(fas, machine, symbols);
      assert.isNull(run.problem);
      assert.strictEqual(run.accepted, accepted, "the simulator's verdict");
      const last = run.steps[run.steps.length - 1].after;
      assert.strictEqual(last.some((name) => machine.definition.accepts.includes(name)), accepted, "the states stepping ends in");
    });
  }

  for (const preset of PRESETS) {
    it(`${preset.id}: stepping ends where simulateFSA says, for every input up to four symbols`, function () {
      const machine = machineOf(preset);
      const { alphabet, accepts } = machine.definition;
      for (const symbols of wordsUpTo(alphabet, 4)) {
        const run = trace(fas, machine, symbols);
        const expected = fas.simulateFSA(symbols, machine.fsa);
        assert.strictEqual(run.accepted, expected, JSON.stringify(symbols));
        assert.equal(run.steps.length, symbols.length + 1, JSON.stringify(symbols));
        const last = run.steps[run.steps.length - 1].after;
        assert.strictEqual(last.some((name) => accepts.includes(name)), expected, JSON.stringify(symbols));
        if (alphabet.every((symbol) => [...symbol].length === 1)) {
          assert.strictEqual(fas.simulateFSA(symbols.join(""), machine.fsa), expected, JSON.stringify(symbols));
        }
      }
    });
  }
});
