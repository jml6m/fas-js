import type { TransitionInput } from "../utils/DFAUtils";
import { cloneDefinitionWithPrefix, exportFSADefinition, FSADefinition, mergeAlphabets } from "./fsaHelpers";

function unionDefinitions(left: FSADefinition, right: FSADefinition): FSADefinition {
  const leftClone = cloneDefinitionWithPrefix(left, "L1_");
  const rightClone = cloneDefinitionWithPrefix(right, "L2_");
  const start = "union_start";
  const states = [start, ...leftClone.states, ...rightClone.states];
  const transitions: TransitionInput[] = [
    { from: start, to: leftClone.start, input: "" },
    { from: start, to: rightClone.start, input: "" },
    ...leftClone.transitions,
    ...rightClone.transitions,
  ];

  return {
    states,
    alphabet: mergeAlphabets(leftClone.alphabet, rightClone.alphabet),
    transitions,
    start,
    accepts: [...leftClone.accepts, ...rightClone.accepts],
  };
}

function concatDefinitions(left: FSADefinition, right: FSADefinition): FSADefinition {
  const leftClone = cloneDefinitionWithPrefix(left, "C1_");
  const rightClone = cloneDefinitionWithPrefix(right, "C2_");
  const bridgeTransitions: TransitionInput[] = [];

  for (const accept of leftClone.accepts) {
    bridgeTransitions.push({ from: accept, to: rightClone.start, input: "" });
  }

  return {
    states: [...leftClone.states, ...rightClone.states],
    alphabet: mergeAlphabets(leftClone.alphabet, rightClone.alphabet),
    transitions: [...leftClone.transitions, ...rightClone.transitions, ...bridgeTransitions],
    start: leftClone.start,
    accepts: [...rightClone.accepts],
  };
}

function kleeneStarDefinition(source: FSADefinition): FSADefinition {
  const clone = cloneDefinitionWithPrefix(source, "K_");
  const hub = "star_hub";
  const bridgeTransitions: TransitionInput[] = [
    { from: hub, to: clone.start, input: "" },
  ];

  for (const accept of clone.accepts) {
    bridgeTransitions.push({ from: accept, to: hub, input: "" });
    bridgeTransitions.push({ from: accept, to: clone.start, input: "" });
  }

  return {
    states: [hub, ...clone.states],
    alphabet: [...clone.alphabet],
    transitions: [...clone.transitions, ...bridgeTransitions],
    start: hub,
    accepts: [hub, ...clone.accepts],
  };
}

export const LanguageOperations = {
  unionDefinitions,
  concatDefinitions,
  kleeneStarDefinition,
};