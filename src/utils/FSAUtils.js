// @flow
import chalk from "chalk";
import { ErrorCode } from "../globals/errors.js";
import { instanceOf } from "../globals/globals.js";
import { FSA } from "../interfaces/FSA.js";
import { State, Transition, Alphabet } from "../components";
import { DFA, NFA } from "../automata";
import { DFAUtils, NFAUtils } from "../utils";

/*
 * This class will take an input FSA constructor function
 * to determine which util methods need to be called
 */
export const FSAUtils = ((v: Function) => {
  /*
   * Private methods
   */
  function receiveInputDFA(dfa: DFA, input: string, state: State): State {
    if (dfa.getAlphabet().sigma.indexOf(input) === -1) throw new Error(ErrorCode.INVALID_INPUT_CHAR);
    if (!dfa.getStates().has(state)) throw new Error(ErrorCode.INPUT_STATE_NOT_FOUND);

    const path = Array.from(dfa.getTFunc()).find(obj => {
      return obj.origin === state && obj.input === input;
    });

    if (path) return path.dest;
    else throw new Error(ErrorCode.INVALID_TRANSITION_OBJECT);
  }

  function receiveInputNFA(nfa: NFA, input: string, state: Array<State>): Set<State> {
    let path: Array<Transition> = [];
    if (nfa.getAlphabet().sigma.indexOf(input) === -1) throw new Error(ErrorCode.INVALID_INPUT_CHAR);

    // Empty transitions
    state = populateEpsilons(nfa.getTFunc(), state);

    // For ε input, return states already determined
    if (input === "") return new Set<State>(state);

    // Looking at all origin states, based on input char, determine set of destination states
    for (const _s of state) {
      const _addToPath: Array<Transition> = Array.from(nfa.getTFunc()).filter(obj => {
        return obj.origin === _s && obj.input === input;
      });

      path = path.concat(_addToPath);
    }

    let retSet: Set<State> = new Set<State>();
    if (path.length > 1) {
      for (const _s of path) retSet.add(_s.dest);
    } else if (path.length === 1) {
      retSet.add(path[0].dest);
    } else {
      // No valid transition found, returning empty set
      return retSet;
    }

    return retSet;
  }

  function populateEpsilons(_tfunc: Set<Transition>, state: Array<State>): Array<State> {
    return NFAUtils.populateEpsilons(_tfunc, state);
  }

  class FSAUtils {
    _type: Function;

    constructor(v: Function) {
      this._type = v;
    }

    receiveInput(fsa: FSA, input: string, state: State | Array<State>): State | Set<State> {
      if (instanceOf(NFA, fsa)) {
        if (state instanceof State) return receiveInputNFA(fsa, input, [state]);
        else return receiveInputNFA(fsa, input, state);
      } else {
        if (state instanceof Array) {
          if (state.length > 1) {
            console.error(chalk.redBright("State array can only contain one state for DFAs"));
            throw new Error(ErrorCode.INVALID_STATE_ARRAY);
          } else {
            state = state[0];
          }
        }
        return receiveInputDFA(fsa, input, state);
      }
    }

    validateTFunc(
      _states: Set<State>,
      _paths: Map<State, Set<string>>,
      _tfunc: Set<Transition>,
      _alph: Alphabet
    ): Set<Transition> {
      if (this._type === NFA) {
        return NFAUtils.validateTFunc(_states, _paths, _tfunc, _alph);
      } else {
        return DFAUtils.validateTFunc(_states, _paths, _tfunc, _alph);
      }
    }

    createPaths(_states: Set<State>, _alph: Alphabet): Map<State, Set<string>> {
      return DFAUtils.createPaths(_states, _alph);
    }

    determineStateOrder(
      _links: Map<string, Set<string>>,
      _tfunc: Set<Transition>,
      _states: Set<State>,
      _start: State,
      _accepts: Set<State>
    ): Array<string> {
      return DFAUtils.determineStateOrder(_links, _tfunc, _states, _start, _accepts);
    }
  }

  return FSAUtils;
})();
