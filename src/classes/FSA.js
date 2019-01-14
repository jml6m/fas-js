// @flow
const chalk = require("chalk");
import {
  State,
  Alphabet,
  Transition,
  checkStateDuplicates,
  ErrorCode,
  isSubSet,
  setDifference,
  getOrDefault
} from "../modules.js";

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

    if(path) return path.dest;
    else throw new Error(ErrorCode.DEST_STATE_NOT_FOUND);
  }
}
