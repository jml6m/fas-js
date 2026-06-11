/**
 * Workflow tests: generated FSAs and step/simulate equivalence.
 */
import { createFSA, simulateFSA, stepOnceFSA } from "../src/modules";

import { assert } from "chai";

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomString(rng, alphabet, maxLen) {
  const len = Math.floor(rng() * (maxLen + 1));
  let s = "";
  for (let i = 0; i < len; i++) {
    s += alphabet[Math.floor(rng() * alphabet.length)];
  }
  return s;
}

function buildRandomCompleteDfa(rng, stateCount, alphabet) {
  const states = Array.from({ length: stateCount }, (_, i) => "s" + i);
  const transitions = [];

  for (const from of states) {
    for (const input of alphabet) {
      const to = states[Math.floor(rng() * stateCount)];
      transitions.push({ from, to, input });
    }
  }

  const acceptCount = 1 + Math.floor(rng() * stateCount);
  const accepts = states.slice(0, acceptCount);

  return createFSA(states, alphabet, transitions, states[0], accepts);
}

function referenceSimulateDfa(fsa, w) {
  let state = fsa.getStartState();
  const chars = w === "" ? [] : [...w];

  for (const sym of chars) {
    let dest = null;
    for (const tr of fsa.getTFunc()) {
      if (tr.origin === state && tr.input === sym) {
        dest = tr.dest;
        break;
      }
    }
    if (!dest) {
      return false;
    }
    state = dest;
  }

  return fsa.getAcceptStates().has(state);
}

function epsilonClosure(nfa, stateNames) {
  let states = stateNames.map(name => {
    for (const s of nfa.getStates()) {
      if (s.name === name) return s;
    }
    throw new Error("state not found: " + name);
  });

  let changed = true;
  while (changed) {
    changed = false;
    for (const tr of nfa.getTFunc()) {
      if (tr.input === "" && states.includes(tr.origin) && !states.includes(tr.dest)) {
        states.push(tr.dest);
        changed = true;
      }
    }
  }

  return states;
}

function referenceSimulateNfa(nfa, w) {
  let states = epsilonClosure(nfa, [nfa.getStartState().name]);
  const chars = w === "" ? [] : [...w];

  for (const sym of chars) {
    const next = [];
    for (const state of states) {
      for (const tr of nfa.getTFunc()) {
        if (tr.origin === state && tr.input === sym) {
          next.push(tr.dest);
        }
      }
    }
    states = epsilonClosure(
      nfa,
      next.map(s => s.name)
    );
    if (!states.length) {
      return false;
    }
  }

  for (const state of states) {
    if (nfa.getAcceptStates().has(state)) {
      return true;
    }
  }
  return false;
}

function buildRandomNfa(rng) {
  const states = ["n0", "n1", "n2", "n3"];
  const transitions = [
    { from: "n0", to: "n0", input: "0" },
    { from: "n0", to: "n1", input: "1" },
    { from: "n1", to: "n2", input: "0" },
    { from: "n1", to: "n1,n2", input: "1" },
    { from: "n2", to: "n3", input: "0" },
    { from: "n2", to: "n2", input: "1" },
    { from: "n3", to: "n3", input: "0" },
    { from: "n3", to: "n3", input: "1" },
  ];

  if (rng() > 0.5) {
    transitions.push({ from: "n1", to: "n3", input: "" });
  }

  const accepts = rng() > 0.5 ? ["n3"] : ["n2", "n3"];
  return createFSA(states, "01", transitions, "n0", accepts);
}

describe("Generated FSA workflows", function () {
  it("simulateFSA matches reference walk on seeded random complete DFAs", function () {
    const rng = mulberry32(0xfa5a);
    const alphabet = ["0", "1"];

    for (let i = 0; i < 24; i++) {
      const stateCount = 2 + Math.floor(rng() * 4);
      const fsa = buildRandomCompleteDfa(rng, stateCount, alphabet);
      assert.equal(fsa.getType(), "DFA");

      for (let j = 0; j < 12; j++) {
        const w = randomString(rng, alphabet, 6);
        assert.equal(
          simulateFSA(w, fsa),
          referenceSimulateDfa(fsa, w),
          `DFA ${i} input "${w}"`
        );
      }
    }
  });

  it("simulateFSA matches reference NFA walk on seeded variants", function () {
    const rng = mulberry32(0xfa5b);

    for (let i = 0; i < 16; i++) {
      const nfa = buildRandomNfa(rng);
      assert.equal(nfa.getType(), "NFA");

      for (let j = 0; j < 10; j++) {
        const w = randomString(rng, ["0", "1"], 5);
        assert.equal(
          simulateFSA(w, nfa),
          referenceSimulateNfa(nfa, w),
          `NFA ${i} input "${w}"`
        );
      }
    }
  });
});

describe("Step vs simulate equivalence", function () {
  const endsInOne = createFSA(
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
  );

  it("iterating stepOnceFSA agrees with simulateFSA for a DFA", function () {
    const inputs = ["", "0", "1", "101", "10101", "0110"];

    for (const w of inputs) {
      let state = endsInOne.getStartState().name;

      for (const sym of w) {
        state = stepOnceFSA(sym, state, endsInOne);
      }

      const steppedAccepted = endsInOne.getAcceptStates().has(
        [...endsInOne.getStates()].find(s => s.name === state)
      );
      const simulatedAccepted = simulateFSA(w, endsInOne);
      const simulatedEnd = simulateFSA(w, endsInOne, false, true);

      assert.equal(simulatedAccepted, steppedAccepted, `acceptance for "${w}"`);
      assert.equal(simulatedEnd, state, `end state for "${w}"`);
    }
  });
});

describe("NFA step-through workflows (#demo)", function () {
  const nfaOneNearEnd = createFSA(
    ["q1", "q2", "q3", "q4"],
    "01",
    [
      { from: "q1", to: "q1", input: "0" },
      { from: "q1", to: "q1,q2", input: "1" },
      { from: "q2", to: "q3", input: "0" },
      { from: "q2", to: "q3", input: "1" },
      { from: "q2", to: "q3", input: "" },
      { from: "q3", to: "q4", input: "0" },
      { from: "q3", to: "q4", input: "1" },
    ],
    "q1",
    ["q4"]
  );

  function sortStates(states) {
    return [...states].sort();
  }

  it("stepOnceFSA traces superposition for input 100", function () {
    assert.equal(nfaOneNearEnd.getType(), "NFA");

    let state = stepOnceFSA("1", "q1", nfaOneNearEnd);
    assert.deepEqual(sortStates(state), ["q1", "q2", "q3"]);

    state = stepOnceFSA("0", state, nfaOneNearEnd);
    assert.deepEqual(sortStates(state), ["q1", "q3", "q4"]);

    state = stepOnceFSA("0", state, nfaOneNearEnd);
    assert.deepEqual(sortStates(state), ["q1", "q4"]);

    assert.isTrue(simulateFSA("100", nfaOneNearEnd));
    assert.deepEqual(simulateFSA("100", nfaOneNearEnd, false, true), ["q4"]);
  });

  it("iterating stepOnceFSA agrees with simulateFSA acceptance", function () {
    const words = ["", "1", "10", "100", "101", "000", "110"];

    for (const word of words) {
      let state = [nfaOneNearEnd.getStartState().name];

      for (const symbol of word) {
        state = stepOnceFSA(symbol, state, nfaOneNearEnd);
      }

      const steppedAccepted =
        Array.isArray(state) &&
        state.some(name => name === "q4");
      const simulatedAccepted = simulateFSA(word, nfaOneNearEnd);

      assert.equal(simulatedAccepted, steppedAccepted, `acceptance for "${word}"`);
    }
  });
});