// @flow
import chalk from "chalk";
import Set from "core-js/features/set";

import { FSA } from "../interfaces/FSA.js";
import { DFA } from "./DFA.js";
import { State, Alphabet, NFATransition, Transition } from "../components";
import { ErrorCode } from "../globals/errors.js";
import { getOrDefault } from "../globals/globals.js";

export const NFA = ((
  states: Set<State>,
  alphabet: Alphabet,
  tfunc: Set<NFATransition>,
  start: State,
  accepts: Set<State>
) => {
  class NFA extends DFA {
    // Primary FSA attributes
    #states: Set<State>;
    #alphabet: Alphabet;
    #tfunc: Set<Transition>;
    #start: State;
    #accepts: Set<State>;

    // Intermediary attributes used in constructor
    #paths: Map<State, Set<string>>; // States mapped to each member of Σ, will be empty after constructor returns
    #links: Map<string, Set<string>>; // State names mapped to their dest state names

    // Transition function is different for NFA
    constructor(states: Set<State>, alphabet: Alphabet, tfunc: Set<NFATransition>, start: State, accepts: Set<State>) {
      // Implicitly add ε to alphabet
      if (!alphabet.sigma.includes("")) alphabet.sigma.push("");

      // If NFATransition has multiple dest states, break them up into separate Transitions
      let expandedTfunc: Set<Transition> = new Set<Transition>();
      for (const _t of tfunc) {
        _t.dest.forEach(_dest => {
          expandedTfunc.add(new Transition(_t.origin, _dest, _t.input));
        });
      }

      super(states, alphabet, expandedTfunc, start, accepts);
    }
  }

  return NFA;
})();

// Global export method for creating NFA
export const createNFA = (
  states: Array<string>,
  alphabet: Array<string>,
  transitions: Array<Object>,
  start: string,
  accepts: Array<string>
): FSA => {
  // Type check and conversion for states
  let _states: Map<string, State> = new Map();
  if (typeof states === "string") {
    _states.set(states, new State(states));
  } else if (Array.isArray(states)) {
    for (const state of states) {
      if (!_states.has(state)) _states.set(state, new State(state));
    }
  } else {
    throw new TypeError(states);
  }

  // Convert transition array to Set<Transition>
  let _tfunc: Set<NFATransition> = new Set();
  if (!Array.isArray(transitions) && typeof transitions === "object") transitions = [transitions];

  if (Array.isArray(transitions)) {
    for (const tr of transitions) {
      if (!tr["from"] || !tr["to"] || (!tr["input"] && tr["input"] !== ""))
        throw new Error(ErrorCode.INVALID_TRANSITION_OBJECT);
      const fromVal: State = getOrDefault(_states, tr["from"], null);
      const toVal: Array<string> = tr["to"].split(",");

      let destStates: Array<State> = [];
      toVal.forEach(_dest => {
        destStates.push(getOrDefault(_states, _dest, null));
      });

      _tfunc.add(new NFATransition(fromVal, destStates, tr["input"]));
    }
  } else {
    throw new TypeError(transitions);
  }

  // Convert remaining inputs
  let _alphabet = new Alphabet(alphabet);
  if (typeof start !== "string") throw new TypeError(start);
  let _start = getOrDefault(_states, start, null);

  let _accepts: Set<State> = new Set();
  if (typeof accepts === "string") {
    if (_states.has(accepts)) _accepts.add(getOrDefault(_states, accepts, null));
  } else if (Array.isArray(accepts)) {
    for (const state of accepts) {
      _accepts.add(getOrDefault(_states, state, null));
    }
  } else {
    throw new TypeError(accepts);
  }

  return new NFA(new Set(_states.values()), _alphabet, _tfunc, _start, _accepts);
};
