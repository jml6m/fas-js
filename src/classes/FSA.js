// @flow
const chalk = require("chalk");
import { State } from "./State.js";
import { Alphabet } from "./Alphabet.js";
import { Transition } from "./Transition.js";
import { ErrorCode } from "../globals/errors.js";
import { checkStateDuplicates, isSubSet, getOrDefault } from "../globals/globals.js";

export class FSA {
  // FSA 5-tuple
  states: Set<State>; // Q
  alphabet: Alphabet; // sigma
  tfunc: Set<Transition>; // delta
  start: State; // q0
  accepts: Set<State>; // F

  // Helper attributes
  paths: Map<State, Set<string>>; // Will be empty after constructor returns

  constructor(states: Set<State>, alphabet: Alphabet, tfunc: Set<Transition>, start: State, accepts: Set<State>) {
    // states validations
    if (checkStateDuplicates(states)) throw new Error(ErrorCode.DUPLICATE_STATE_NAMES);
    this.states = states;

    this.alphabet = alphabet;

    // Create paths map
    this.createPaths();

    // Start/Accept validations
    if (!states.has(start)) throw new Error(ErrorCode.START_STATE_NOT_FOUND);
    this.start = start;
    if (Object.keys(accepts).length === 0 && accepts.constructor === Object) accepts = new Set([]); // Allow for {}
    if (!isSubSet(accepts, states)) throw new Error(ErrorCode.ACCEPTS_NOT_SUBSET);
    this.accepts = accepts;

    // TFunc validations
    this.tfunc = tfunc;
    this.validateTFunc();
  }

  validateTFunc() {
    let newTFunc: Set<Transition> = new Set(); // Will contain only necessary transitions

    for (const _t of this.tfunc) {
      // Check for valid states
      if (!this.states.has(_t.origin)) throw new Error(ErrorCode.ORIGIN_STATE_NOT_FOUND);
      if (!this.states.has(_t.dest)) throw new Error(ErrorCode.DEST_STATE_NOT_FOUND);

      const pathStateVals: Set<string> = getOrDefault(this.paths, _t.origin, new Set());

      // Map transition to a path and remove on match
      if (this.paths.has(_t.origin) && pathStateVals.has(_t.input)) {
        if (this.alphabet.sigma.indexOf !== -1) {
          newTFunc.add(_t);
          pathStateVals.delete(_t.input);
          if (pathStateVals.size === 0) {
            this.paths.delete(_t.origin);
          }
        }
      }
    }

    if (this.paths.size > 0) {
      console.error(chalk.redBright("Not all FSA paths have a transition: %O"), this.paths);
      throw new Error(ErrorCode.MISSING_REQUIRED_TRANSITION);
    }

    this.tfunc = newTFunc;
  }

  createPaths() {
    this.paths = new Map();
    for (const state of this.states) {
      for (const char of this.alphabet.sigma) {
        const pathStateVals: Set<string> = getOrDefault(this.paths, state, new Set());
        if (this.paths.has(state)) pathStateVals.add(char);
        else this.paths.set(state, new Set([char]));
      }
    }
  }

  receiveInput(input: string, state: State): State {
    if (this.alphabet.sigma.indexOf(input) === -1) throw new Error(ErrorCode.INVALID_INPUT_CHAR);
    if (!this.states.has(state)) throw new Error(ErrorCode.INPUT_STATE_NOT_FOUND);

    const path = Array.from(this.tfunc).find(obj => {
      return obj.origin === state && obj.input === input;
    });

    if (path) return path.dest;
    else throw new Error(ErrorCode.DEST_STATE_NOT_FOUND);
  }
}

// Global export method for creating FSA
export const createFSA = (
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
  let _tfunc: Set<Transition> = new Set();
  if (!Array.isArray(transitions) && typeof transitions === "object") transitions = [transitions];

  if (Array.isArray(transitions)) {
    for (const tr of transitions) {
      if (!tr["from"] || !tr["to"] || !tr["input"]) throw new Error(ErrorCode.INVALID_TRANSITION_OBJECT);
      _tfunc.add(new Transition(_states.get(tr["from"]), _states.get(tr["to"]), tr["input"]));
    }
  } else {
    throw new TypeError(transitions);
  }

  // Convert remaining inputs
  let _alphabet = new Alphabet(alphabet);
  if (typeof start !== "string") throw new TypeError(start);
  let _start = _states.get(start);

  let _accepts: Array<string> = new Array();
  if (typeof accepts === "string") {
    if(_states.has(accepts)) _accepts.push(_states.get(accepts));
  } else if (Array.isArray(accepts)) {
    for (const state of accepts) {
      _accepts.push(_states.get(state));
    }
  } else {
    throw new TypeError(accepts);
  }

  return new FSA(new Set(_states.values()), _alphabet, _tfunc, _start, _accepts);
};
