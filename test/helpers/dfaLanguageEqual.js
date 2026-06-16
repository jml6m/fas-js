/**
 * Complete DFA language-equivalence check (table-filling / partition refinement).
 * Test-only — not imported by src/.
 *
 * Marks state pairs (p, q) distinguishable by some input string. Two DFAs
 * recognize the same language iff their start states are not distinguishable.
 */
import { stepOnceFSA } from "../../src/modules";
import { ErrorCode } from "../../src/globals/errors";

function stateNames(fsa) {
  return [...fsa.getStates()].map(state => state.name).sort();
}

function isAccept(fsa, stateName) {
  return [...fsa.getAcceptStates()].some(state => state.name === stateName);
}

function alphabetSymbols(fsa) {
  return fsa
    .getAlphabet()
    .sigma.filter(symbol => symbol !== "")
    .sort();
}

const deadSinkByFsa = new WeakMap();

function deadSink(fsa) {
  let sink = deadSinkByFsa.get(fsa);
  if (!sink) {
    sink = `__dead__${deadSinkByFsa.size}`;
    deadSinkByFsa.set(fsa, sink);
  }
  return sink;
}

function step(fsa, stateName, symbol) {
  if (stateName.startsWith("__dead__")) {
    return deadSink(fsa);
  }

  if (!fsa.getAlphabet().sigma.includes(symbol)) {
    return deadSink(fsa);
  }

  try {
    const next = stepOnceFSA(symbol, stateName, fsa);
    if (Array.isArray(next)) {
      throw new TypeError("dfaLanguageEqual requires a DFA");
    }
    return next;
  } catch (error) {
    if (error instanceof Error && error.message === ErrorCode.INVALID_INPUT_CHAR) {
      return deadSink(fsa);
    }
    throw error;
  }
}

function isAcceptState(fsa, stateName) {
  if (stateName.startsWith("__dead__")) {
    return false;
  }
  return isAccept(fsa, stateName);
}

function pairKey(left, right) {
  return `${left}\0${right}`;
}

export function dfaLanguagesEqual(leftFsa, rightFsa) {
  if (leftFsa.getType() !== "DFA" || rightFsa.getType() !== "DFA") {
    throw new TypeError("dfaLanguageEqual requires two DFAs");
  }

  const leftStates = [...stateNames(leftFsa), deadSink(leftFsa)];
  const rightStates = [...stateNames(rightFsa), deadSink(rightFsa)];
  const alphabet = [
    ...new Set([...alphabetSymbols(leftFsa), ...alphabetSymbols(rightFsa)]),
  ].sort();

  const marked = new Set();

  for (const left of leftStates) {
    for (const right of rightStates) {
      if (isAcceptState(leftFsa, left) !== isAcceptState(rightFsa, right)) {
        marked.add(pairKey(left, right));
      }
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const left of leftStates) {
      for (const right of rightStates) {
        const key = pairKey(left, right);
        if (marked.has(key)) continue;

        for (const symbol of alphabet) {
          const leftNext = step(leftFsa, left, symbol);
          const rightNext = step(rightFsa, right, symbol);
          if (marked.has(pairKey(leftNext, rightNext))) {
            marked.add(key);
            changed = true;
            break;
          }
        }
      }
    }
  }

  const startLeft = leftFsa.getStartState().name;
  const startRight = rightFsa.getStartState().name;
  return !marked.has(pairKey(startLeft, startRight));
}