// @flow
import chalk from "chalk";
import { FSA } from "../interfaces/FSA.js";
import { State } from "../components/State.js";
import { DFA, NFA } from "../automata";
import { FSAUtils } from "../utils";
import { ErrorCode } from "../globals/errors.js";
import { instanceOf } from "../globals/globals.js";

export const simulateFSA = (
  w: string | string[],
  fsa: FSA,
  logging: boolean = false,
  returnEndState: boolean = false
): boolean | string | Array<string> => {
  if (instanceOf(NFA, fsa)) {
    return simulateNFA(w, fsa, new FSAUtils(NFA), logging, returnEndState);
  } else {
    return simulateDFA(w, fsa, new FSAUtils(DFA), logging, returnEndState);
  }
};

export const stepOnceFSA = (
  w: string,
  qin: string | Array<string>,
  fsa: FSA,
  logging: boolean = false
): string | Array<string> => {
  if (typeof w !== "string") {
    if (logging) console.error(chalk.redBright("Input w was invalid type: %O"), w);
    throw new TypeError();
  }
  if (typeof qin !== "string" && !Array.isArray(qin)) {
    if (logging) console.error(chalk.redBright("Input state was invalid type: %O"), qin);
    throw new TypeError();
  }

  // Step once
  if (logging) console.log(chalk.inverse("Input Processing Started"));
  let prevState: State | Array<State> = [];
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

  let newState: State | Array<State>;
  if (instanceOf(NFA, fsa)) newState = [...new FSAUtils(NFA).receiveInput(fsa, w, prevState)];
  else newState = new FSAUtils(DFA).receiveInput(fsa, w, prevState);

  if (logging) console.log("%o x '%s' -> %o", JSON.stringify(prevState), w, JSON.stringify(newState));
  if (logging) console.log(chalk.inverse("Input Processing Ended"));

  if (newState instanceof State) return newState.name;
  else {
    let retArray: Array<string> = [];
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
  dfa: DFA,
  utils: FSAUtils,
  logging: boolean,
  returnEndState: boolean
): boolean | string {
  if (logging) console.log(chalk.cyan("Beginning DFA Simulation"));

  //Accept either string or string[] for w
  if (!Array.isArray(w)) {
    if (typeof w === "string") w = [...w];
    else {
      if (logging) console.error(chalk.redBright("Input w was invalid type: %O"), w);
      throw new TypeError();
    }
  } else {
    let onlyStrings = w.every((e) => typeof e === "string"); // Array values must be strings
    if (!onlyStrings) {
      if (logging) console.error(chalk.redBright("Input w was invalid type: %O"), w);
      throw new TypeError();
    }
  }

  // Step through the DFA
  if (logging) console.log(chalk.inverse("Input Processing Started"));
  let currentState: State = dfa.getStartState();
  for (const char of w) {
    const prevState: State = currentState;
    currentState = utils.receiveInput(dfa, char, prevState);
    if (logging) console.log("%o x '%s' -> %o", JSON.stringify(prevState), char, JSON.stringify(currentState));
  }
  if (logging) console.log(chalk.inverse("Input Processing Ended"));

  // Check for acceptance
  if (dfa.getAcceptStates().has(currentState)) {
    if (logging) console.log(chalk.green("Input Accepted!"));
    if (returnEndState) return currentState.name;
    else return true;
  } else {
    if (logging) console.log(chalk.red("Input Rejected!"));
    if (returnEndState) return currentState.name;
    else return false;
  }
}

function simulateNFA(
  w: string | string[],
  nfa: NFA,
  utils: FSAUtils,
  logging: boolean,
  returnEndState: boolean
): boolean | Array<string> {
  if (logging) console.log(chalk.cyan("Beginning NFA Simulation"));

  //Accept either string or string[] for w
  if (!Array.isArray(w)) {
    if (typeof w === "string") {
      // NFA allows ε as input
      if (w === "") w = [""];
      else w = [...w];
    } else {
      if (logging) console.error(chalk.redBright("Input w was invalid type: %O"), w);
      throw new TypeError();
    }
  } else {
    let onlyStrings = w.every((e) => typeof e === "string"); // Array values must be strings
    if (!onlyStrings) {
      if (logging) console.error(chalk.redBright("Input w was invalid type: %O"), w);
      throw new TypeError();
    }
  }

  if (logging) console.log(chalk.inverse("Input Processing Started"));
  let currentState: Array<State> = [nfa.getStartState()];
  for (const char of w) {
    let prevState: Array<State> = currentState;
    currentState = [...utils.receiveInput(nfa, char, currentState)];
    if (logging) console.log("%o x '%s' -> %o", JSON.stringify(prevState), char, JSON.stringify(currentState));
  }
  if (logging) console.log(chalk.inverse("Input Processing Ended"));

  /*
   * Check for acceptance or rejection.
   * If returnEndState:
   *    If accept, return all final accept states.
   *    If reject, return all final states or if no final state return empty string
   */
  let retObj: Array<string> = [];
  for (const _accState of nfa.getAcceptStates()) {
    if (currentState.includes(_accState)) {
      if (!returnEndState) {
        if (logging) console.log(chalk.green("Input Accepted!"));
        return true;
      }
      retObj.push(_accState.name);
    }
  }
  if (retObj.length > 0) {
    if (logging) console.log(chalk.green("Input Accepted!"));
    return retObj;
  }

  if (logging) console.log(chalk.red("Input Rejected!"));
  if (returnEndState) {
    if (currentState.length > 0) {
      for (const _cState of currentState) retObj.push(_cState.name);
    }
    return retObj;
  } else {
    return false;
  }
}
