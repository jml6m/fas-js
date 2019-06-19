// @flow
import Set from "core-js/features/set";
import { FSA } from "../interfaces/FSA.js";
import { State, Alphabet, Transition } from "../components";
import { ErrorCode } from "../globals/errors.js";
import { checkStateDuplicates, getOrDefault, instanceOf } from "../globals/globals.js";
import { FSAUtils } from "../utils";

export const DFA = ((
  states: Set<State>,
  alphabet: Alphabet,
  tfunc: Set<Transition>,
  start: State,
  accepts: Set<State>
) => {
  class DFA implements FSA {
    // Primary FSA attributes
    #states: Set<State>;
    #alphabet: Alphabet;
    #tfunc: Set<Transition>;
    #start: State;
    #accepts: Set<State>;

    // Intermediary attributes used in constructor
    #paths: Map<State, Set<string>>; // States mapped to each member of Σ, will be empty after constructor returns
    #links: Map<string, Set<string>>; // State names mapped to their dest state names
    #utils: FSAUtils;

    constructor(states: Set<State>, alphabet: Alphabet, tfunc: Set<Transition>, start: State, accepts: Set<State>) {
      // initialize utils
      this.#utils = new FSAUtils(this.constructor);

      // states validations
      if (checkStateDuplicates(states)) throw new Error(ErrorCode.DUPLICATE_STATE_NAMES);
      this.#states = states;

      this.#alphabet = alphabet;

      // Create paths map
      this.#paths = this.#utils.createPaths(this.#states, this.#alphabet);

      // Start/Accept validations
      if (!states.has(start)) throw new Error(ErrorCode.START_STATE_NOT_FOUND);
      this.#start = start;
      if (Object.keys(accepts).length === 0 && accepts.constructor === Object) accepts = new Set([]); // Allow for {}
      if (!accepts.isSubsetOf(states)) throw new Error(ErrorCode.ACCEPTS_NOT_SUBSET);
      this.#accepts = accepts;

      // TFunc validations
      this.#tfunc = this.#utils.validateTFunc(this.#states, this.#paths, tfunc, this.#alphabet);
    }

    /*
     * Getters
     */
    getStates(): Set<State> {
      return this.#states;
    }
    getAlphabet(): Alphabet {
      return this.#alphabet;
    }
    getTFunc(): Set<Transition> {
      return this.#tfunc;
    }
    getStartState(): State {
      return this.#start;
    }
    getAcceptStates(): Set<State> {
      return this.#accepts;
    }

    generateDigraph(): string {
      // Prep outputs
      let acceptArr: Array<string> = [];
      for (const state of this.#accepts) acceptArr.push(state.name);

      // return template literal
      return `digraph fsa {
          ${(Object.values(
            this.#utils.determineStateOrder(this.#links, this.#tfunc, this.#states, this.#start, this.#accepts)
          ): any)
            .map(function(str: string) {
              if (acceptArr.indexOf(str) !== -1) return str + " [shape = doublecircle];";
              else return str;
            })
            .join("\n\t")}
          rankdir=LR;
          node [shape = point ]; qi;
          node [shape = circle];
          qi -> ${this.#start.name};
          ${(Object.values([...this.#tfunc]): any)
            .map(function(t: Transition) {
              let _input: string = t.input;
              if (_input === "") _input = "ε";
              return t.origin.name + " -> " + t.dest.name + ' [ label = "' + _input + '" ];';
            })
            .join("\n\t")}
      }
      `;
    }
  }

  return DFA;
})();

// Global export method for creating DFA
export const createDFA = (
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

  return new DFA(new Set(_states.values()), _alphabet, _tfunc, _start, _accepts);
};
