import { FSA } from "../interfaces/FSA";
import { State } from "../components/State";
import { DFA, NFA } from "../automata";
import { FSAUtils } from "../utils";
import { ErrorCode } from "../globals/errors";
import { instanceOf } from "../globals/globals";

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

  if (newState instanceof State) return newState.name;
  else {
    const retArray: string[] = [];
    for (const _s of newState) {
      retArray.push(_s.name);
    }
    return retArray;
  }
};

/*
 * Private methods
 */
function simulateDFA(
  w: string | string[],
  dfa: InstanceType<typeof DFA>,
  utils: InstanceType<typeof FSAUtils>,
  logging: boolean,
  returnEndState: boolean
): boolean | string {
  if (logging) console.log("Beginning DFA Simulation");

  //Accept either string or string[] for w
  if (!Array.isArray(w)) {
    if (typeof w === "string") w = [...w];
    else {
      if (logging) console.error("Input w was invalid type: %O", w);
      throw new TypeError();
    }
  }

  // Step through the DFA
  if (logging) console.log("Input Processing Started");
  let currentState: State = dfa.getStartState();
  for (const char of w) {
    const prevState: State = currentState;
    currentState = utils.receiveInput(dfa, char, prevState) as State;
    if (logging) console.log("%o x '%s' -> %o", JSON.stringify(prevState), char, JSON.stringify(currentState));
  }
  if (logging) console.log("Input Processing Ended");

  // Check for acceptance
  if (dfa.getAcceptStates().has(currentState)) {
    if (logging) console.log("Input Accepted!");
    if (returnEndState) return currentState.name;
    else return true;
  } else {
    if (logging) console.log("Input Rejected!");
    if (returnEndState) return currentState.name;
    else return false;
  }
}

function simulateNFA(
  w: string | string[],
  nfa: InstanceType<typeof NFA>,
  utils: InstanceType<typeof FSAUtils>,
  logging: boolean,
  returnEndState: boolean
): boolean | string[] {
  if (logging) console.log("Beginning NFA Simulation");

  //Accept either string or string[] for w
  if (!(w instanceof Array)) {
    if (typeof w === "string") {
      if (w === "") w = [""];
      else w = [...w];
    } else {
      if (logging) console.error("Input w was invalid type: %O", w);
      throw new TypeError();
    }
  }

  if (logging) console.log("Input Processing Started");
  let currentState: State[] = [nfa.getStartState()];
  for (const char of w) {
    const prevState: State[] = currentState;
    currentState = [...(utils.receiveInput(nfa, char, currentState) as Set<State>)];
    if (logging) console.log("%o x '%s' -> %o", JSON.stringify(prevState), char, JSON.stringify(currentState));
  }
  if (logging) console.log("Input Processing Ended");

  /*
   * Check for acceptance or rejection.
   * If returnEndState:
   *    If accept, return all final accept states.
   *    If reject, return all final states or if no final state return empty string
   */
  const retObj: string[] = [];
  for (const _accState of nfa.getAcceptStates()) {
    if (currentState.includes(_accState)) {
      if (!returnEndState) {
        if (logging) console.log("Input Accepted!");
        return true;
      }
      retObj.push(_accState.name);
    }
  }
  if (retObj.length > 0) {
    if (logging) console.log("Input Accepted!");
    return retObj;
  }

  if (logging) console.log("Input Rejected!");
  if (returnEndState) {
    if (currentState.length > 0) {
      for (const _cState of currentState) retObj.push(_cState.name);
    }
    return retObj;
  } else {
    return false;
  }
}