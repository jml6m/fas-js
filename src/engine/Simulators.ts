import { type FSA } from "../interfaces/FSA";
import { State } from "../components/State";
import { DFA, NFA } from "../automata";
import { FSAUtils } from "../utils";
import { ErrorCode } from "../globals/errors";
import { instanceOf } from "../globals/globals";
import { simulateDFA } from "./DFASimulators";
import { simulateNFA } from "./NFASimulators";

/**
 * Public simulation entrypoints. Kind-specific `simulate*` implementations live in
 * `DFASimulators.ts` / `NFASimulators.ts` (locked). This file is an open dispatch
 * index for `simulateFSA` / `stepOnceFSA` — new automaton kinds wire in here.
 */
export const simulateFSA = (
  w: string | string[],
  fsa: FSA,
  logging: boolean = false,
  returnEndState: boolean = false
): boolean | string | string[] => {
  if (instanceOf(NFA, fsa)) {
    return simulateNFA(w, fsa as InstanceType<typeof NFA>, new FSAUtils(NFA), logging, returnEndState);
  } else {
    return simulateDFA(w, fsa as InstanceType<typeof DFA>, new FSAUtils(DFA), logging, returnEndState);
  }
};

export const stepOnceFSA = (
  w: string,
  qin: string | string[],
  fsa: FSA,
  logging: boolean = false
): string | string[] => {
  if (typeof w !== "string") {
    if (logging) console.error("Input w was invalid type: %O", w);
    throw new TypeError();
  }
  if (typeof qin !== "string" && !Array.isArray(qin)) {
    if (logging) console.error("Input state was invalid type: %O", qin);
    throw new TypeError();
  }

  // Step once
  if (logging) console.log("Input Processing Started");
  let prevState: State | State[] = [];
  if (typeof qin === "string") {
    for (const state of fsa.getStates().values()) {
      if (qin === state.name) prevState = state;
    }
    if (!prevState || (Array.isArray(prevState) && prevState.length === 0))
      throw new Error(ErrorCode.INVALID_STATE_NAME);
  } else {
    prevState = [];
    for (const state of fsa.getStates().values()) {
      if (qin.includes(state.name)) prevState.push(state);
    }
    if (prevState.length !== qin.length) {
      throw new Error(ErrorCode.INVALID_STATE_NAME);
    }
  }

  let newState: State | State[];
  if (instanceOf(NFA, fsa)) newState = [...(new FSAUtils(NFA).receiveInput(fsa, w, prevState) as Set<State>)];
  else newState = new FSAUtils(DFA).receiveInput(fsa, w, prevState) as State;

  if (logging) console.log("%o x '%s' -> %o", JSON.stringify(prevState), w, JSON.stringify(newState));
  if (logging) console.log("Input Processing Ended");

  if (instanceOf(State, newState)) return newState.name;
  else {
    const retArray: string[] = [];
    for (const _s of newState) {
      retArray.push(_s.name);
    }
    return retArray;
  }
};
