// @flow
import Set from "core-js/features/set";
import { FSA } from "../interfaces/FSA.js";
import { State, Alphabet, Transition } from "../components";
import { ErrorCode } from "../globals/errors.js";
import { checkStateDuplicates, getOrDefault } from "../globals/globals.js";
import { FSAUtils } from "../utils";

// $FlowFixMe[incompatible-call]
// $FlowFixMe[signature-verification-failure]
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
    getType(): string {
      return "DFA";
    }

    generateDigraph(): string {
      // Prep outputs
      let acceptArr: Array<string> = [];
      for (const state of this.#accepts) acceptArr.push(state.name);

      // Duplicate origin/dest combinations should share a line
      let pairs: Map<string, string> = new Map();
      (Object.values([...this.#tfunc]): any).map(function (t: Transition) {
        const key: string = t.origin.name + t.dest.name;
        let _input: string = t.input;
        if (_input === "") _input = "ε";
        if (!pairs.has(key)) {
          pairs.set(key, t.origin.name + " -> " + t.dest.name + ' [ label = "' + _input + '" ];');
        } else {
          /*
           * To edit an existing line, split out the input(s), convert to number, sort them ascending, and add the new one
           */
          let _line: string = getOrDefault(pairs, key, null);
          const _oldinput: string = _line.split('"')[1];
          let _toAdd: Array<string> = _oldinput.split(",");
          _toAdd.push(_input);
          _toAdd.sort();
          _line = _line.replace('"' + _oldinput + '"', '"' + _toAdd.toString() + '"');
          pairs.set(key, _line);
        }
      });

      // return template literal
      return `digraph fsa {
          ${(Object.values(
            this.#utils.determineStateOrder(this.#links, this.#tfunc, this.#states, this.#start, this.#accepts)
          ): any)
            .map(function (str: string) {
              if (acceptArr.indexOf(str) !== -1) return str + " [shape = doublecircle];";
              else return str;
            })
            .join("\n\t")}
          rankdir=LR;
          node [shape = point ]; qi;
          node [shape = circle];
          qi -> ${this.#start.name};
          ${(Object.values([...pairs]): any)
            .map(function ([key, val]) {
              return val;
            })
            .join("\n\t")}
      }
      `;
    }
  }

  return DFA;
})();
