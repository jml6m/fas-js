import type { State } from "../components/State";
import type { NFA } from "../automata";
import type { FSAUtils } from "../utils";

export function simulateNFA(
  w: string | string[],
  nfa: InstanceType<typeof NFA>,
  utils: InstanceType<typeof FSAUtils>,
  logging: boolean,
  returnEndState: boolean
): boolean | string[] {
  if (logging) console.log("Beginning NFA Simulation");

  // Accept either string or string[] for w
  if (!Array.isArray(w)) {
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
