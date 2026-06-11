import { FSA } from "../interfaces/FSA";
import type { TransitionInput } from "../utils/DFAUtils";

export type FSADefinition = {
  states: string[];
  alphabet: string[];
  transitions: TransitionInput[];
  start: string;
  accepts: string[];
};

export function languageAlphabetSymbols(fsa: FSA): string[] {
  return fsa
    .getAlphabet()
    .sigma.filter(symbol => symbol !== "")
    .sort();
}

export function mergeAlphabets(a: string[], b: string[]): string[] {
  const merged = new Set([...a, ...b]);
  return [...merged].sort();
}

export function exportFSADefinition(fsa: FSA): FSADefinition {
  const states = [...fsa.getStates()].map(state => state.name).sort();
  const alphabet = languageAlphabetSymbols(fsa);
  const accepts = [...fsa.getAcceptStates()].map(state => state.name).sort();
  const start = fsa.getStartState().name;

  const grouped = new Map<string, Set<string>>();
  for (const transition of fsa.getTFunc()) {
    const key = `${transition.origin.name}\0${transition.input}`;
    const bucket = grouped.get(key) ?? new Set<string>();
    bucket.add(transition.dest.name);
    grouped.set(key, bucket);
  }

  const transitions: TransitionInput[] = [];
  for (const [key, destinations] of grouped) {
    const [from, input] = key.split("\0");
    transitions.push({
      from,
      to: [...destinations].sort().join(","),
      input,
    });
  }

  transitions.sort((left, right) => {
    const byFrom = left.from.localeCompare(right.from);
    if (byFrom !== 0) return byFrom;
    return left.input.localeCompare(right.input);
  });

  return { states, alphabet, transitions, start, accepts };
}

export function cloneDefinitionWithPrefix(definition: FSADefinition, prefix: string): FSADefinition {
  const mapName = (name: string) => `${prefix}${name}`;

  return {
    states: definition.states.map(mapName),
    alphabet: [...definition.alphabet],
    start: mapName(definition.start),
    accepts: definition.accepts.map(mapName),
    transitions: definition.transitions.map(transition => ({
      from: mapName(transition.from),
      to: transition.to
        .split(",")
        .map(part => mapName(part.trim()))
        .join(","),
      input: transition.input,
    })),
  };
}

import { createFSA } from "../utils/FSAUtils";

export function buildFromDefinition(definition: FSADefinition) {
  return createFSA(
    definition.states,
    definition.alphabet,
    definition.transitions,
    definition.start,
    definition.accepts
  );
}