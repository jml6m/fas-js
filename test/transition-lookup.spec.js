/**
 * Stepping looks transitions up instead of searching the transition set. These tests hold the
 * lookup to the results a plain search over the set gives, state by state and in the same order.
 */
import { assert } from "chai";

import { createFSA, simulateFSA, stepOnceFSA } from "../src/modules";
import { Transition } from "../src/components";
import { ErrorCode } from "../src/globals/errors";

// Small deterministic generator, so every run sees the same machines
function random(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const next = random(20261124);
const pick = (list) => list[Math.floor(next() * list.length)];
const shuffle = (list) => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

function randomDfa() {
  const states = shuffle(Array.from({ length: 1 + Math.floor(next() * 8) }, (_, i) => `q${i}`));
  const sigma = pick([["0", "1"], ["a", "b", "c"], ["up", "down"]]);
  const transitions = [];
  for (const from of states) for (const input of sigma) transitions.push({ from, to: pick(states), input });
  return { args: [states, sigma, shuffle(transitions), pick(states), states.filter(() => next() < 0.4)], states, sigma };
}

// ε-transitions, several destinations, and states with no transition out at all
function randomNfa() {
  const states = shuffle(Array.from({ length: 1 + Math.floor(next() * 10) }, (_, i) => `q${i}`));
  const sigma = pick([["0", "1"], ["a", "b", "c"], ["x"]]);
  const density = next();
  const transitions = [];
  for (const from of states) {
    if (next() < 0.15) continue;
    for (const input of sigma) {
      if (next() < density) {
        const dests = new Set(Array.from({ length: 1 + Math.floor(next() * 3) }, () => pick(states)));
        transitions.push({ from, to: [...dests].join(","), input });
      }
    }
    for (let i = Math.floor(next() * 3); i > 0; i--) transitions.push({ from, to: pick(states), input: "" });
  }
  transitions.push({ from: states[0], to: pick(states), input: "" });
  return { args: [states, sigma, shuffle(transitions), pick(states), states.filter(() => next() < 0.4)], states, sigma };
}

// The ε-closure as a search: scan the whole set until nothing new turns up
function closureBySearch(fsa, states) {
  for (let grew = true; grew; ) {
    grew = false;
    const epsilons = [...fsa.getTFunc()].filter((t) => states.includes(t.origin) && t.input === "");
    for (const t of epsilons) {
      if (!states.includes(t.dest)) {
        states.push(t.dest);
        grew = true;
      }
    }
  }
  return states;
}

// One step as a search over the whole transition set. Names in, names out.
function stepBySearch(fsa, input, names) {
  const all = [...fsa.getStates()];
  if (fsa.getType() === "DFA") {
    const origin = all.find((state) => state.name === names);
    return [...fsa.getTFunc()].find((t) => t.origin === origin && t.input === input).dest.name;
  }

  const current = closureBySearch(
    fsa,
    all.filter((state) => names.includes(state.name))
  );
  if (input === "") return current.map((state) => state.name);

  const moved = [];
  for (const origin of current) {
    for (const t of fsa.getTFunc()) if (t.origin === origin && t.input === input) moved.push(t.dest);
  }
  if (moved.length === 0) return [];
  return [...new Set(closureBySearch(fsa, moved))].map((state) => state.name);
}

describe("Transition lookup", function () {
  it("steps 200 generated DFAs exactly as a search over the transition set does", function () {
    for (let i = 0; i < 200; i++) {
      const { args, sigma } = randomDfa();
      const dfa = createFSA(...args);
      let state = dfa.getStartState().name;
      for (let step = 0; step < 12; step++) {
        const input = pick(sigma);
        const expected = stepBySearch(dfa, input, state);
        assert.equal(stepOnceFSA(input, state, dfa), expected);
        state = expected;
      }
    }
  });

  it("steps 300 generated NFAs exactly as a search does, in the same order", function () {
    for (let i = 0; i < 300; i++) {
      const { args, sigma } = randomNfa();
      const nfa = createFSA(...args);
      let active = stepOnceFSA("", nfa.getStartState().name, nfa);
      assert.deepEqual(active, stepBySearch(nfa, "", [nfa.getStartState().name]));

      for (let step = 0; step < 10 && active.length > 0; step++) {
        const input = pick([...sigma, ""]);
        const expected = stepBySearch(nfa, input, active);
        assert.deepEqual(stepOnceFSA(input, active, nfa), expected);
        active = expected;
      }
    }
  });

  it("simulates generated machines to the result stepping by search reaches", function () {
    for (let i = 0; i < 200; i++) {
      const { args, sigma } = i % 2 ? randomNfa() : randomDfa();
      const fsa = createFSA(...args);
      const accepts = new Set([...fsa.getAcceptStates()].map((state) => state.name));
      const word = Array.from({ length: Math.floor(next() * 9) }, () => pick(sigma));

      let accepted;
      if (fsa.getType() === "DFA") {
        let state = fsa.getStartState().name;
        for (const input of word) state = stepBySearch(fsa, input, state);
        accepted = accepts.has(state);
      } else {
        let active = stepBySearch(fsa, "", [fsa.getStartState().name]);
        for (const input of word) active = stepBySearch(fsa, input, active);
        accepted = active.some((name) => accepts.has(name));
      }
      assert.equal(simulateFSA(word, fsa), accepted, JSON.stringify(args));
    }
  });

  it("returns no states for an NFA state with no transition out", function () {
    const nfa = createFSA(["a", "b"], ["x"], [{ from: "a", to: "a,b", input: "x" }], "a", ["b"]);
    assert.deepEqual(stepOnceFSA("x", "b", nfa), []);
    assert.deepEqual(stepOnceFSA("", "b", nfa), ["b"]);
  });

  it("rejects an unknown symbol or state with the same error codes as before", function () {
    const dfa = createFSA(["a"], ["x"], [{ from: "a", to: "a", input: "x" }], "a", ["a"]);
    const nfa = createFSA(["a", "b"], ["x"], [{ from: "a", to: "a,b", input: "x" }], "a", ["b"]);

    for (const fsa of [dfa, nfa]) {
      assert.throws(() => stepOnceFSA("z", "a", fsa), ErrorCode.INVALID_INPUT_CHAR);
      assert.throws(() => stepOnceFSA("x", "missing", fsa), ErrorCode.INVALID_STATE_NAME);
      assert.throws(() => stepOnceFSA("x", ["a", "missing"], fsa), ErrorCode.INVALID_STATE_NAME);
      assert.throws(() => stepOnceFSA("x", ["a", "a"], fsa), ErrorCode.INVALID_STATE_NAME);
      assert.throws(() => simulateFSA("xz", fsa), ErrorCode.INVALID_INPUT_CHAR);
    }
    assert.throws(() => stepOnceFSA("x", ["a", "b"], createFSA(["a", "b"], ["x"], [
      { from: "a", to: "b", input: "x" },
      { from: "b", to: "a", input: "x" },
    ], "a", [])), ErrorCode.INVALID_STATE_ARRAY);
  });

  // The set getTFunc() returns is the automaton's own (see the issue on getters). The lookup is
  // built from it on the first step and rebuilt when the set has grown or shrunk.
  describe("when the set returned by getTFunc() is changed after a step", function () {
    let nfa, a, b, c;

    beforeEach(function () {
      nfa = createFSA(["a", "b", "c"], ["x"], [{ from: "a", to: "a,b", input: "x" }], "a", ["c"]);
      [a, b, c] = [...nfa.getStates()];
      assert.deepEqual(stepOnceFSA("x", "a", nfa), ["a", "b"]);
    });

    it("sees a transition that was added", function () {
      nfa.getTFunc().add(new Transition(a, c, "x"));
      assert.deepEqual(stepOnceFSA("x", "a", nfa), ["a", "b", "c"]);
    });

    it("no longer follows a transition that was deleted", function () {
      for (const t of nfa.getTFunc()) if (t.dest === b) nfa.getTFunc().delete(t);
      assert.deepEqual(stepOnceFSA("x", "a", nfa), ["a"]);
    });

    it("does not notice one transition swapped for another, which leaves the size unchanged", function () {
      for (const t of nfa.getTFunc()) if (t.dest === b) nfa.getTFunc().delete(t);
      nfa.getTFunc().add(new Transition(a, c, "x"));
      assert.deepEqual(stepOnceFSA("x", "a", nfa), ["a", "b"]);
    });
  });

  it("creates and runs a 1,024-state NFA in seconds, not minutes", function () {
    this.timeout(60000);
    const count = 1024;
    const sigma = Array.from({ length: 16 }, (_, i) => `s${i}`);
    const transitions = [];
    for (let i = 0; i < count; i++) {
      sigma.forEach((input, k) => {
        transitions.push({ from: `q${i}`, to: `q${(i * 7 + k + 1) % count},q${(i * 3 + k) % count}`, input });
      });
      if (i % 10 === 0) transitions.push({ from: `q${i}`, to: `q${(i + 1) % count}`, input: "" });
    }
    const states = Array.from({ length: count }, (_, i) => `q${i}`);
    const word = Array.from({ length: 200 }, (_, i) => sigma[(i * 5) % sigma.length]);

    const started = performance.now();
    const nfa = createFSA(states, sigma, transitions, "q0", [`q${count - 1}`]);
    const accepted = simulateFSA(word, nfa);
    const elapsed = performance.now() - started;

    assert.isBoolean(accepted);
    // About a tenth of a second with the lookup, about a minute when every step searched the set
    assert.isBelow(elapsed, 10000);
  });
});
