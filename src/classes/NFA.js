// @flow
import chalk from "chalk";

import { FSA } from "../interfaces/FSA.js";
import { DFA } from "./DFA.js";
import { NFATransition } from "./NFATransition.js";
import { State } from "../classes/State.js";
import { Alphabet } from "../classes/Alphabet.js";
import { Transition } from "../classes/Transition.js";

import { ErrorCode } from "../globals/errors.js";
import { getOrDefault } from "../globals/globals.js";

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

  // Validate tfunc according to NFA rules
  validateTFunc() {
    let newTFunc: Set<Transition> = new Set(); // Will contain only necessary transitions

    for (const _t of this.tfunc) {
      // Check for valid states
      if (!this.states.has(_t.origin)) throw new Error(ErrorCode.ORIGIN_STATE_NOT_FOUND);
      if (!this.states.has(_t.dest)) throw new Error(ErrorCode.DEST_STATE_NOT_FOUND);

      const pathStateVals: Set<string> = getOrDefault(this.paths, _t.origin, new Set());

      // Map transition to a path and remove on match
      if (this.paths.has(_t.origin)) {
        if (this.isValidInputChar(_t.input)) {
          newTFunc.add(_t);
        } else {
          throw new Error(ErrorCode.INVALID_INPUT_CHAR);
        }
      }
    }

    this.tfunc = newTFunc;
  }
}
