/**
 * Golden simulate table for demo/v1.5 prebuilt machines.
 * Parses EXAMPLES from app.js so preset JSON cannot drift from the UI silently.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assert } from "chai";

import { createFSA, simulateFSA, stepOnceFSA } from "../src/modules";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appJs = readFileSync(join(__dirname, "..", "demo", "v1.5", "app.js"), "utf8");

function extractExamples(source) {
  const match = source.match(/const EXAMPLES = (\{[\s\S]*?\n  \});/);
  assert.isOk(match, "EXAMPLES object should be parseable from demo/v1.5/app.js");
  // eslint-disable-next-line no-eval
  return eval("(" + match[1] + ")");
}

/**
 * Each row is a contract: preset key, input, expected acceptance, optional end state.
 * DFA endState is a string. NFA endState (when accepted) lists accept states reached.
 */
const GOLDEN_SIMULATE_TABLE = [
  { preset: "dfaEndsIn1", input: "101", accepted: true, endState: "q2" },
  { preset: "dfaEndsIn1", input: "100", accepted: false, endState: "q1" },
  { preset: "dfaEndsIn1", input: "1", accepted: true, endState: "q2" },
  { preset: "dfaEndsIn1", input: "", accepted: false, endState: "q1" },

  { preset: "dfaSameSymbolEnds", input: "bab", accepted: true, endState: "r1" },
  { preset: "dfaSameSymbolEnds", input: "aa", accepted: true, endState: "q1" },
  { preset: "dfaSameSymbolEnds", input: "b", accepted: true, endState: "r1" },
  { preset: "dfaSameSymbolEnds", input: "ab", accepted: false, endState: "q2" },
  { preset: "dfaSameSymbolEnds", input: "abb", accepted: false, endState: "q2" },

  { preset: "nfaAccepts01or1", input: "01", accepted: true, endState: ["q3"] },
  { preset: "nfaAccepts01or1", input: "1", accepted: true, endState: ["q4"] },
  { preset: "nfaAccepts01or1", input: "0", accepted: false },
  { preset: "nfaAccepts01or1", input: "10", accepted: false },
  { preset: "nfaAccepts01or1", input: "", accepted: false },

  { preset: "nfaOneNearEnd", input: "100", accepted: true, endState: ["q4"] },
  { preset: "nfaOneNearEnd", input: "10", accepted: true, endState: ["q4"] },
  { preset: "nfaOneNearEnd", input: "1", accepted: false },
  { preset: "nfaOneNearEnd", input: "0", accepted: false },
  { preset: "nfaOneNearEnd", input: "000", accepted: false },
];

function buildFromPreset(examples, key) {
  const def = examples[key];
  assert.isOk(def, `missing preset ${key}`);
  return createFSA(
    def.states,
    def.alphabet,
    def.transitions,
    def.start,
    def.accepts
  );
}

function stepThrough(input, fsa, start) {
  let state = start;
  for (const symbol of input) {
    state = stepOnceFSA(symbol, state, fsa);
  }
  return state;
}

function sortStateList(state) {
  if (Array.isArray(state)) {
    return [...state].sort();
  }
  return state;
}

describe("demo preset golden simulate table", function () {
  const examples = extractExamples(appJs);

  it("defines four prebuilt presets with defaultInput", function () {
    assert.deepEqual(Object.keys(examples).sort(), [
      "dfaEndsIn1",
      "dfaSameSymbolEnds",
      "nfaAccepts01or1",
      "nfaOneNearEnd",
    ]);
    for (const def of Object.values(examples)) {
      assert.isString(def.defaultInput);
      assert.isAbove(def.defaultInput.length, 0);
    }
  });

  for (const row of GOLDEN_SIMULATE_TABLE) {
    it(`${row.preset} · "${row.input}" → ${row.accepted ? "accept" : "reject"}`, function () {
      const fsa = buildFromPreset(examples, row.preset);
      const def = examples[row.preset];

      assert.equal(simulateFSA(row.input, fsa), row.accepted);

      if (row.endState !== undefined) {
        const end = simulateFSA(row.input, fsa, false, true);
        if (Array.isArray(row.endState)) {
          assert.deepEqual(sortStateList(end), sortStateList(row.endState));
        } else {
          assert.equal(end, row.endState);
        }
      }

      const stepped = stepThrough(row.input, fsa, def.start);
      if (fsa.getType() === "DFA") {
        assert.equal(stepped, simulateFSA(row.input, fsa, false, true));
      } else if (row.accepted && row.endState) {
        const acceptNames = Array.isArray(row.endState) ? row.endState : [row.endState];
        const steppedList = Array.isArray(stepped) ? stepped : [stepped];
        assert.isTrue(acceptNames.some(name => steppedList.includes(name)));
      }
    });
  }

  it("each preset defaultInput matches its golden default row", function () {
    for (const def of Object.values(examples)) {
      const key = Object.keys(examples).find(k => examples[k] === def);
      const row = GOLDEN_SIMULATE_TABLE.find(
        r => r.preset === key && r.input === def.defaultInput
      );
      assert.isOk(row, `${key} defaultInput "${def.defaultInput}" missing from golden table`);
      const fsa = buildFromPreset(examples, key);
      assert.equal(simulateFSA(def.defaultInput, fsa), row.accepted);
    }
  });
});