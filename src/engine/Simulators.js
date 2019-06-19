// @flow
import chalk from "chalk";
import { FSA } from "../interfaces/FSA.js";
import { State } from "../components/State.js";
import { DFA, NFA } from "../automata";
import { FSAUtils } from "../utils";
import { ErrorCode } from "../globals/errors.js";
import { instanceOf } from "../globals/globals.js";

export const simulateFSA = (w: string | string[], fsa: FSA, logging: boolean = false): string => {
  if (instanceOf(NFA, fsa)) {
    return simulateNFA(w, fsa, new FSAUtils(NFA), logging);
  } else {
    return simulateDFA(w, fsa, new FSAUtils(DFA), logging);
  }
};

export const stepOnceFSA = (w: string, qin: string, fsa: FSA, logging: boolean = false): string => {};

/*
 * Private methods
 */
function simulateDFA(w: string | string[], dfa: DFA, utils: FSAUtils, logging: boolean): string {
  if (logging) console.log(chalk.cyan("Beginning DFA Simulation"));

  //Accept either string or string[] for w
  if (!Array.isArray(w)) {
    if (typeof w === "string") w = [...w];
    else {
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
    if (logging) console.log("%s x '%s' -> %s", prevState.name, char, currentState.name);
  }
  if (logging) console.log(chalk.inverse("Input Processing Ended"));

  // Check for acceptance
  if (dfa.getAcceptStates().has(currentState)) {
    if (logging) console.log(chalk.green("Input Accepted!"));
    return currentState.name;
  } else {
    if (logging) console.log(chalk.red("Input Rejected!"));
    return currentState.name;
  }
}

function simulateNFA(w: string | string[], nfa: NFA, utils: FSAUtils, logging: boolean): string {
  if (logging) console.log(chalk.cyan("Beginning NFA Simulation"));

  //Accept either string or string[] for w
  if (!(w instanceof Array)) {
    if (typeof w === "string") {
      if (w === "") w = [""];
      else w = [...w];
    } else {
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

  // Check for acceptance (arbitrarily selects which state to return if multiple accept scenarios found)
  for (const _accState of nfa.getAcceptStates()) {
    if (currentState.includes(_accState)) {
      if (logging) console.log(chalk.green("Input Accepted!"));
      return _accState.name;
    }
  }

  // If rejection, return one of the final states or if input results in no final state, return empty string
  if (logging) console.log(chalk.red("Input Rejected!"));
  if (currentState.length > 0) return currentState[0].name;
  else return "";
}

export const stepOnceDFA = (w: string, qin: string, dfa: DFA, logging: boolean = false): string => {
  // Type checks
  if (instanceOf(NFA, dfa)) {
    if (logging) console.error(chalk.redBright("This function does not support NFAs"));
    throw new TypeError();
  }
  if (typeof w !== "string") {
    if (logging) console.error(chalk.redBright("Input w was invalid type: %O"), w);
    throw new TypeError();
  }
  if (typeof qin !== "string") {
    if (logging) console.error(chalk.redBright("Input state was invalid type: %O"), qin);
    throw new TypeError();
  }

  // Step once
  if (logging) console.log(chalk.inverse("Input Processing Started"));
  let prevState;
  for (const state of dfa.getStates().values()) {
    if (qin === state.name) prevState = state;
  }

  if (!prevState) {
    throw new Error(ErrorCode.INVALID_STATE_NAME);
  }

  let newState: State = new FSAUtils(DFA).receiveInput(dfa, w, prevState);
  if (logging) console.log("%s x '%s' -> %s", prevState.name, w, newState.name);
  if (logging) console.log(chalk.inverse("Input Processing Ended"));

  return newState.name;
};
