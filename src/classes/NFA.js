// @flow
import chalk from "chalk";

import { FSA } from "../interfaces/FSA.js";
import { DFA } from "./DFA.js";
import { NFATransition } from "./NFATransition.js";
import { State } from "../classes/State.js";
import { Alphabet } from "../classes/Alphabet.js";
import { Transition } from "../classes/Transition.js";

import { ErrorCode } from "../globals/errors.js";
import { getOrDefault, instanceOf } from "../globals/globals.js";

export class NFA extends DFA {
  // Transition function is different for NFA
  constructor(states: Set<State>, alphabet: Alphabet, tfunc: Set<NFATransition>, start: State, accepts: Set<State>) {
    // If NFATransition has multiple dest states, break them up into separate Transitions
    let expandedTfunc: Set<Transition> = new Set<Transition>();
    for (const _t of tfunc) {
      _t.dest.forEach(_dest => {
        expandedTfunc.add(new Transition(_t.origin, _dest, _t.input));
      });
    }

    super(states, alphabet, expandedTfunc, start, accepts);

    // Implicitly add ε to alphabet
    if (!this.alphabet.sigma.includes("")) this.alphabet.sigma.push("");
  }

  // NFA inheritly allows for ε (empty string) transition if specified
  isValidInputChar(input: string): boolean {
    return this.alphabet.sigma.indexOf(input) !== -1 || input === "";
  }

  // Follow all ε transitions and add to `state` (origin states)
  populateEpsilons(state: Array<State>): Array<State> {
    let cont: boolean = true; // continue
    while (cont) {
      cont = false;

      // Find all ε from origin set
      const epsTransitions: Array<Transition> = Array.from(this.tfunc).filter(obj => {
        return state.includes(obj.origin) && obj.input === "";
      });

      // Add new states, break if no new states found
      for (const _t of epsTransitions) {
        if (!state.includes(_t.dest)) {
          state.push(_t.dest);
          cont = true;
        }
      }
    }
    return state;
  }

  // NFA returns set of destination states rather than one state
  receiveInputNFA(input: string, state: Array<State>): Set<State> {
    let path: Array<Transition> = [];
    if (this.alphabet.sigma.indexOf(input) === -1) throw new Error(ErrorCode.INVALID_INPUT_CHAR);

    // Empty transitions, will also convert state to Array
    state = this.populateEpsilons(state);

    // Looking at all origin states, based on input char, determine set of destination states
    for (const _s of state) {
      const _addToPath: Array<Transition> = Array.from(this.tfunc).filter(obj => {
        return obj.origin === _s && obj.input === input;
      });

      path = path.concat(_addToPath);
    }

    let retSet: Set<State> = new Set<State>();
    if (path.length > 1) {
      for (const _s of path) retSet.add(_s.dest);
    } else if (path.length === 1) {
      retSet.add(path[0].dest);
    } else {
      // No valid transition found, returning input states
      for (const _s of state) retSet.add(_s);
    }

    return retSet;
  }

  // Validate tfunc according to NFA rules
  validateTFunc() {
    let newTFunc: Set<Transition> = new Set(); // Will contain only necessary transitions

    for (const _t of this.tfunc) {
      let skip = false;

      // Check for valid states
      if (!this.states.has(_t.origin)) throw new Error(ErrorCode.ORIGIN_STATE_NOT_FOUND);
      if (!this.states.has(_t.dest)) throw new Error(ErrorCode.DEST_STATE_NOT_FOUND);

      const pathStateVals: Set<string> = getOrDefault(this.paths, _t.origin, new Set());

      // Check for duplicate before adding
      for (const _checkT of newTFunc) {
        if (_checkT.origin === _t.origin && _checkT.dest === _t.dest && _checkT.input === _t.input) skip = true;
      }

      // Map transition to a path and remove on match
      if (!skip) {
        if (this.paths.has(_t.origin)) {
          if (this.isValidInputChar(_t.input)) {
            newTFunc.add(_t);
          } else {
            throw new Error(ErrorCode.INVALID_INPUT_CHAR);
          }
        }
      }
    }

    this.tfunc = newTFunc;
  }
}

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
