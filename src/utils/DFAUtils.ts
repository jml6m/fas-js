import { ErrorCode } from "../globals/errors";
import { type State, type Alphabet, type Transition } from "../components";
import { getOrDefault } from "../globals/globals";

export class DFAUtils {
  /*
   * Transition function should only contain states in Q, and one transition should exist
   * for each combination of Q x Σ
   */
  static validateTFunc(
    _states: Set<State>,
    _paths: Map<State, Set<string>>,
    _tfunc: Set<Transition>,
    _alph: Alphabet
  ): Set<Transition> {
    const newTFunc: Set<Transition> = new Set(); // Will contain only necessary transitions

    for (const _t of _tfunc) {
      // Check for valid states
      if (!_states.has(_t.origin)) {
        console.error("Origin state was invalid: %o", JSON.stringify(_t.origin));
        throw new Error(ErrorCode.ORIGIN_STATE_NOT_FOUND);
      }
      if (!_states.has(_t.dest)) {
        console.error("Dest state was invalid: %o", JSON.stringify(_t.dest));
        throw new Error(ErrorCode.DEST_STATE_NOT_FOUND);
      }

      const pathStateVals: Set<string> = getOrDefault(_paths, _t.origin, new Set());

      // Map transition to a path and remove on match
      if (this.isValidInputChar(_t.input, _alph)) {
        if (_paths.has(_t.origin) && pathStateVals.has(_t.input)) {
          newTFunc.add(_t);
          pathStateVals.delete(_t.input);
          if (pathStateVals.size === 0) {
            _paths.delete(_t.origin);
          }
        } else {
          throw new Error(ErrorCode.DUPLICATE_TRANSITION_OBJECT);
        }
      } else {
        throw new Error(ErrorCode.INVALID_INPUT_CHAR);
      }
    }

    if (_paths.size > 0) {
      console.error("Not all FSA paths have a transition specified:");
      for (const [key, val] of _paths) {
        console.error("State %s on input(s): %s", key.name, [...val].join(" "));
      }
      throw new Error(ErrorCode.MISSING_REQUIRED_TRANSITION);
    }

    return newTFunc;
  }

  static createPaths(_states: Set<State>, _alph: Alphabet): Map<State, Set<string>> {
    const _paths: Map<State, Set<string>> = new Map<State, Set<string>>();
    for (const state of _states) {
      for (const char of _alph.sigma) {
        const pathStateVals: Set<string> = getOrDefault(_paths, state, new Set());
        if (_paths.has(state)) pathStateVals.add(char);
        else _paths.set(state, new Set([char]));
      }
    }

    return _paths;
  }

  // DFA does not allow empty symbol
  static isValidInputChar(input: string, _alph: Alphabet): boolean {
    if (input === "") return false;
    return _alph.sigma.indexOf(input) !== -1;
  }
}

export interface TransitionInput {
  from: string;
  to: string;
  input: string;
}
