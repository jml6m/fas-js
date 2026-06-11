/**
 * CLI golden test: large digraph DOT output (no visualization).
 * Verifies exact generateDigraph() bytes for a high state-count machine.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createFSA } from "../src/modules";

import { assert } from "chai";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(__dirname, "fixtures", "digraph-large-ring.expected.dot");

function buildLargeRingDfa(stateCount) {
  const states = Array.from({ length: stateCount }, (_, i) => "q" + i);
  const transitions = [];

  for (let i = 0; i < stateCount; i++) {
    transitions.push({
      from: "q" + i,
      to: "q" + ((i + 1) % stateCount),
      input: "0",
    });
    transitions.push({
      from: "q" + i,
      to: "q" + ((i + stateCount - 1) % stateCount),
      input: "1",
    });
  }

  return createFSA(states, "01", transitions, "q0", ["q8", "q16", "q24"]);
}

describe("CLI digraph golden output", function () {
  it("matches exact DOT for 32-state ring DFA with multiple accept states", function () {
    const fsa = buildLargeRingDfa(32);
    const dot = fsa.generateDigraph();
    const expected = readFileSync(FIXTURE, "utf8");

    assert.equal(dot, expected);
    assert.isAbove(dot.length, 2000);
    assert.include(dot, "q16 [shape = doublecircle]");
    assert.include(dot, "q31 -> q0 [ label = \"0\" ]");
  });

  it("merges duplicate edge labels in DOT for multi-input transitions", function () {
    const fsa = createFSA(
      ["a", "b"],
      "01",
      [
        { from: "a", to: "b", input: "0" },
        { from: "a", to: "b", input: "1" },
        { from: "b", to: "a", input: "0" },
        { from: "b", to: "b", input: "1" },
      ],
      "a",
      ["b"]
    );
    const dot = fsa.generateDigraph();
    assert.include(dot, 'a -> b [ label = "0,1" ]');
  });
});