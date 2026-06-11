import { State } from "../components/State";
import { FSA } from "../interfaces/FSA";
import { NFA } from "../automata";
import { instanceOf } from "../globals/globals";
import type { TransitionInput } from "../utils/DFAUtils";
import { languageAlphabetSymbols } from "./fsaHelpers";

function epsilonClosure(states: State[], fsa: FSA): State[] {
  const closure = new Map<string, State>();
  const stack: State[] = [];

  for (const state of states) {
    closure.set(state.name, state);
    stack.push(state);
  }

  while (stack.length > 0) {
    const current = stack.pop() as State;
    for (const transition of fsa.getTFunc()) {
      if (transition.origin === current && transition.input === "") {
        if (!closure.has(transition.dest.name)) {
          closure.set(transition.dest.name, transition.dest);
          stack.push(transition.dest);
        }
      }
    }
  }

  return [...closure.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function move(states: State[], symbol: string, fsa: FSA): State[] {
  const moved = new Map<string, State>();

  for (const state of states) {
    for (const transition of fsa.getTFunc()) {
      if (transition.origin === state && transition.input === symbol) {
        moved.set(transition.dest.name, transition.dest);
      }
    }
  }

  return [...moved.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function stateSetKey(states: State[]): string {
  return states.map(state => state.name).join(",");
}

export function subsetConstruction(nfa: FSA): {
  states: string[];
  alphabet: string[];
  transitions: TransitionInput[];
  start: string;
  accepts: string[];
} {
  if (!instanceOf(NFA, nfa)) {
    throw new TypeError("subsetConstruction requires an NFA");
  }

  const alphabet = languageAlphabetSymbols(nfa);
  const acceptNames = new Set([...nfa.getAcceptStates()].map(state => state.name));
  const startSet = epsilonClosure([nfa.getStartState()], nfa);

  const setRegistry = new Map<string, string>();
  const setMembers = new Map<string, State[]>();
  const transitions: TransitionInput[] = [];

  const nameSet = (states: State[]): string => {
    const key = stateSetKey(states);
    if (!setRegistry.has(key)) {
      const name = `d${setRegistry.size}`;
      setRegistry.set(key, name);
      setMembers.set(name, states);
    }
    return setRegistry.get(key) as string;
  };

  const startName = nameSet(startSet);
  const worklist: State[][] = [startSet];
  const seen = new Set<string>([stateSetKey(startSet)]);

  let deadAdded = false;
  const deadName = "dead";

  while (worklist.length > 0) {
    const currentSet = worklist.pop() as State[];
    const currentName = nameSet(currentSet);

    for (const symbol of alphabet) {
      const moved = move(currentSet, symbol, nfa);
      const closed = moved.length > 0 ? epsilonClosure(moved, nfa) : [];
      let targetName: string;

      if (closed.length === 0) {
        if (!deadAdded) {
          deadAdded = true;
          setMembers.set(deadName, []);
          for (const deadSymbol of alphabet) {
            transitions.push({ from: deadName, to: deadName, input: deadSymbol });
          }
        }
        targetName = deadName;
      } else {
        const key = stateSetKey(closed);
        targetName = nameSet(closed);
        if (!seen.has(key)) {
          seen.add(key);
          worklist.push(closed);
        }
      }

      transitions.push({ from: currentName, to: targetName, input: symbol });
    }
  }

  const states = [...setMembers.keys()];
  if (deadAdded && !states.includes(deadName)) {
    states.push(deadName);
  }

  const accepts = [...setMembers.entries()]
    .filter(([, members]) => members.some(state => acceptNames.has(state.name)))
    .map(([name]) => name);

  return {
    states,
    alphabet,
    transitions,
    start: startName,
    accepts,
  };
}