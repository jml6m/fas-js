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
  alphabet: Alphabet; // Σ
  tfunc: Set<Transition>; // δ
  start: State; // q0
  accepts: Set<State>; // F

  // Other attributes
  paths: Map<State, Set<string>>; // States mapped to each member of Σ, will be empty after constructor returns
  links: Map<string, Set<string>>; // State names mapped to their dest state names
  digraph: string; // Will contain template literal for GraphViz

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

    // Digraph
    this.digraph = this.generateDigraph();
  }

  /*
   * Transition function should only contain states in Q, and one transition should exist
   * for each combination of Q x Σ
   */
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
      console.error(chalk.redBright("Not all FSA paths have a transition specified:"));
      for (const [key, val] of this.paths) {
        console.error(chalk.redBright("State %s on input(s): %s"), key.name, [...val].join(" "));
      }
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
    else throw new Error(ErrorCode.INVALID_TRANSITION_OBJECT);
  }

  // Determine digraph order based on start state, then following the chain
  determineStateOrder(): Array<string> {
    let statesOrder: Array<string> = []; // Ordered state names for digraph

    // Map origin state names to dest state names
    this.links = new Map();
    for (const tr of this.tfunc) {
      const linkStateVals: Set<string> = getOrDefault(this.links, tr.origin.name, new Set());
      if (this.links.has(tr.origin.name)) linkStateVals.add(tr.dest.name);
      else this.links.set(tr.origin.name, new Set([tr.dest.name]));
    }

    // Populate state order
    this.parseLinks(statesOrder, this.start.name);

    // Check for dead states and reduce FSA if necessary
    let stateArr: Array<string> = [];
    (Object.values([...this.states]): any).map((state: State) => stateArr.push(state.name));
    const deadStates = stateArr.filter(x => !statesOrder.includes(x));
    if (deadStates.length > 0) {
      console.warn(
        chalk.yellowBright("Dead states detected, removing them and associated transitions: %O"),
        deadStates
      );
      this.removeDeadStates(deadStates);
    }

    return statesOrder;
  }

  // Reduce FSA by removing dead states and associated transitions
  removeDeadStates(deadStates: Array<string>) {
    // Q
    for (const state of this.states) {
      if (deadStates.indexOf(state.name) !== -1) this.states.delete(state);
    }
    // F
    for (const state of this.accepts) {
      if (deadStates.indexOf(state.name) !== -1) this.accepts.delete(state);
    }
    // δ
    for (const tr of this.tfunc) {
      if (deadStates.indexOf(tr.origin.name) !== -1 || deadStates.indexOf(tr.dest.name) !== -1) this.tfunc.delete(tr);
    }
  }

  // Recursively parse graph while adding to an array in order, beginning with q0
  parseLinks(arr: Array<string>, name: string) {
    arr.push(name);
    const nameVal: string = getOrDefault(this.links, name, "");
    for (const st of nameVal) {
      if (arr.indexOf(st) === -1) this.parseLinks(arr, st);
    }
  }

  generateDigraph(): string {
    // Prep outputs
    let acceptArr: Array<string> = [];
    for (const state of this.accepts) acceptArr.push(state.name);

    // return template literal
    return `digraph fsa {
        ${(Object.values(this.determineStateOrder()): any)
          .map(function(str: string) {
            return str;
          })
          .join("\n\t")}
        rankdir=LR;
        node [shape = doublecircle]; ${acceptArr.join(" ")};
        node [shape = point ]; qi;
        node [shape = circle];
        qi -> ${this.start.name};
        ${(Object.values([...this.tfunc]): any)
          .map(function(t: Transition) {
            return t.origin.name + " -> " + t.dest.name + ' [ label = "' + t.input + '" ];';
          })
          .join("\n\t")}
    }
    `;
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
      const fromVal: State = getOrDefault(_states, tr["from"], null);
      const toVal: State = getOrDefault(_states, tr["to"], null);
      _tfunc.add(new Transition(fromVal, toVal, tr["input"]));
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

  return new FSA(new Set(_states.values()), _alphabet, _tfunc, _start, _accepts);
};
