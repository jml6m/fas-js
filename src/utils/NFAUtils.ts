import { DFAUtils } from "./DFAUtils";
import { type State, type Transition, type Alphabet } from "../components";
import { ErrorCode } from "../globals/errors";
import { type IndexedTransition, transitionIndex, transitionsFrom } from "./TransitionIndex";

export class NFAUtils extends DFAUtils {
  // NFA inheritly allows for ε (empty string) transition if specified
  static isValidInputChar(input: string, _alph: Alphabet): boolean {
    return _alph.sigma.indexOf(input) !== -1 || input === "";
  }

  // Follow all ε transitions and add to `state` (origin states)
  static populateEpsilons(_tfunc: Set<Transition>, state: State[]): State[] {
    const index = transitionIndex(_tfunc);
    const reached: Set<State> = new Set(state);

    // Only the states added in the previous round can lead somewhere new
    let frontier: State[] = [...reached];
    while (frontier.length > 0) {
      // Find all ε from the frontier, in the order the transition set holds them
      const epsTransitions: IndexedTransition[] = [];
      for (const origin of frontier) {
        for (const _t of transitionsFrom(index, origin, "")) epsTransitions.push(_t);
      }
      epsTransitions.sort((a, b) => a.order - b.order);

      // Add new states, break if no new states found
      frontier = [];
      for (const _t of epsTransitions) {
        if (!reached.has(_t.dest)) {
          reached.add(_t.dest);
          state.push(_t.dest);
          frontier.push(_t.dest);
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
    const added: Map<State, Map<string, Set<State>>> = new Map(); // origin -> input -> dests in newTFunc

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

      // Check for duplicate before adding
      const skip = added.get(_t.origin)?.get(_t.input)?.has(_t.dest) === true;

      // Map transition to a path and remove on match
      if (!skip) {
        if (_paths.has(_t.origin)) {
          if (this.isValidInputChar(_t.input, _alph)) {
            newTFunc.add(_t);

            let byInput = added.get(_t.origin);
            if (!byInput) {
              byInput = new Map();
              added.set(_t.origin, byInput);
            }
            const dests = byInput.get(_t.input);
            if (dests) dests.add(_t.dest);
            else byInput.set(_t.input, new Set([_t.dest]));
          } else {
            throw new Error(ErrorCode.INVALID_INPUT_CHAR);
          }
        }
      }
    }

    return newTFunc;
  }
}
