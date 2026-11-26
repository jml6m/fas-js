import { DFAUtils } from "./DFAUtils";
import { type State, type Transition, type Alphabet } from "../components";
import { ErrorCode } from "../globals/errors";

export class NFAUtils extends DFAUtils {
  // NFA inheritly allows for ε (empty string) transition if specified
  static isValidInputChar(input: string, _alph: Alphabet): boolean {
    return _alph.sigma.indexOf(input) !== -1 || input === "";
  }

  // Follow all ε transitions and add to `state` (origin states)
  static populateEpsilons(_tfunc: Set<Transition>, state: State[]): State[] {
    let cont = true; // continue
    while (cont) {
      cont = false;

      // Find all ε from origin set
      const epsTransitions: Transition[] = Array.from(_tfunc).filter(obj => {
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

  // Validate tfunc according to NFA rules
  static validateTFunc(
    _states: Set<State>,
    _paths: Map<State, Set<string>>,
    _tfunc: Set<Transition>,
    _alph: Alphabet
  ): Set<Transition> {
    const newTFunc: Set<Transition> = new Set(); // Will contain only necessary transitions

    for (const _t of _tfunc) {
      let skip = false;

      // Check for valid states
      if (!_states.has(_t.origin)) {
        console.error("Origin state was invalid: %o", JSON.stringify(_t.origin));
        throw new Error(ErrorCode.ORIGIN_STATE_NOT_FOUND);
      }
      if (!_states.has(_t.dest)) {
        console.error("Dest state was invalid: %o", JSON.stringify(_t.dest));
        throw new Error(ErrorCode.DEST_STATE_NOT_FOUND);
      }

      // Check for duplicate before adding
      for (const _checkT of newTFunc) {
        if (_checkT.origin === _t.origin && _checkT.dest === _t.dest && _checkT.input === _t.input) skip = true;
      }

      // Map transition to a path and remove on match
      if (!skip) {
        if (_paths.has(_t.origin)) {
          if (this.isValidInputChar(_t.input, _alph)) {
            newTFunc.add(_t);
          } else {
            throw new Error(ErrorCode.INVALID_INPUT_CHAR);
          }
        }
      }
    }

    return newTFunc;
  }
}
