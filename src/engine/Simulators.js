// @flow
import chalk from "chalk";
import { FSA } from "../interfaces/FSA.js";
import { State } from "../classes/State.js";
import { NFA } from "../classes/NFA.js";
import { DFA } from "../classes/DFA.js";
import { ErrorCode } from "../globals/errors.js";
import { instanceOf } from "../globals/globals.js";

export const simulateDFA = (w: string | string[], dfa: DFA, logging: boolean = false): string => {
  if (instanceOf(NFA, dfa)) {
    if (logging) console.error(chalk.redBright("This function does not support NFAs"));
    throw new TypeError();
  }
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
  let currentState: State = dfa.start;
  for (const char of w) {
    const prevState: State = currentState;
    currentState = dfa.receiveInput(char, prevState);
    if (logging) console.log("%s x '%s' -> %s", prevState.name, char, currentState.name);
  }
  if (logging) console.log(chalk.inverse("Input Processing Ended"));

  // Check for acceptance
  if (dfa.accepts.has(currentState)) {
    if (logging) console.log(chalk.green("Input Accepted!"));
    return currentState.name;
  } else {
    if (logging) console.log(chalk.red("Input Rejected!"));
    return currentState.name;
  }
};

export const simulateNFA = async (w: string | string[], nfa: NFA, logging: boolean = false): Promise<string> => {
  if (!instanceOf(NFA, nfa)) {
    if (logging) console.error(chalk.redBright("Input FSA must be an NFA"));
    throw new TypeError();
  }
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
  let currentState: Array<State> = [nfa.start];
  for (const char of w) {
    let prevState: Array<State> = currentState;
    currentState = [...nfa.receiveInputNFA(char, currentState)];
    if (logging) console.log("%o x '%s' -> %o", JSON.stringify(prevState), char, JSON.stringify(currentState));
  }
  if (logging) console.log(chalk.inverse("Input Processing Ended"));

  // Check for acceptance (arbitrarily selects which state to return if multiple accept scenarios found)
  for (const _accState of nfa.accepts) {
    if (currentState.includes(_accState)) {
      if (logging) console.log(chalk.green("Input Accepted!"));
      return _accState.name;
    }
  }

  // If rejection, return one of the final states or if input results in no final state, return empty string
  if (logging) console.log(chalk.red("Input Rejected!"));
  if (currentState.length > 0) return currentState[0].name;
  else return "";
};

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
  for (const state of dfa.states.values()) {
    if (qin === state.name) prevState = state;
  }

  if (!prevState) {
    throw new Error(ErrorCode.INVALID_STATE_NAME);
  }

  let newState: State = dfa.receiveInput(w, prevState);
  if (logging) console.log("%s x '%s' -> %s", prevState.name, w, newState.name);
  if (logging) console.log(chalk.inverse("Input Processing Ended"));

  return newState.name;
};
