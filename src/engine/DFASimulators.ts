import type { State } from "../components/State";
import type { DFA } from "../automata";
import type { FSAUtils } from "../utils";

export function simulateDFA(
  w: string | string[],
  dfa: InstanceType<typeof DFA>,
  utils: InstanceType<typeof FSAUtils>,
  logging: boolean,
  returnEndState: boolean
): boolean | string {
  if (logging) console.log("Beginning DFA Simulation");

  // Accept either string or string[] for w
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
