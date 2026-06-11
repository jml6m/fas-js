import { ErrorCode } from "../globals/errors";
import { instanceOf, getOrDefault } from "../globals/globals";
import { FSA } from "../interfaces/FSA";
import { State, Transition, Alphabet } from "../components";
import { DFA, NFA } from "../automata";
import { DFAUtils, createDFA, type TransitionInput } from "./DFAUtils";
import { NFAUtils, createNFA } from "./NFAUtils";

export type { TransitionInput };

/*
 * This class will take an input FSA constructor function
 * to determine which util methods need to be called
 */
export const FSAUtils = (() => {
  /*
   * Private methods
   */
  function receiveInputDFA(dfa: InstanceType<typeof DFA>, input: string, state: State): State {
    if (dfa.getAlphabet().sigma.indexOf(input) === -1) throw new Error(ErrorCode.INVALID_INPUT_CHAR);
    if (!dfa.getStates().has(state)) throw new Error(ErrorCode.INPUT_STATE_NOT_FOUND);

    const path = Array.from(dfa.getTFunc()).find(obj => {
      return obj.origin === state && obj.input === input;
    });

    if (path) return path.dest;
    else throw new Error(ErrorCode.INVALID_TRANSITION_OBJECT);
  }

  function receiveInputNFA(nfa: InstanceType<typeof NFA>, input: string, state: State[]): Set<State> {
    let path: Transition[] = [];
    if (nfa.getAlphabet().sigma.indexOf(input) === -1) throw new Error(ErrorCode.INVALID_INPUT_CHAR);

    // Empty transitions
    state = populateEpsilons(nfa.getTFunc(), state);

    // For ε input, return states already determined
    if (input === "") return new Set<State>(state);

    // Looking at all origin states, based on input char, determine set of destination states
    for (const _s of state) {
      const _addToPath: Transition[] = Array.from(nfa.getTFunc()).filter(obj => {
        return obj.origin === _s && obj.input === input;
      });

      path = path.concat(_addToPath);
    }

    let resultArr: State[] = [];
    if (path.length > 1) {
      for (const _s of path) resultArr.push(_s.dest);
    } else if (path.length === 1) {
      resultArr.push(path[0].dest);
    } else {
      // No valid transition found, returning empty set
      return new Set<State>();
    }

    // Empty transitions on result set
    const retSet: Set<State> = new Set<State>(populateEpsilons(nfa.getTFunc(), resultArr));

    return retSet;
  }

  function populateEpsilons(_tfunc: Set<Transition>, state: State[]): State[] {
    return NFAUtils.populateEpsilons(_tfunc, state);
  }

  class FSAUtils {
    _type: typeof DFA | typeof NFA;

    constructor(v: typeof DFA | typeof NFA) {
      this._type = v;
    }

    receiveInput(fsa: FSA, input: string, state: State | State[]): State | Set<State> {
      if (instanceOf(NFA, fsa)) {
        if (state instanceof State) return receiveInputNFA(fsa as InstanceType<typeof NFA>, input, [state]);
        else return receiveInputNFA(fsa as InstanceType<typeof NFA>, input, state);
      } else {
        if (Array.isArray(state)) {
          if (state.length > 1) {
            console.error("State array can only contain one state for DFAs");
            throw new Error(ErrorCode.INVALID_STATE_ARRAY);
          } else {
            state = state[0];
          }
        }
        return receiveInputDFA(fsa as InstanceType<typeof DFA>, input, state);
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
    ): string[] {
      return DFAUtils.determineStateOrder(_links, _tfunc, _states, _start, _accepts);
    }
  }

  return FSAUtils;
})();

// Global export method for creating FSA
export const createFSA = (
  states: string | string[],
  alphabet: string | string[],
  transitions: TransitionInput | TransitionInput[],
  start: string,
  accepts: string | string[]
): FSA => {
  // Type check and conversion for states
  const _states: Map<string, State> = new Map();
  if (typeof states === "string") {
    _states.set(states, new State(states));
  } else if (Array.isArray(states)) {
    for (const state of states) {
      if (!_states.has(state)) _states.set(state, new State(state));
    }
  } else {
    throw new TypeError(String(states));
  }

  // Convert remaining inputs
  const _alphabet = new Alphabet(alphabet);
  if (typeof start !== "string") throw new TypeError(String(start));
  const _start: State = getOrDefault(_states, start, null as unknown as State);

  const _accepts: Set<State> = new Set();
  if (typeof accepts === "string") {
    if (_states.has(accepts)) _accepts.add(getOrDefault(_states, accepts, null as unknown as State));
  } else if (Array.isArray(accepts)) {
    for (const state of accepts) {
      _accepts.add(getOrDefault(_states, state, null as unknown as State));
    }
  } else {
    throw new TypeError(String(accepts));
  }

  /*
   * Determine, based on tfunc structure, whether to create a DFA or NFA
   * If the "to" field of any member of the tfunc object is comma separated, or any input
   * char is "", then create an NFA
   */
  let transitionList: TransitionInput[];
  if (!Array.isArray(transitions) && typeof transitions === "object") transitionList = [transitions];
  else if (Array.isArray(transitions)) transitionList = transitions;
  else throw new TypeError(String(transitions));

  for (const tr of transitionList) {
    if (tr.to.indexOf(",") != -1 || tr.input === "")
      return createNFA(_states, _alphabet, transitionList, _start, _accepts);
  }
  return createDFA(_states, _alphabet, transitionList, _start, _accepts);
};