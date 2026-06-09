import { DFA } from "./DFA";
import { State, Alphabet, NFATransition, Transition } from "../components";

export const NFA = (() => {
  class NFA extends DFA {
    // Transition function is different for NFA
    constructor(
      states: Set<State>,
      alphabet: Alphabet,
      tfunc: Set<NFATransition>,
      start: State,
      accepts: Set<State> | Record<string, never>
    ) {
      // Implicitly add ε to alphabet
      if (!alphabet.sigma.includes("")) alphabet.sigma.push("");

      // If NFATransition has multiple dest states, break them up into separate Transitions
      const expandedTfunc: Set<Transition> = new Set<Transition>();
      for (const _t of tfunc) {
        _t.dest.forEach(_dest => {
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