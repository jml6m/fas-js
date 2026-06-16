/**
 * Structural witness checks for subset construction (L1–L4).
 * Test-only — independent reference for δ' recomputation.
 */
import { assert } from "chai";

function stateNames(fsa) {
  return new Set([...fsa.getStates()].map(state => state.name));
}

function acceptNames(fsa) {
  return new Set([...fsa.getAcceptStates()].map(state => state.name));
}

function resolveState(fsa, name) {
  for (const state of fsa.getStates()) {
    if (state.name === name) return state;
  }
  throw new Error(`unknown state: ${name}`);
}

function epsilonClosureNames(names, fsa) {
  const closure = new Map();
  const stack = [];

  for (const name of names) {
    closure.set(name, resolveState(fsa, name));
    stack.push(name);
  }

  while (stack.length > 0) {
    const currentName = stack.pop();
    const current = closure.get(currentName);
    for (const transition of fsa.getTFunc()) {
      if (transition.origin === current && transition.input === "") {
        if (!closure.has(transition.dest.name)) {
          closure.set(transition.dest.name, transition.dest);
          stack.push(transition.dest.name);
        }
      }
    }
  }

  return [...closure.keys()].sort();
}

function moveNames(names, symbol, fsa) {
  const moved = new Set();
  for (const name of names) {
    const origin = resolveState(fsa, name);
    for (const transition of fsa.getTFunc()) {
      if (transition.origin === origin && transition.input === symbol) {
        moved.add(transition.dest.name);
      }
    }
  }
  return [...moved].sort();
}

function deltaPrime(names, symbol, fsa) {
  const moved = moveNames(names, symbol, fsa);
  return moved.length > 0 ? epsilonClosureNames(moved, fsa) : [];
}

function witnessKey(names) {
  return names.join(",");
}

export function assertSubsetStructuralWitness(nfa, result) {
  const { definition, subsetOf } = result;
  const q = stateNames(nfa);
  const f = acceptNames(nfa);
  const start = nfa.getStartState().name;

  // L1: every DFA state is a subset of Q (or explicit dead)
  for (const [dfaState, subset] of subsetOf) {
    assert.include(definition.states, dfaState, `witness state ${dfaState}`);
    if (dfaState === "dead") {
      assert.deepEqual(subset, [], "dead state has empty subset witness");
      continue;
    }
    assert.isAbove(subset.length, 0, `non-dead state ${dfaState} has nonempty subset`);
    for (const name of subset) {
      assert.isTrue(q.has(name), `${name} in ${dfaState} must belong to NFA states`);
    }
  }

  const keys = [...subsetOf.values()].map(witnessKey);
  assert.equal(keys.length, new Set(keys).size, "distinct DFA states have distinct subset keys");

  assert.isAtMost(definition.states.length, 2 ** q.size + 1, "state count within powerset bound");

  // L2: start state witness is E({q0})
  const expectedStart = epsilonClosureNames([start], nfa);
  assert.deepEqual(
    subsetOf.get(definition.start),
    expectedStart,
    "start DFA state must be ε-closure of {q0}"
  );

  // L3: each transition follows δ'(R, a) = E(⋃ δ(r, a))
  for (const transition of definition.transitions) {
    const fromSubset = subsetOf.get(transition.from);
    assert.isDefined(fromSubset, `transition from ${transition.from}`);
    const expectedTarget = deltaPrime(fromSubset, transition.input, nfa);
    const actualTarget = subsetOf.get(transition.to);
    assert.deepEqual(
      actualTarget,
      expectedTarget,
      `δ'(${transition.from}, ${transition.input})`
    );
  }

  // L4: accept states are exactly subsets intersecting F
  const expectedAccepts = [...subsetOf.entries()]
    .filter(([, subset]) => subset.some(name => f.has(name)))
    .map(([name]) => name)
    .sort();

  assert.deepEqual([...definition.accepts].sort(), expectedAccepts, "F' accept sets");
}

export function assertAcceptanceSmoke(nfaLang, words) {
  const dfaLang = nfaLang.toDFA();
  assert.equal(dfaLang.getAutomaton().getType(), "DFA");

  for (const word of words) {
    assert.equal(
      nfaLang.contains(word),
      dfaLang.contains(word),
      `smoke agreement for "${word}"`
    );
  }
}