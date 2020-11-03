// @flow
import Set from "core-js/features/set";
import { FSA } from "../interfaces/FSA.js";
import { DFA } from "./DFA.js";
import { State, Alphabet, NFATransition, Transition } from "../components";

// $FlowFixMe[incompatible-call]
// $FlowFixMe[signature-verification-failure]
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
        _t.dest.forEach((_dest) => {
          expandedTfunc.add(new Transition(_t.origin, _dest, _t.input));
        });
      }

      super(states, alphabet, expandedTfunc, start, accepts);
    }

    getType(): string {
      return "NFA";
    }
  }

  return NFA;
})();
